-- ============================================================================
-- Migration: 20261116081451_security_definer_hardening
-- Step: 1F-E1 Security Hardening — Dedicated Function Owner & Least Privilege
-- Database: PostgreSQL 16.15 | ORM: Prisma 6.19.3
-- Architecture: 16 Models, 12 Enums, Strict NO-REFUND Policy
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DEDICATED FUNCTION OWNER ROLE
-- ----------------------------------------------------------------------------
-- Create dedicated database role with no interactive login and zero elevated privileges
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'resto_owner') THEN
    CREATE ROLE resto_owner WITH
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOBYPASSRLS;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. LEAST-PRIVILEGE OBJECT GRANTS FOR resto_owner
-- ----------------------------------------------------------------------------
-- Schema access
GRANT USAGE ON SCHEMA public TO resto_owner;

-- Column-level SELECT on users (minimum required for cashier validation; excludes passwordHash)
GRANT SELECT (id, "restaurantId", "isActive") ON public."users" TO resto_owner;

-- Table-level SELECT and column-level UPDATE on transactions
GRANT SELECT ON public."transactions" TO resto_owner;
GRANT UPDATE ("amountPaid", "paymentStatus", status, "completedAt", "updatedAt")
  ON public."transactions" TO resto_owner;

-- Table-level SELECT and INSERT on payments (no UPDATE or DELETE privileges)
GRANT SELECT, INSERT ON public."payments" TO resto_owner;

-- ----------------------------------------------------------------------------
-- 3. FUNCTION OWNERSHIP TRANSFER & EXECUTE PERMISSIONS
-- ----------------------------------------------------------------------------
-- Transfer ownership of sp_collect_payment from superuser (postgres) to resto_owner
ALTER FUNCTION public.sp_collect_payment(
  uuid, uuid, numeric, numeric, character varying, character varying,
  numeric, numeric, numeric, numeric, "PaymentMethod", character varying,
  uuid, character varying
) OWNER TO resto_owner;

-- Ensure PUBLIC has no execution privileges
REVOKE ALL ON FUNCTION public.sp_collect_payment(
  uuid, uuid, numeric, numeric, character varying, character varying,
  numeric, numeric, numeric, numeric, "PaymentMethod", character varying,
  uuid, character varying
) FROM PUBLIC;

-- Grant EXECUTE exclusively to application role resto_app
GRANT EXECUTE ON FUNCTION public.sp_collect_payment(
  uuid, uuid, numeric, numeric, character varying, character varying,
  numeric, numeric, numeric, numeric, "PaymentMethod", character varying,
  uuid, character varying
) TO resto_app;
