-- ============================================================================
-- Migration: 20261112124802_atomic_payment_collection
-- Step: 1F-E1 — Atomic Payment Collection Stored Procedure
-- Database: PostgreSQL 16.15 | ORM: Prisma 6.19.3
-- Architecture: 16 Models, 12 Enums, Strict NO-REFUND Policy
-- ============================================================================

CREATE OR REPLACE FUNCTION sp_collect_payment(
  p_restaurant_id UUID,
  p_transaction_id UUID,
  p_amount DECIMAL(10, 2),
  p_tender_amount DECIMAL(14, 2),
  p_currency VARCHAR(3),
  p_tender_currency VARCHAR(3),
  p_exchange_rate DECIMAL(12, 4),
  p_rounding_adj DECIMAL(10, 2),
  p_cash_received DECIMAL(14, 2),
  p_change_given DECIMAL(14, 2),
  p_method "PaymentMethod",
  p_idempotency_key VARCHAR(64),
  p_processed_by_id UUID,
  p_gateway_reference VARCHAR(100) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_tx RECORD;
  v_user_valid BOOLEAN;
  v_existing_payment RECORD;
  v_current_paid DECIMAL(10, 2);
  v_new_total DECIMAL(10, 2);
  v_new_status "InvoiceStatus";
  v_new_payment_status "PaymentStatus";
  v_completed_at TIMESTAMPTZ(6);
  v_payment_id UUID;
BEGIN
  -- 1. Input parameter validation
  IF p_amount <= 0.00 THEN
    RAISE EXCEPTION 'Payment amount must be strictly positive (got %)', p_amount
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_tender_amount <= 0.00 THEN
    RAISE EXCEPTION 'Tender amount must be strictly positive (got %)', p_tender_amount
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_exchange_rate <= 0.0000 THEN
    RAISE EXCEPTION 'Exchange rate must be strictly positive (got %)', p_exchange_rate
      USING ERRCODE = 'check_violation';
  END IF;

  -- Cash tender validation
  IF p_method = 'CASH' THEN
    IF p_cash_received IS NULL OR p_change_given IS NULL THEN
      RAISE EXCEPTION 'Cash payments require both cashReceived and changeGiven'
        USING ERRCODE = 'check_violation';
    END IF;
    IF (p_cash_received - p_change_given) != p_tender_amount THEN
      RAISE EXCEPTION 'Cash received (%) minus change given (%) must equal tender amount (%)',
        p_cash_received, p_change_given, p_tender_amount
        USING ERRCODE = 'check_violation';
    END IF;
  ELSE
    p_cash_received := NULL;
    p_change_given := NULL;
  END IF;

  -- User authorization verification
  IF p_processed_by_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public."users"
      WHERE id = p_processed_by_id
        AND "restaurantId" = p_restaurant_id
        AND "isActive" = true
    ) INTO v_user_valid;

    IF NOT v_user_valid THEN
      RAISE EXCEPTION 'Processed-by user % is invalid or inactive for restaurant %',
        p_processed_by_id, p_restaurant_id
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  -- 2. CRITICAL CONCURRENCY: Lock parent Transaction row FIRST (Level 4 of hierarchy)
  -- Following the STEP 1E parent-first locking rule
  SELECT * INTO v_tx
  FROM public."transactions"
  WHERE id = p_transaction_id AND "restaurantId" = p_restaurant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction % not found for restaurant %', p_transaction_id, p_restaurant_id
      USING ERRCODE = 'check_violation';
  END IF;

  -- 3. IDEMPOTENCY CHECK (executed AFTER acquiring transaction lock)
  IF p_idempotency_key IS NOT NULL AND length(trim(p_idempotency_key)) > 0 THEN
    SELECT * INTO v_existing_payment
    FROM public."payments"
    WHERE "idempotencyKey" = p_idempotency_key;

    IF v_existing_payment.id IS NOT NULL THEN
      -- Verify replay ownership against restaurant and transaction
      IF v_existing_payment."restaurantId" != p_restaurant_id OR
         v_existing_payment."transactionId" != p_transaction_id THEN
        RAISE EXCEPTION 'Idempotency key % already used for a different transaction or tenant',
          p_idempotency_key USING ERRCODE = 'check_violation';
      END IF;

      -- Reject reuse with different request details (payload mismatch)
      IF v_existing_payment.amount != p_amount OR
         v_existing_payment.method != p_method OR
         v_existing_payment."tenderAmount" != p_tender_amount OR
         v_existing_payment.currency != p_currency OR
         v_existing_payment."tenderCurrency" != p_tender_currency THEN
        RAISE EXCEPTION 'Idempotency key % reused with mismatched payment parameters',
          p_idempotency_key USING ERRCODE = 'check_violation';
      END IF;

      -- Return existing successful result safely
      RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'idempotentReplay', true,
        'paymentId', v_existing_payment.id,
        'transactionId', p_transaction_id,
        'amount', v_existing_payment.amount,
        'amountPaid', v_tx."amountPaid",
        'transactionStatus', v_tx.status,
        'paymentStatus', v_tx."paymentStatus"
      );
    END IF;
  END IF;

  -- 4. Validate Transaction status (must be ACTIVE open tab awaiting settlement)
  IF v_tx.status != 'ACTIVE' OR v_tx."paymentStatus" NOT IN ('UNPAID', 'PARTIALLY_PAID') THEN
    RAISE EXCEPTION 'Cannot collect payment: transaction % is in % status with paymentStatus % (expected ACTIVE and UNPAID/PARTIALLY_PAID)',
      p_transaction_id, v_tx.status, v_tx."paymentStatus"
      USING ERRCODE = 'check_violation';
  END IF;

  -- 5. Calculate verified aggregate of SUCCESS payments and enforce overpayment cap
  SELECT COALESCE(SUM(amount), 0.00) INTO v_current_paid
  FROM public."payments"
  WHERE "transactionId" = p_transaction_id AND "status" = 'SUCCESS';

  v_new_total := v_current_paid + p_amount;
  IF (v_new_total + v_tx."writeOffAmount") > v_tx."grossAmount" THEN
    RAISE EXCEPTION 'Overpayment Rejected: Total payments (%) plus write-offs (%) would exceed gross invoice (%) for transaction %',
      v_new_total, v_tx."writeOffAmount", v_tx."grossAmount", p_transaction_id
      USING ERRCODE = 'check_violation';
  END IF;

  -- 6. Insert payment record (status = 'SUCCESS')
  v_payment_id := gen_random_uuid();
  INSERT INTO public."payments" (
    id, "restaurantId", "transactionId", "processedById", method, status,
    currency, amount, "tenderCurrency", "tenderAmount", "exchangeRate",
    "cashReceived", "changeGiven", "roundingAdjustment", "gatewayReference",
    "idempotencyKey", "paidAt", "createdAt"
  ) VALUES (
    v_payment_id, p_restaurant_id, p_transaction_id, p_processed_by_id, p_method, 'SUCCESS'::"PaymentAttemptStatus",
    p_currency, p_amount, p_tender_currency, p_tender_amount, p_exchange_rate,
    p_cash_received, p_change_given, COALESCE(p_rounding_adj, 0.00), p_gateway_reference,
    p_idempotency_key, NOW(), NOW()
  );

  -- 7. Determine terminal status progression
  IF (v_new_total + v_tx."writeOffAmount") >= v_tx."grossAmount" THEN
    v_new_status := 'COMPLETED'::"InvoiceStatus";
    v_completed_at := NOW();
    v_new_payment_status := CASE WHEN v_tx."writeOffAmount" > 0.00 THEN 'PARTIALLY_PAID'::"PaymentStatus" ELSE 'PAID'::"PaymentStatus" END;
  ELSE
    v_new_status := 'ACTIVE'::"InvoiceStatus";
    v_completed_at := NULL;
    v_new_payment_status := 'PARTIALLY_PAID'::"PaymentStatus";
  END IF;

  -- 8. Synchronize Transaction row atomically
  UPDATE public."transactions"
  SET "amountPaid" = v_new_total,
      "paymentStatus" = v_new_payment_status,
      "status" = v_new_status,
      "completedAt" = v_completed_at,
      "updatedAt" = NOW()
  WHERE id = p_transaction_id;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'idempotentReplay', false,
    'paymentId', v_payment_id,
    'transactionId', p_transaction_id,
    'amount', p_amount,
    'amountPaid', v_new_total,
    'grossAmount', v_tx."grossAmount",
    'transactionStatus', v_new_status,
    'paymentStatus', v_new_payment_status
  );
END;
$$;

-- Security & Permission Grants
REVOKE EXECUTE ON FUNCTION sp_collect_payment FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sp_collect_payment TO resto_app;
