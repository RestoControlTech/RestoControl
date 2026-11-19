-- ============================================================================
-- Migration: 20261116085048_supervisor_write_off
-- Step: 1F-E3 — Authorized Supervisor Write-Off Stored Procedure
-- Database: PostgreSQL 16.15 | ORM: Prisma 6.19.3
-- Architecture: 16 Models, 12 Enums, Strict NO-REFUND Policy
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SEED SYSTEM PERMISSION FOR TRANSACTION WRITE-OFF
-- ----------------------------------------------------------------------------
INSERT INTO public."permissions" (id, code, module, description, "createdAt")
VALUES (
  gen_random_uuid(),
  'TRANSACTION_WRITE_OFF',
  'BILLING',
  'Authorize debt write-off on uncollectible transactions',
  NOW()
)
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. LEAST-PRIVILEGE OBJECT GRANTS FOR resto_owner
-- ----------------------------------------------------------------------------
-- Allow resto_owner to lock table_sessions in global lock hierarchy
GRANT SELECT, UPDATE ("status") ON public."table_sessions" TO resto_owner;

-- Allow resto_owner to modify writeOffAmount on transactions
GRANT UPDATE ("writeOffAmount") ON public."transactions" TO resto_owner;

-- ----------------------------------------------------------------------------
-- 3. STORED PROCEDURE: sp_apply_write_off_authorized
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sp_apply_write_off_authorized(
  p_restaurant_id UUID,
  p_transaction_id UUID,
  p_amount DECIMAL(10, 2),
  p_supervisor_id UUID,
  p_supervisor_pin VARCHAR,
  p_reason VARCHAR(255),
  p_idempotency_key VARCHAR(64),
  p_session_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_failed_attempts INTEGER;
  v_supervisor_valid BOOLEAN;
  v_session RECORD;
  v_tx RECORD;
  v_existing_audit RECORD;
  v_outstanding_balance DECIMAL(10, 2);
  v_new_write_off DECIMAL(10, 2);
  v_new_status "InvoiceStatus";
  v_new_payment_status "PaymentStatus";
  v_completed_at TIMESTAMPTZ(6);
BEGIN
  -- 1. Input parameter validation
  IF p_amount IS NULL OR p_amount <= 0.00 THEN
    RAISE EXCEPTION 'Write-off amount must be strictly positive (got %)', p_amount
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'A valid, descriptive reason (minimum 5 characters) is required for write-off'
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
    AND "action" = 'TRANSACTION_WRITE_OFF_FAILED'
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
      AND p.code = 'TRANSACTION_WRITE_OFF'
  ) INTO v_supervisor_valid;

  IF NOT v_supervisor_valid THEN
    -- Audit rejected authorization attempt (record userId if user belongs to this restaurant, else NULL to satisfy FK)
    INSERT INTO public."audit_logs" (
      id, "restaurantId", "userId", action, "entityType", "entityId", details, "createdAt"
    ) VALUES (
      gen_random_uuid(),
      p_restaurant_id,
      CASE WHEN EXISTS (SELECT 1 FROM public."users" WHERE id = p_supervisor_id AND "restaurantId" = p_restaurant_id) THEN p_supervisor_id ELSE NULL END,
      'TRANSACTION_WRITE_OFF_FAILED', 'Transaction', p_transaction_id,
      jsonb_build_object(
        'reason', 'Invalid supervisor credentials, PIN, or missing TRANSACTION_WRITE_OFF permission',
        'attemptedSupervisorId', p_supervisor_id,
        'transactionId', p_transaction_id,
        'attemptedAmount', p_amount
      ),
      NOW()
    );

    RAISE EXCEPTION 'Authorization Denied: Invalid supervisor credentials, PIN, or missing TRANSACTION_WRITE_OFF permission'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 4. CONCURRENCY CONTROL: Global Lock Hierarchy (Level 1 TableSession -> Level 4 Transaction)
  IF p_session_id IS NOT NULL THEN
    SELECT * INTO v_session
    FROM public."table_sessions"
    WHERE id = p_session_id AND "restaurantId" = p_restaurant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Table session % not found for restaurant %', p_session_id, p_restaurant_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  SELECT * INTO v_tx
  FROM public."transactions"
  WHERE id = p_transaction_id AND "restaurantId" = p_restaurant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction % not found for restaurant %', p_transaction_id, p_restaurant_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_session_id IS NOT NULL AND v_tx."sessionId" IS DISTINCT FROM p_session_id THEN
    RAISE EXCEPTION 'Transaction % does not belong to session %', p_transaction_id, p_session_id
      USING ERRCODE = 'check_violation';
  END IF;

  -- 5. SCOPED IDEMPOTENCY CHECK (executed AFTER acquiring locks, before state modifications)
  IF p_idempotency_key IS NOT NULL AND length(trim(p_idempotency_key)) > 0 THEN
    SELECT * INTO v_existing_audit
    FROM public."audit_logs"
    WHERE "restaurantId" = p_restaurant_id
      AND "action" = 'TRANSACTION_WRITE_OFF'
      AND "details"->>'idempotencyKey' = p_idempotency_key;

    IF v_existing_audit.id IS NOT NULL THEN
      -- Verify replay ownership against transaction
      IF (v_existing_audit.details->>'transactionId')::UUID != p_transaction_id THEN
        RAISE EXCEPTION 'Idempotency key % already used for a different transaction',
          p_idempotency_key USING ERRCODE = 'check_violation';
      END IF;

      -- Check payload match
      IF (v_existing_audit.details->>'amount')::DECIMAL(10, 2) != p_amount THEN
        RAISE EXCEPTION 'Idempotency key % reused with mismatched write-off amount',
          p_idempotency_key USING ERRCODE = 'check_violation';
      END IF;

      -- Return existing successful write-off result safely
      RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'idempotentReplay', true,
        'transactionId', p_transaction_id,
        'writtenOffAmount', p_amount,
        'totalWriteOffAmount', v_tx."writeOffAmount",
        'amountPaid', v_tx."amountPaid",
        'grossAmount', v_tx."grossAmount",
        'outstandingBalance', (v_tx."grossAmount" - (v_tx."amountPaid" + v_tx."writeOffAmount")),
        'transactionStatus', v_tx.status,
        'paymentStatus', v_tx."paymentStatus"
      );
    END IF;
  END IF;

  -- 6. Validate Transaction status (must be ACTIVE open tab)
  IF v_tx.status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Cannot apply write-off: transaction % is in % status (expected ACTIVE)',
      p_transaction_id, v_tx.status
      USING ERRCODE = 'check_violation';
  END IF;

  -- 7. Calculate outstanding balance & validate write-off bounds
  v_outstanding_balance := v_tx."grossAmount" - (v_tx."amountPaid" + v_tx."writeOffAmount");
  IF v_outstanding_balance <= 0.00 THEN
    RAISE EXCEPTION 'Transaction % has zero outstanding balance; no debt to write off',
      p_transaction_id USING ERRCODE = 'check_violation';
  END IF;

  IF p_amount > v_outstanding_balance THEN
    RAISE EXCEPTION 'Write-off amount (%) exceeds outstanding balance (%) for transaction %',
      p_amount, v_outstanding_balance, p_transaction_id
      USING ERRCODE = 'check_violation';
  END IF;

  v_new_write_off := v_tx."writeOffAmount" + p_amount;

  -- 8. Lifecycle consistency and terminal status progression
  IF (v_tx."amountPaid" + v_new_write_off) = v_tx."grossAmount" THEN
    -- Transaction fully settled
    v_new_status := 'COMPLETED'::"InvoiceStatus";
    v_completed_at := NOW();
    v_new_payment_status := CASE WHEN v_tx."amountPaid" > 0.00 THEN 'PARTIALLY_PAID'::"PaymentStatus" ELSE 'UNPAID'::"PaymentStatus" END;
  ELSE
    -- Partial write-off on active tab: valid when amountPaid > 0
    IF v_tx."amountPaid" = 0.00 THEN
      RAISE EXCEPTION 'Partial write-off on unpaid transaction % (amountPaid = 0.00) is prohibited; full write-off required to settle bad debt',
        p_transaction_id USING ERRCODE = 'check_violation';
    END IF;

    v_new_status := 'ACTIVE'::"InvoiceStatus";
    v_completed_at := NULL;
    v_new_payment_status := 'PARTIALLY_PAID'::"PaymentStatus";
  END IF;

  -- 9. Update Transaction row atomically
  UPDATE public."transactions"
  SET "writeOffAmount" = v_new_write_off,
      "paymentStatus" = v_new_payment_status,
      "status" = v_new_status,
      "completedAt" = v_completed_at,
      "updatedAt" = NOW()
  WHERE id = p_transaction_id;

  -- 10. Write immutable AuditLog entry
  INSERT INTO public."audit_logs" (
    id, "restaurantId", "userId", action, "entityType", "entityId",
    details, "createdAt"
  ) VALUES (
    gen_random_uuid(), p_restaurant_id, p_supervisor_id,
    'TRANSACTION_WRITE_OFF', 'Transaction', p_transaction_id,
    jsonb_build_object(
      'transactionId', p_transaction_id,
      'amount', p_amount,
      'previousWriteOff', v_tx."writeOffAmount",
      'newWriteOffAmount', v_new_write_off,
      'grossAmount', v_tx."grossAmount",
      'amountPaid', v_tx."amountPaid",
      'remainingBalance', (v_tx."grossAmount" - (v_tx."amountPaid" + v_new_write_off)),
      'reason', trim(p_reason),
      'idempotencyKey', p_idempotency_key
    ),
    NOW()
  );

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'idempotentReplay', false,
    'transactionId', p_transaction_id,
    'writtenOffAmount', p_amount,
    'totalWriteOffAmount', v_new_write_off,
    'amountPaid', v_tx."amountPaid",
    'grossAmount', v_tx."grossAmount",
    'outstandingBalance', (v_tx."grossAmount" - (v_tx."amountPaid" + v_new_write_off)),
    'transactionStatus', v_new_status,
    'paymentStatus', v_new_payment_status
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. FUNCTION OWNERSHIP AND SECURITY PERMISSIONS
-- ----------------------------------------------------------------------------
-- Transfer ownership to dedicated unprivileged role resto_owner
ALTER FUNCTION public.sp_apply_write_off_authorized(
  UUID, UUID, DECIMAL, UUID, VARCHAR, VARCHAR, VARCHAR, UUID
) OWNER TO resto_owner;

-- Ensure PUBLIC has zero execution privileges
REVOKE ALL ON FUNCTION public.sp_apply_write_off_authorized(
  UUID, UUID, DECIMAL, UUID, VARCHAR, VARCHAR, VARCHAR, UUID
) FROM PUBLIC;

-- Grant EXECUTE exclusively to application role resto_app
GRANT EXECUTE ON FUNCTION public.sp_apply_write_off_authorized(
  UUID, UUID, DECIMAL, UUID, VARCHAR, VARCHAR, VARCHAR, UUID
) TO resto_app;
