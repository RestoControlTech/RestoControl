-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('ACTIVE', 'OFF_DUTY', 'ON_BREAK');

-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('AVAILABLE', 'BUSY', 'OCCUPIED', 'RESERVED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('QR', 'POS', 'ONLINE');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('DINE_IN', 'TAKEAWAY', 'DELIVERY');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderItemStatus" AS ENUM ('PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'KHQR', 'DIGITAL_WALLET');

-- CreateEnum
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'CORRECTED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateTable
CREATE TABLE "restaurants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "phoneNumber" VARCHAR(30),
    "email" VARCHAR(120),
    "address" TEXT,
    "logoUrl" VARCHAR(500),
    "logoPublicId" VARCHAR(120),
    "primaryCurrency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "secondaryCurrency" VARCHAR(3) DEFAULT 'KHR',
    "exchangeRate" DECIMAL(12,4) NOT NULL DEFAULT 4100.0000,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "serviceChargeRate" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "language" VARCHAR(5) NOT NULL DEFAULT 'en',
    "openingHours" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurantId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(30),
    "avatarUrl" VARCHAR(500),
    "avatarPublicId" VARCHAR(120),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurantId" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "displayName" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(60) NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    "restaurantId" UUID NOT NULL,
    "assignedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "staff_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "restaurantId" UUID NOT NULL,
    "employeeCode" VARCHAR(30) NOT NULL,
    "pinHash" VARCHAR(255),
    "shiftStatus" "ShiftStatus" NOT NULL DEFAULT 'OFF_DUTY',
    "hourlyRate" DECIMAL(10,2),
    "emergencyContact" VARCHAR(120),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurantId" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "icon" VARCHAR(50),
    "color" VARCHAR(20),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurantId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "costPrice" DECIMAL(10,2),
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "trackStock" BOOLEAN NOT NULL DEFAULT false,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" VARCHAR(500),
    "imagePublicId" VARCHAR(120),
    "prepTime" INTEGER DEFAULT 15,
    "kitchenStation" VARCHAR(50),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tables" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurantId" UUID NOT NULL,
    "legacyId" VARCHAR(50),
    "name" VARCHAR(50) NOT NULL,
    "section" VARCHAR(60) NOT NULL DEFAULT 'Main Dining',
    "seats" INTEGER NOT NULL DEFAULT 4,
    "status" "TableStatus" NOT NULL DEFAULT 'AVAILABLE',
    "qrCodeKey" VARCHAR(64) NOT NULL,
    "qrCodeUrl" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "lastActivityAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurantId" UUID NOT NULL,
    "tableId" UUID NOT NULL,
    "sessionNumber" VARCHAR(35) NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "covers" INTEGER NOT NULL DEFAULT 1,
    "openedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMPTZ(6),
    "openedById" UUID,
    "closedById" UUID,
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "serviceChargeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "table_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurantId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(30),
    "email" VARCHAR(120),
    "notes" TEXT,
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "lastVisitAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurantId" UUID NOT NULL,
    "sessionId" UUID,
    "customerId" UUID,
    "createdById" UUID,
    "orderNumber" VARCHAR(30) NOT NULL,
    "idempotencyKey" VARCHAR(64),
    "source" "OrderSource" NOT NULL DEFAULT 'POS',
    "orderType" "OrderType" NOT NULL DEFAULT 'DINE_IN',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "serviceChargeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "discountType" "DiscountType",
    "discountRate" DECIMAL(5,2),
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "notes" TEXT,
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orderId" UUID NOT NULL,
    "productId" UUID,
    "restaurantId" UUID NOT NULL,
    "productName" VARCHAR(150) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "unitCost" DECIMAL(10,2),
    "lineTotal" DECIMAL(10,2) NOT NULL,
    "instructions" VARCHAR(255),
    "status" "OrderItemStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurantId" UUID NOT NULL,
    "sessionId" UUID,
    "directOrderId" UUID,
    "customerId" UUID,
    "cashierId" UUID,
    "transactionNumber" VARCHAR(30) NOT NULL,
    "tableName" VARCHAR(50),
    "orderType" "OrderType" NOT NULL DEFAULT 'DINE_IN',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "serviceChargeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "discountType" "DiscountType",
    "discountRate" DECIMAL(5,2),
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "discountReason" VARCHAR(255),
    "grossAmount" DECIMAL(10,2) NOT NULL,
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "writeOffAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "isSplitPayment" BOOLEAN NOT NULL DEFAULT false,
    "paymentSummary" VARCHAR(150) NOT NULL DEFAULT '',
    "itemSummary" TEXT,
    "notes" TEXT,
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurantId" UUID NOT NULL,
    "transactionId" UUID NOT NULL,
    "processedById" UUID,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "amount" DECIMAL(10,2) NOT NULL,
    "tenderCurrency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "tenderAmount" DECIMAL(14,2) NOT NULL,
    "exchangeRate" DECIMAL(12,4) NOT NULL DEFAULT 1.0000,
    "cashReceived" DECIMAL(14,2),
    "changeGiven" DECIMAL(14,2),
    "roundingAdjustment" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "gatewayReference" VARCHAR(100),
    "idempotencyKey" VARCHAR(64),
    "failureReason" VARCHAR(255),
    "paidAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurantId" UUID,
    "userId" UUID,
    "action" VARCHAR(80) NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" UUID,
    "details" JSONB,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_slug_key" ON "restaurants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_restaurantId_isActive_idx" ON "users"("restaurantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "users_id_restaurantId_key" ON "users"("id", "restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_id_restaurantId_key" ON "roles"("id", "restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_restaurantId_name_key" ON "roles"("restaurantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "role_permissions_restaurantId_roleId_idx" ON "role_permissions"("restaurantId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_userId_key" ON "staff_profiles"("userId");

-- CreateIndex
CREATE INDEX "staff_profiles_restaurantId_shiftStatus_idx" ON "staff_profiles"("restaurantId", "shiftStatus");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_userId_restaurantId_key" ON "staff_profiles"("userId", "restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_id_restaurantId_key" ON "staff_profiles"("id", "restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_restaurantId_employeeCode_key" ON "staff_profiles"("restaurantId", "employeeCode");

-- CreateIndex
CREATE INDEX "categories_restaurantId_isActive_sortOrder_idx" ON "categories"("restaurantId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "categories_id_restaurantId_key" ON "categories"("id", "restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_restaurantId_name_key" ON "categories"("restaurantId", "name");

-- CreateIndex
CREATE INDEX "products_restaurantId_categoryId_isAvailable_idx" ON "products"("restaurantId", "categoryId", "isAvailable");

-- CreateIndex
CREATE INDEX "products_restaurantId_isPopular_idx" ON "products"("restaurantId", "isPopular");

-- CreateIndex
CREATE UNIQUE INDEX "products_id_restaurantId_key" ON "products"("id", "restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "tables_qrCodeKey_key" ON "tables"("qrCodeKey");

-- CreateIndex
CREATE INDEX "tables_restaurantId_status_idx" ON "tables"("restaurantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tables_id_restaurantId_key" ON "tables"("id", "restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "tables_restaurantId_name_key" ON "tables"("restaurantId", "name");

-- CreateIndex
CREATE INDEX "table_sessions_restaurantId_tableId_status_idx" ON "table_sessions"("restaurantId", "tableId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "table_sessions_id_restaurantId_key" ON "table_sessions"("id", "restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "table_sessions_restaurantId_sessionNumber_key" ON "table_sessions"("restaurantId", "sessionNumber");

-- CreateIndex
CREATE INDEX "customers_restaurantId_phone_idx" ON "customers"("restaurantId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "customers_id_restaurantId_key" ON "customers"("id", "restaurantId");

-- CreateIndex
CREATE INDEX "orders_restaurantId_status_idx" ON "orders"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "orders_restaurantId_sessionId_paymentStatus_idx" ON "orders"("restaurantId", "sessionId", "paymentStatus");

-- CreateIndex
CREATE INDEX "orders_restaurantId_createdAt_idx" ON "orders"("restaurantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "orders_id_restaurantId_key" ON "orders"("id", "restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_restaurantId_orderNumber_key" ON "orders"("restaurantId", "orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "orders_restaurantId_idempotencyKey_key" ON "orders"("restaurantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "order_items_orderId_restaurantId_idx" ON "order_items"("orderId", "restaurantId");

-- CreateIndex
CREATE INDEX "order_items_productId_restaurantId_idx" ON "order_items"("productId", "restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_id_restaurantId_key" ON "order_items"("id", "restaurantId");

-- CreateIndex
CREATE INDEX "transactions_sessionId_restaurantId_idx" ON "transactions"("sessionId", "restaurantId");

-- CreateIndex
CREATE INDEX "transactions_directOrderId_restaurantId_idx" ON "transactions"("directOrderId", "restaurantId");

-- CreateIndex
CREATE INDEX "transactions_restaurantId_status_idx" ON "transactions"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "transactions_restaurantId_paymentStatus_idx" ON "transactions"("restaurantId", "paymentStatus");

-- CreateIndex
CREATE INDEX "transactions_restaurantId_completedAt_idx" ON "transactions"("restaurantId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_id_restaurantId_key" ON "transactions"("id", "restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_restaurantId_transactionNumber_key" ON "transactions"("restaurantId", "transactionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotencyKey_key" ON "payments"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payments_restaurantId_transactionId_idx" ON "payments"("restaurantId", "transactionId");

-- CreateIndex
CREATE INDEX "payments_restaurantId_method_status_idx" ON "payments"("restaurantId", "method", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_id_restaurantId_key" ON "payments"("id", "restaurantId");

-- CreateIndex
CREATE INDEX "audit_logs_restaurantId_entityType_entityId_idx" ON "audit_logs"("restaurantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_restaurantId_createdAt_idx" ON "audit_logs"("restaurantId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_restaurantId_fkey" FOREIGN KEY ("roleId", "restaurantId") REFERENCES "roles"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_restaurantId_fkey" FOREIGN KEY ("roleId", "restaurantId") REFERENCES "roles"("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_userId_restaurantId_fkey" FOREIGN KEY ("userId", "restaurantId") REFERENCES "users"("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_restaurantId_fkey" FOREIGN KEY ("categoryId", "restaurantId") REFERENCES "categories"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_tableId_restaurantId_fkey" FOREIGN KEY ("tableId", "restaurantId") REFERENCES "tables"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_openedById_restaurantId_fkey" FOREIGN KEY ("openedById", "restaurantId") REFERENCES "users"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_closedById_restaurantId_fkey" FOREIGN KEY ("closedById", "restaurantId") REFERENCES "users"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_sessionId_restaurantId_fkey" FOREIGN KEY ("sessionId", "restaurantId") REFERENCES "table_sessions"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_restaurantId_fkey" FOREIGN KEY ("customerId", "restaurantId") REFERENCES "customers"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_createdById_restaurantId_fkey" FOREIGN KEY ("createdById", "restaurantId") REFERENCES "users"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_restaurantId_fkey" FOREIGN KEY ("orderId", "restaurantId") REFERENCES "orders"("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_restaurantId_fkey" FOREIGN KEY ("productId", "restaurantId") REFERENCES "products"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_sessionId_restaurantId_fkey" FOREIGN KEY ("sessionId", "restaurantId") REFERENCES "table_sessions"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_directOrderId_restaurantId_fkey" FOREIGN KEY ("directOrderId", "restaurantId") REFERENCES "orders"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_customerId_restaurantId_fkey" FOREIGN KEY ("customerId", "restaurantId") REFERENCES "customers"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_cashierId_restaurantId_fkey" FOREIGN KEY ("cashierId", "restaurantId") REFERENCES "users"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_transactionId_restaurantId_fkey" FOREIGN KEY ("transactionId", "restaurantId") REFERENCES "transactions"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_processedById_restaurantId_fkey" FOREIGN KEY ("processedById", "restaurantId") REFERENCES "users"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_restaurantId_fkey" FOREIGN KEY ("userId", "restaurantId") REFERENCES "users"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;
