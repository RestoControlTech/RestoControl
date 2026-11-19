-- ============================================================================
-- Migration: 20261112123555_payment_immutability_and_audit
-- Step: 1F-D2 — Payment Immutability, Audit Protection & Concurrency Controls
-- Database: PostgreSQL 16.15 | ORM: Prisma 6.19.3
-- Architecture: 16 Models, 12 Enums, Strict NO-REFUND Policy
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PAYMENT IMMUTABILITY TRIGGER
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_protect_payment_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Prevent deletion of SUCCESS and CORRECTED payments (strict NO-REFUND policy)
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('SUCCESS', 'CORRECTED') THEN
      RAISE EXCEPTION 'Cannot delete financial payment record % in % status (strict NO-REFUND policy)',
        OLD.id, OLD.status USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  -- 2. Protect existing records on UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Prevent changing parent transaction or restaurant tenant
    IF NEW."transactionId" IS DISTINCT FROM OLD."transactionId" THEN
      RAISE EXCEPTION 'Changing transactionId on payment % is strictly prohibited',
        OLD.id USING ERRCODE = 'check_violation';
    END IF;

    IF NEW."restaurantId" IS DISTINCT FROM OLD."restaurantId" THEN
      RAISE EXCEPTION 'Changing restaurantId on payment % is strictly prohibited',
        OLD.id USING ERRCODE = 'check_violation';
    END IF;

    -- Permanently freeze already CORRECTED payments (no modifications permitted)
    IF OLD.status = 'CORRECTED' THEN
      RAISE EXCEPTION 'Payment % is already CORRECTED and permanently frozen; modifications are prohibited',
        OLD.id USING ERRCODE = 'check_violation';
    END IF;

    -- Protect SUCCESS payments: allow only SUCCESS -> CORRECTED transition
    IF OLD.status = 'SUCCESS' THEN
      IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status != 'CORRECTED' THEN
        RAISE EXCEPTION 'Invalid status transition from SUCCESS to % for payment %; only SUCCESS -> CORRECTED is permitted',
          NEW.status, OLD.id USING ERRCODE = 'check_violation';
      END IF;

      -- Financial fields of SUCCESS payments are completely immutable
      IF NEW.amount IS DISTINCT FROM OLD.amount OR
         NEW."tenderAmount" IS DISTINCT FROM OLD."tenderAmount" OR
         NEW.currency IS DISTINCT FROM OLD.currency OR
         NEW."tenderCurrency" IS DISTINCT FROM OLD."tenderCurrency" OR
         NEW."exchangeRate" IS DISTINCT FROM OLD."exchangeRate" OR
         NEW."cashReceived" IS DISTINCT FROM OLD."cashReceived" OR
         NEW."changeGiven" IS DISTINCT FROM OLD."changeGiven" OR
         NEW."roundingAdjustment" IS DISTINCT FROM OLD."roundingAdjustment" THEN
        RAISE EXCEPTION 'Modifying financial fields of successful payment % is strictly prohibited',
          OLD.id USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_payment_immutability ON public."payments";
CREATE TRIGGER trg_protect_payment_immutability
  BEFORE UPDATE OR DELETE ON public."payments"
  FOR EACH ROW
  EXECUTE FUNCTION fn_protect_payment_immutability();

-- ----------------------------------------------------------------------------
-- 2. AUDIT LOG APPEND-ONLY PROTECTION TRIGGER
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_protect_audit_log_immutability()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log records are strictly append-only and immutable; UPDATE and DELETE operations are prohibited'
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_audit_log_immutability ON public."audit_logs";
CREATE TRIGGER trg_protect_audit_log_immutability
  BEFORE UPDATE OR DELETE ON public."audit_logs"
  FOR EACH ROW
  EXECUTE FUNCTION fn_protect_audit_log_immutability();

-- ----------------------------------------------------------------------------
-- 3. ORDER-ITEM REASSIGNMENT PROTECTION TRIGGER
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_protect_order_item_reassignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."orderId" IS DISTINCT FROM OLD."orderId" THEN
    RAISE EXCEPTION 'Reassigning order items to a different order is strictly prohibited'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW."restaurantId" IS DISTINCT FROM OLD."restaurantId" THEN
    RAISE EXCEPTION 'Reassigning order items to a different restaurant is strictly prohibited'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_order_item_reassignment ON public."order_items";
CREATE TRIGGER trg_protect_order_item_reassignment
  BEFORE UPDATE ON public."order_items"
  FOR EACH ROW
  EXECUTE FUNCTION fn_protect_order_item_reassignment();

-- ----------------------------------------------------------------------------
-- 4. BILL-FREEZING ORDER TRIGGER (PREVENTS CHECKOUT / EDIT RACE CONDITIONS)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_protect_frozen_order()
RETURNS TRIGGER AS $$
DECLARE
  v_has_active_tx BOOLEAN;
