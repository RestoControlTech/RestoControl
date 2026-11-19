-- ============================================================================
-- Migration: 20261112115730_integrity_constraints
-- Step: 1F-D1 — Database Integrity Constraints & Partial Unique Indexes
-- Database: PostgreSQL 16.15 | ORM: Prisma 6.19.3
-- Architecture: 16 Models, 12 Enums, Strict NO-REFUND Policy
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- ----------------------------------------------------------------------------
-- 2. TRANSACTION CONSTRAINTS
-- ----------------------------------------------------------------------------

-- Transaction target XOR: Exactly one valid target (sessionId XOR directOrderId)
ALTER TABLE public."transactions"
  ADD CONSTRAINT "chk_tx_target_xor"
  CHECK (
    ("sessionId" IS NOT NULL AND "directOrderId" IS NULL) OR
    ("sessionId" IS NULL AND "directOrderId" IS NOT NULL)
  );

-- Transaction target alignment with OrderType
ALTER TABLE public."transactions"
  ADD CONSTRAINT "chk_tx_order_type_target"
  CHECK (
    ("orderType" = 'DINE_IN' AND "sessionId" IS NOT NULL AND "directOrderId" IS NULL) OR
    ("orderType" IN ('TAKEAWAY', 'DELIVERY') AND "sessionId" IS NULL AND "directOrderId" IS NOT NULL)
  );

-- Financial non-negativity on transactions
ALTER TABLE public."transactions"
  ADD CONSTRAINT "chk_tx_financial_non_negative"
  CHECK (
    "subtotal" >= 0.00 AND
    "discountAmount" >= 0.00 AND
    "taxAmount" >= 0.00 AND
    "serviceChargeAmount" >= 0.00 AND
    "grossAmount" >= 0.00 AND
    "amountPaid" >= 0.00 AND
    "writeOffAmount" >= 0.00
  );

-- Gross amount calculation integrity
ALTER TABLE public."transactions"
  ADD CONSTRAINT "chk_tx_gross_calculation"
  CHECK ("grossAmount" = ("subtotal" - "discountAmount" + "taxAmount" + "serviceChargeAmount"));

-- Overpayment prevention cap: total settled funds plus write-offs cannot exceed gross invoice
ALTER TABLE public."transactions"
  ADD CONSTRAINT "chk_tx_amount_paid_cap"
  CHECK ("amountPaid" + "writeOffAmount" <= "grossAmount");

-- 6-State Mutually Exclusive Transaction Lifecycle Constraint
ALTER TABLE public."transactions"
  ADD CONSTRAINT "chk_tx_lifecycle_consistency"
  CHECK (
    -- 1. Unpaid active
    ("status" = 'ACTIVE' AND "paymentStatus" = 'UNPAID' AND "completedAt" IS NULL AND "amountPaid" = 0.00 AND "writeOffAmount" = 0.00) OR
    -- 2. Partially paid active
    ("status" = 'ACTIVE' AND "paymentStatus" = 'PARTIALLY_PAID' AND "completedAt" IS NULL AND "amountPaid" > 0.00 AND "amountPaid" + "writeOffAmount" < "grossAmount") OR
    -- 3. Fully paid completed
    ("status" = 'COMPLETED' AND "paymentStatus" = 'PAID' AND "completedAt" IS NOT NULL AND "amountPaid" = "grossAmount" AND "writeOffAmount" = 0.00) OR
    -- 4. Partially paid with write-off completed ($10 paid + $20 written off on $30 tab)
    ("status" = 'COMPLETED' AND "paymentStatus" = 'PARTIALLY_PAID' AND "completedAt" IS NOT NULL AND "amountPaid" > 0.00 AND "writeOffAmount" > 0.00 AND "amountPaid" + "writeOffAmount" = "grossAmount") OR
    -- 5. Zero paid with total write-off completed ($0 paid + $30 written off on $30 tab)
    ("status" = 'COMPLETED' AND "paymentStatus" = 'UNPAID' AND "completedAt" IS NOT NULL AND "amountPaid" = 0.00 AND "writeOffAmount" = "grossAmount" AND "writeOffAmount" > 0.00) OR
    -- 6. Cancelled checkout (zero paid, zero written off)
    ("status" = 'CANCELLED' AND "paymentStatus" = 'UNPAID' AND "completedAt" IS NULL AND "amountPaid" = 0.00 AND "writeOffAmount" = 0.00)
  );

