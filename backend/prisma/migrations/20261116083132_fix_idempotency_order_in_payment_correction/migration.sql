-- ============================================================================
-- Migration: 20261116083132_fix_idempotency_order_in_payment_correction
-- Step: 1F-E2 Fix — Idempotency Replay Evaluation Prior to Status Check
-- Database: PostgreSQL 16.15 | ORM: Prisma 6.19.3
-- Architecture: 16 Models, 12 Enums, Strict NO-REFUND Policy
-- ============================================================================

CREATE OR REPLACE FUNCTION sp_correct_payment_authorized(
  p_restaurant_id UUID,
  p_transaction_id UUID,
  p_payment_id UUID,
  p_supervisor_id UUID,
  p_supervisor_pin VARCHAR,
  p_new_method "PaymentMethod",
  p_new_cash_received DECIMAL(14, 2),
  p_new_change_given DECIMAL(14, 2),
  p_reason VARCHAR(255),
  p_idempotency_key VARCHAR(64),
  p_new_tender_currency VARCHAR(3) DEFAULT NULL,
  p_new_exchange_rate DECIMAL(12, 4) DEFAULT NULL,
  p_new_rounding_adj DECIMAL(10, 2) DEFAULT NULL,
  p_gateway_reference VARCHAR(100) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_failed_attempts INTEGER;
  v_supervisor_valid BOOLEAN;
  v_tx RECORD;
  v_orig RECORD;
  v_existing_payment RECORD;
  v_replacement_id UUID;
  v_new_tender_currency VARCHAR(3);
  v_new_exchange_rate DECIMAL(12, 4);
  v_new_tender_amount DECIMAL(14, 2);
  v_new_rounding DECIMAL(10, 2);
  v_final_paid DECIMAL(10, 2);
BEGIN
  -- 1. Input parameter validation
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'A valid correction reason is required'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_supervisor_pin IS NULL OR length(trim(p_supervisor_pin)) = 0 THEN
    RAISE EXCEPTION 'Supervisor PIN is required'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 2. PIN attempt protection / Rate limiting (max 5 failed attempts in past 15 minutes)
  SELECT COUNT(*) INTO v_failed_attempts
  FROM public."audit_logs"
  WHERE "userId" = p_supervisor_id
    AND "action" = 'PAYMENT_CORRECTION_FAILED'
    AND "createdAt" > (NOW() - INTERVAL '15 minutes');

  IF v_failed_attempts >= 5 THEN
    RAISE EXCEPTION 'Supervisor PIN is temporarily locked due to excessive failed attempts. Please try again later.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 3. Supervisor Authentication and Authorization Verification
  SELECT EXISTS (
    SELECT 1
    FROM public."users" u
    JOIN public."staff_profiles" sp
      ON u.id = sp."userId" AND u."restaurantId" = sp."restaurantId"
    JOIN public."roles" r
      ON u."roleId" = r.id AND u."restaurantId" = r."restaurantId"
    JOIN public."role_permissions" rp
      ON r.id = rp."roleId" AND r."restaurantId" = rp."restaurantId"
    JOIN public."permissions" p
      ON rp."permissionId" = p.id
    WHERE u.id = p_supervisor_id
      AND u."restaurantId" = p_restaurant_id
      AND u."isActive" = true
      AND sp."pinHash" IS NOT NULL
      AND sp."pinHash" = public.crypt(p_supervisor_pin, sp."pinHash")
      AND p.code = 'PAYMENT_CORRECTION'
  ) INTO v_supervisor_valid;

  IF NOT v_supervisor_valid THEN
    -- Audit rejected authorization attempt
    INSERT INTO public."audit_logs" (
      id, "restaurantId", "userId", action, "entityType", "entityId", details, "createdAt"
    ) VALUES (
      gen_random_uuid(), p_restaurant_id, p_supervisor_id,
      'PAYMENT_CORRECTION_FAILED', 'Payment', p_payment_id,
      jsonb_build_object(
        'reason', 'Invalid supervisor credentials, PIN, or missing PAYMENT_CORRECTION permission',
        'paymentId', p_payment_id,
        'transactionId', p_transaction_id
      ),
      NOW()
    );

    RAISE EXCEPTION 'Authorization Denied: Invalid supervisor credentials, PIN, or missing PAYMENT_CORRECTION permission'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 4. CONCURRENCY CONTROL: Lock parent Transaction row FIRST (Level 4 in global hierarchy)
  SELECT * INTO v_tx
  FROM public."transactions"
  WHERE id = p_transaction_id AND "restaurantId" = p_restaurant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction % not found for restaurant %', p_transaction_id, p_restaurant_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_tx.status = 'CANCELLED' THEN
    RAISE EXCEPTION 'Cannot correct payment: transaction % is CANCELLED', p_transaction_id
      USING ERRCODE = 'check_violation';
  END IF;

  -- 5. SCOPED IDEMPOTENCY CHECK (executed AFTER acquiring transaction lock, BEFORE payment status check)
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
      IF v_existing_payment.method != p_new_method OR
         (p_new_method = 'CASH' AND (
           v_existing_payment."cashReceived" != p_new_cash_received OR
           v_existing_payment."changeGiven" != p_new_change_given
         )) THEN
        RAISE EXCEPTION 'Idempotency key % reused with mismatched correction parameters',
          p_idempotency_key USING ERRCODE = 'check_violation';
      END IF;

      -- Return existing successful correction result safely
      RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'idempotentReplay', true,
        'originalPaymentId', p_payment_id,
        'replacementPaymentId', v_existing_payment.id,
        'transactionId', p_transaction_id,
        'amount', v_existing_payment.amount,
        'amountPaid', v_tx."amountPaid",
        'originalMethod', NULL,
        'newMethod', v_existing_payment.method,
        'transactionStatus', v_tx.status,
        'paymentStatus', v_tx."paymentStatus"
      );
    END IF;
  END IF;

  -- 6. CONCURRENCY CONTROL: Lock target Payment row SECOND (Level 5 in global hierarchy)
  SELECT * INTO v_orig
  FROM public."payments"
  WHERE id = p_payment_id
    AND "transactionId" = p_transaction_id
    AND "restaurantId" = p_restaurant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment % does not match transaction % and restaurant %',
      p_payment_id, p_transaction_id, p_restaurant_id
      USING ERRCODE = 'check_violation';
  END IF;

  -- 7. Validate Payment status (only SUCCESS can undergo correction)
  IF v_orig.status != 'SUCCESS' THEN
    RAISE EXCEPTION 'Payment % is in status %; only SUCCESS payments can undergo correction',
      p_payment_id, v_orig.status
      USING ERRCODE = 'check_violation';
  END IF;

  -- 8. Validate Replacement Tender Calculations
  v_new_tender_currency := COALESCE(p_new_tender_currency, v_orig."tenderCurrency", 'USD');
  v_new_exchange_rate := COALESCE(p_new_exchange_rate, v_orig."exchangeRate", 1.0000);

  IF v_new_exchange_rate <= 0.0000 THEN
    RAISE EXCEPTION 'Exchange rate must be strictly positive (got %)', v_new_exchange_rate
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_new_method = 'CASH' THEN
    IF p_new_cash_received IS NULL OR p_new_change_given IS NULL THEN
      RAISE EXCEPTION 'Cash tender requires both cashReceived and changeGiven'
        USING ERRCODE = 'check_violation';
    END IF;
    IF p_new_cash_received < p_new_change_given THEN
      RAISE EXCEPTION 'Cash received (%) cannot be less than change given (%)',
        p_new_cash_received, p_new_change_given USING ERRCODE = 'check_violation';
    END IF;
    v_new_tender_amount := p_new_cash_received - p_new_change_given;
    IF v_new_tender_amount <= 0.00 THEN
      RAISE EXCEPTION 'Net cash received minus change given must be strictly positive (got %)',
        v_new_tender_amount USING ERRCODE = 'check_violation';
    END IF;
    v_new_rounding := COALESCE(p_new_rounding_adj, v_orig."roundingAdjustment", 0.00);
  ELSE
    -- Non-cash payment (e.g. CREDIT_CARD, DEBIT_CARD, QR_CODE, BANK_TRANSFER)
    p_new_cash_received := NULL;
    p_new_change_given := NULL;
    v_new_tender_amount := ROUND(v_orig.amount * v_new_exchange_rate, 2);
    v_new_rounding := 0.00;
  END IF;

  -- 9. Transition original payment to CORRECTED (preserves all financial fields)
  UPDATE public."payments"
  SET "status" = 'CORRECTED'::"PaymentAttemptStatus"
  WHERE id = p_payment_id;

  -- 10. Insert replacement SUCCESS payment with identical base USD amount
  v_replacement_id := gen_random_uuid();
  INSERT INTO public."payments" (
    id, "restaurantId", "transactionId", "processedById", method, status,
    currency, amount, "tenderCurrency", "tenderAmount", "exchangeRate",
    "cashReceived", "changeGiven", "roundingAdjustment", "gatewayReference",
    "idempotencyKey", "paidAt", "createdAt"
  ) VALUES (
    v_replacement_id, p_restaurant_id, p_transaction_id, p_supervisor_id,
    p_new_method, 'SUCCESS'::"PaymentAttemptStatus",
    v_orig.currency, v_orig.amount,
    v_new_tender_currency, v_new_tender_amount, v_new_exchange_rate,
    p_new_cash_received, p_new_change_given, v_new_rounding,
    p_gateway_reference, p_idempotency_key, NOW(), NOW()
  );

  -- 11. Reconcile transaction total (SUCCESS payments only)
  SELECT COALESCE(SUM(amount), 0.00) INTO v_final_paid
  FROM public."payments"
  WHERE "transactionId" = p_transaction_id AND "status" = 'SUCCESS';

  -- Assert exact financial aggregate continuity (zero variance)
  IF v_final_paid != v_tx."amountPaid" THEN
    RAISE EXCEPTION 'Internal Error: Reconciled payment total (%) does not match transaction amountPaid (%)',
      v_final_paid, v_tx."amountPaid" USING ERRCODE = 'data_corrupted';
  END IF;

  UPDATE public."transactions"
  SET "updatedAt" = NOW()
  WHERE id = p_transaction_id;

  -- 12. Write immutable AuditLog entry
  INSERT INTO public."audit_logs" (
    id, "restaurantId", "userId", action, "entityType", "entityId",
    details, "createdAt"
  ) VALUES (
    gen_random_uuid(), p_restaurant_id, p_supervisor_id,
    'PAYMENT_CORRECTION', 'Payment', p_payment_id,
    jsonb_build_object(
      'originalPaymentId', p_payment_id,
      'replacementPaymentId', v_replacement_id,
      'transactionId', p_transaction_id,
      'originalMethod', v_orig.method,
      'newMethod', p_new_method,
      'amount', v_orig.amount,
      'reason', p_reason
    ),
    NOW()
  );

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'idempotentReplay', false,
    'originalPaymentId', p_payment_id,
    'replacementPaymentId', v_replacement_id,
    'transactionId', p_transaction_id,
    'amount', v_orig.amount,
    'amountPaid', v_final_paid,
    'originalMethod', v_orig.method,
    'newMethod', p_new_method,
    'transactionStatus', v_tx.status,
    'paymentStatus', v_tx."paymentStatus"
  );
END;
$$;

-- Ensure ownership and execute permissions remain hardened
ALTER FUNCTION public.sp_correct_payment_authorized(
  UUID, UUID, UUID, UUID, VARCHAR, "PaymentMethod", DECIMAL, DECIMAL, VARCHAR, VARCHAR, VARCHAR, DECIMAL, DECIMAL, VARCHAR
) OWNER TO resto_owner;

REVOKE ALL ON FUNCTION public.sp_correct_payment_authorized(
  UUID, UUID, UUID, UUID, VARCHAR, "PaymentMethod", DECIMAL, DECIMAL, VARCHAR, VARCHAR, VARCHAR, DECIMAL, DECIMAL, VARCHAR
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.sp_correct_payment_authorized(
  UUID, UUID, UUID, UUID, VARCHAR, "PaymentMethod", DECIMAL, DECIMAL, VARCHAR, VARCHAR, VARCHAR, DECIMAL, DECIMAL, VARCHAR
) TO resto_app;