BEGIN
  -- Determine whether an active or completed invoice exists for this order
  IF TG_OP = 'DELETE' THEN
    IF OLD."sessionId" IS NOT NULL THEN
      SELECT EXISTS(
        SELECT 1 FROM public."transactions"
        WHERE "sessionId" = OLD."sessionId" AND "status" IN ('ACTIVE', 'COMPLETED')
      ) INTO v_has_active_tx;
    ELSE
      SELECT EXISTS(
        SELECT 1 FROM public."transactions"
        WHERE "directOrderId" = OLD.id AND "status" IN ('ACTIVE', 'COMPLETED')
      ) INTO v_has_active_tx;
    END IF;

    IF v_has_active_tx THEN
      RAISE EXCEPTION 'Cannot delete order %; bill is frozen for checkout or already settled',
        OLD.id USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD."sessionId" IS NOT NULL THEN
      SELECT EXISTS(
        SELECT 1 FROM public."transactions"
        WHERE "sessionId" = OLD."sessionId" AND "status" IN ('ACTIVE', 'COMPLETED')
      ) INTO v_has_active_tx;
    ELSE
      SELECT EXISTS(
        SELECT 1 FROM public."transactions"
        WHERE "directOrderId" = OLD.id AND "status" IN ('ACTIVE', 'COMPLETED')
      ) INTO v_has_active_tx;
    END IF;

    IF v_has_active_tx THEN
      IF NEW."subtotal" IS DISTINCT FROM OLD."subtotal" OR
         NEW."total" IS DISTINCT FROM OLD."total" OR
         NEW."discountAmount" IS DISTINCT FROM OLD."discountAmount" OR
         NEW."taxAmount" IS DISTINCT FROM OLD."taxAmount" OR
         NEW."serviceChargeAmount" IS DISTINCT FROM OLD."serviceChargeAmount" OR
         NEW."sessionId" IS DISTINCT FROM OLD."sessionId" THEN
        RAISE EXCEPTION 'Cannot modify financial billing fields on order % while bill is frozen or settled',
          OLD.id USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_frozen_order ON public."orders";
CREATE TRIGGER trg_protect_frozen_order
  BEFORE UPDATE OR DELETE ON public."orders"
  FOR EACH ROW
  EXECUTE FUNCTION fn_protect_frozen_order();

-- ----------------------------------------------------------------------------
-- 5. BILL-FREEZING ORDER-ITEM TRIGGER
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_protect_frozen_order_item()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id UUID;
  v_session_id UUID;
  v_has_active_tx BOOLEAN;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_order_id := OLD."orderId";
  ELSE
    v_order_id := NEW."orderId";
  END IF;

  SELECT "sessionId" INTO v_session_id FROM public."orders" WHERE id = v_order_id;

  IF v_session_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public."transactions"
      WHERE "sessionId" = v_session_id AND "status" IN ('ACTIVE', 'COMPLETED')
    ) INTO v_has_active_tx;
  ELSE
    SELECT EXISTS(
      SELECT 1 FROM public."transactions"
      WHERE "directOrderId" = v_order_id AND "status" IN ('ACTIVE', 'COMPLETED')
    ) INTO v_has_active_tx;
  END IF;

  IF v_has_active_tx THEN
    RAISE EXCEPTION 'Cannot % order_items for order %; bill is frozen for checkout or already settled',
      TG_OP, v_order_id USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_frozen_order_item ON public."order_items";
CREATE TRIGGER trg_protect_frozen_order_item
  BEFORE INSERT OR UPDATE OR DELETE ON public."order_items"
  FOR EACH ROW
  EXECUTE FUNCTION fn_protect_frozen_order_item();

-- ----------------------------------------------------------------------------
-- 6. APPLICATION ROLE SECURITY & PRIVILEGE BOUNDARY
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'resto_app') THEN
    CREATE ROLE resto_app WITH LOGIN PASSWORD 'resto_app_dev_secret';
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO resto_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO resto_app;

-- Revoke high-risk direct modifications from application role
REVOKE UPDATE, DELETE ON public."audit_logs" FROM resto_app;
REVOKE DELETE ON public."payments" FROM resto_app;

-- Restrict direct writeOffAmount modifications: revoke table-level UPDATE and grant column-level UPDATE without writeOffAmount
REVOKE UPDATE ON public."transactions" FROM resto_app;
GRANT UPDATE (
  subtotal, "taxAmount", "serviceChargeAmount", "discountType",
  "discountRate", "discountAmount", "discountReason", "grossAmount",
  "amountPaid", "paymentStatus", status, "isSplitPayment",
  "paymentSummary", "itemSummary", notes, "completedAt", "updatedAt"
) ON public."transactions" TO resto_app;