-- ----------------------------------------------------------------------------
-- 3. ORDER & ORDER-ITEM CONSTRAINTS
-- ----------------------------------------------------------------------------

-- Enforce Order Type target alignment
ALTER TABLE public."orders"
  ADD CONSTRAINT "chk_order_type_target"
  CHECK (
    ("orderType" = 'DINE_IN' AND "sessionId" IS NOT NULL) OR
    ("orderType" IN ('TAKEAWAY', 'DELIVERY') AND "sessionId" IS NULL)
  );

-- Financial non-negativity on orders
ALTER TABLE public."orders"
  ADD CONSTRAINT "chk_orders_financial_non_negative"
  CHECK (
    "subtotal" >= 0.00 AND
    "discountAmount" >= 0.00 AND
    "taxAmount" >= 0.00 AND
    "serviceChargeAmount" >= 0.00 AND
    "total" >= 0.00
  );

-- Financial non-negativity on order items
ALTER TABLE public."order_items"
  ADD CONSTRAINT "chk_order_items_financial_non_negative"
  CHECK (
    "quantity" > 0 AND
    "unitPrice" >= 0.00 AND
    ("unitCost" IS NULL OR "unitCost" >= 0.00) AND
    "lineTotal" >= 0.00
  );

-- ----------------------------------------------------------------------------
-- 4. PAYMENT CONSTRAINTS
-- ----------------------------------------------------------------------------

-- Payment amounts and currency rates validation
ALTER TABLE public."payments"
  ADD CONSTRAINT "chk_payment_financial_non_negative"
  CHECK (
    "amount" > 0.00 AND
    "tenderAmount" > 0.00 AND
    "exchangeRate" > 0.0000 AND
    ("cashReceived" IS NULL OR "cashReceived" >= 0.00) AND
    ("changeGiven" IS NULL OR "changeGiven" >= 0.00)
  );

-- Terminal payment status vs paidAt consistency
ALTER TABLE public."payments"
  ADD CONSTRAINT "chk_payment_status_paid_at_consistency"
  CHECK (
    ("status" IN ('SUCCESS', 'CORRECTED') AND "paidAt" IS NOT NULL) OR
    ("status" IN ('PENDING', 'FAILED', 'CANCELLED') AND "paidAt" IS NULL)
  );

-- Cash tender and change calculation validation
ALTER TABLE public."payments"
  ADD CONSTRAINT "chk_payment_cash_balance"
  CHECK (
    ("method" = 'CASH' AND "cashReceived" IS NOT NULL AND "changeGiven" IS NOT NULL AND ("cashReceived" - "changeGiven" = "tenderAmount")) OR
    ("method" != 'CASH')
  );

-- ----------------------------------------------------------------------------
-- 5. PARTIAL UNIQUE INDEXES
-- ----------------------------------------------------------------------------

-- One ACTIVE TableSession per physical table
CREATE UNIQUE INDEX "uq_single_active_session_per_table"
  ON public."table_sessions" ("tableId")
  WHERE ("status" = 'ACTIVE');

-- One ACTIVE transaction per TableSession
CREATE UNIQUE INDEX "uq_single_active_tx_per_session"
  ON public."transactions" ("sessionId")
  WHERE ("status" = 'ACTIVE');

-- One ACTIVE transaction per direct Order
CREATE UNIQUE INDEX "uq_single_active_tx_per_order"
  ON public."transactions" ("directOrderId")
  WHERE ("status" = 'ACTIVE');
