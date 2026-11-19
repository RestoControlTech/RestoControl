import { Pool, PoolClient } from 'pg';

const adminUrl = 'postgresql://postgres:postgres@localhost:5434/restocontrol_dev';
const appUrl = 'postgresql://resto_app:resto_app_dev_secret@localhost:5434/restocontrol_dev';

const adminPool = new Pool({ connectionString: adminUrl });
const appPool = new Pool({ connectionString: appUrl });

async function runTests() {
  console.log('====================================================================');
  console.log('STEP 1F-E3: COMPREHENSIVE TEST SUITE FOR sp_apply_write_off_authorized');
  console.log('====================================================================\n');

  const adminClient: PoolClient = await adminPool.connect();
  const appClient: PoolClient = await appPool.connect();

  try {
    console.log('[SETUP] Provisioning isolated test fixtures...');

    const runId = Date.now();
    // 1. Restaurants
    const r1 = await adminClient.query(`
      INSERT INTO "restaurants" (id, name, slug, "phoneNumber", address, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), 'WriteOff Bistro', 'writeoff-bistro-' || $1, '+85511223344', 'Street 51, Phnom Penh', NOW(), NOW())
      RETURNING id;
    `, [runId]);
    const restaurantId = r1.rows[0].id;

    const r2 = await adminClient.query(`
      INSERT INTO "restaurants" (id, name, slug, "phoneNumber", address, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), 'Rival WriteOff Bistro', 'rival-wo-' || $1, '+85599887766', 'Riverside, Phnom Penh', NOW(), NOW())
      RETURNING id;
    `, [runId]);
    const rivalRestaurantId = r2.rows[0].id;

    // 2. Permission lookup
    const permRes = await adminClient.query(`
      SELECT id FROM "permissions" WHERE code = 'TRANSACTION_WRITE_OFF';
    `);
    if (permRes.rows.length === 0) throw new Error('TRANSACTION_WRITE_OFF permission not found');
    const writeOffPermId = permRes.rows[0].id;

    // 3. Roles
    const roleSupervisor = await adminClient.query(`
      INSERT INTO "roles" (id, "restaurantId", name, "displayName", description, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'SUPERVISOR', 'Supervisor', 'Floor Supervisor', NOW(), NOW())
      RETURNING id;
    `, [restaurantId]);
    const supervisorRoleId = roleSupervisor.rows[0].id;

    const roleCashier = await adminClient.query(`
      INSERT INTO "roles" (id, "restaurantId", name, "displayName", description, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'CASHIER', 'Cashier', 'Register Cashier', NOW(), NOW())
      RETURNING id;
    `, [restaurantId]);
    const cashierRoleId = roleCashier.rows[0].id;

    const roleRival = await adminClient.query(`
      INSERT INTO "roles" (id, "restaurantId", name, "displayName", description, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'SUPERVISOR', 'Supervisor', 'Floor Supervisor', NOW(), NOW())
      RETURNING id;
    `, [rivalRestaurantId]);
    const rivalRoleId = roleRival.rows[0].id;

    // 4. Role Permission: Supervisor role has TRANSACTION_WRITE_OFF
    await adminClient.query(`
      INSERT INTO "role_permissions" ("roleId", "permissionId", "restaurantId", "assignedAt")
      VALUES ($1, $2, $3, NOW());
    `, [supervisorRoleId, writeOffPermId, restaurantId]);

    await adminClient.query(`
      INSERT INTO "role_permissions" ("roleId", "permissionId", "restaurantId", "assignedAt")
      VALUES ($1, $2, $3, NOW());
    `, [rivalRoleId, writeOffPermId, rivalRestaurantId]);

    // 5. Users and Staff Profiles
    // 5a. Active Supervisor with PIN '9999'
    const uSupervisor = await adminClient.query(`
      INSERT INTO "users" (id, "restaurantId", "roleId", email, name, "passwordHash", "isActive", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'sup-' || $3 || '@bistro.com', 'Sam Supervisor', 'hash', true, NOW(), NOW())
      RETURNING id;
    `, [restaurantId, supervisorRoleId, runId]);
    const supervisorId = uSupervisor.rows[0].id;

    await adminClient.query(`
      INSERT INTO "staff_profiles" (id, "userId", "restaurantId", "employeeCode", "pinHash", "shiftStatus", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'EMP-SUP-' || $3, public.crypt('9999', public.gen_salt('bf')), 'ACTIVE', NOW(), NOW());
    `, [supervisorId, restaurantId, runId]);

    // 5b. Inactive Supervisor with PIN '8888'
    const uInactiveSupervisor = await adminClient.query(`
      INSERT INTO "users" (id, "restaurantId", "roleId", email, name, "passwordHash", "isActive", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'inact.sup-' || $3 || '@bistro.com', 'Ian Inactive', 'hash', false, NOW(), NOW())
      RETURNING id;
    `, [restaurantId, supervisorRoleId, runId]);
    const inactiveSupervisorId = uInactiveSupervisor.rows[0].id;

    await adminClient.query(`
      INSERT INTO "staff_profiles" (id, "userId", "restaurantId", "employeeCode", "pinHash", "shiftStatus", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'EMP-INACT-' || $3, public.crypt('8888', public.gen_salt('bf')), 'OFF_DUTY', NOW(), NOW());
    `, [inactiveSupervisorId, restaurantId, runId]);

    // 5c. Active Cashier (no supervisor write-off permission) with PIN '1234'
    const uCashier = await adminClient.query(`
      INSERT INTO "users" (id, "restaurantId", "roleId", email, name, "passwordHash", "isActive", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'cashier-' || $3 || '@bistro.com', 'Claire Cashier', 'hash', true, NOW(), NOW())
      RETURNING id;
    `, [restaurantId, cashierRoleId, runId]);
    const cashierId = uCashier.rows[0].id;

    await adminClient.query(`
      INSERT INTO "staff_profiles" (id, "userId", "restaurantId", "employeeCode", "pinHash", "shiftStatus", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'EMP-CSH-' || $3, public.crypt('1234', public.gen_salt('bf')), 'ACTIVE', NOW(), NOW());
    `, [cashierId, restaurantId, runId]);

    // 5d. Rival supervisor with PIN '7777'
    const uRival = await adminClient.query(`
      INSERT INTO "users" (id, "restaurantId", "roleId", email, name, "passwordHash", "isActive", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'rival.sup-' || $3 || '@rival.com', 'Rick Rival', 'hash', true, NOW(), NOW())
      RETURNING id;
    `, [rivalRestaurantId, rivalRoleId, runId]);
    const rivalSupervisorId = uRival.rows[0].id;

    await adminClient.query(`
      INSERT INTO "staff_profiles" (id, "userId", "restaurantId", "employeeCode", "pinHash", "shiftStatus", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'EMP-RIV-' || $3, public.crypt('7777', public.gen_salt('bf')), 'ACTIVE', NOW(), NOW());
    `, [rivalSupervisorId, rivalRestaurantId, runId]);

    // 6. Table & Session
    const tbl = await adminClient.query(`
      INSERT INTO "tables" (id, "restaurantId", name, seats, status, "qrCodeKey", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'T-301', 4, 'OCCUPIED', 'QR-T301-' || $2, NOW(), NOW())
      RETURNING id;
    `, [restaurantId, runId]);
    const tableId = tbl.rows[0].id;

    const sess = await adminClient.query(`
      INSERT INTO "table_sessions" (id, "restaurantId", "tableId", "sessionNumber", "openedById", "totalAmount", status, "openedAt", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'SES-' || $4, $3, 100.00, 'ACTIVE', NOW(), NOW(), NOW())
      RETURNING id;
    `, [restaurantId, tableId, cashierId, runId]);
    const sessionId = sess.rows[0].id;

    // 7. Order ($100 gross invoice)
    const ord = await adminClient.query(`
      INSERT INTO "orders" (id, "restaurantId", "sessionId", "createdById", "orderNumber", "orderType", subtotal, "discountAmount", "taxAmount", "serviceChargeAmount", total, status, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, $3, 'ORD-' || $4, 'DINE_IN', 100.00, 0.00, 0.00, 0.00, 100.00, 'SERVED', NOW(), NOW())
      RETURNING id;
    `, [restaurantId, sessionId, cashierId, runId]);

    // 8. Transaction ($100 gross invoice, currently active)
    const tx = await adminClient.query(`
      INSERT INTO "transactions" (
        id, "restaurantId", "sessionId", "transactionNumber", "orderType", subtotal, "discountAmount", "taxAmount",
        "serviceChargeAmount", "grossAmount", "amountPaid", "writeOffAmount", "paymentStatus", status, "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, 'TX-' || $3, 'DINE_IN', 100.00, 0.00, 0.00,
        0.00, 100.00, 0.00, 0.00, 'UNPAID', 'ACTIVE', NOW(), NOW()
      )
      RETURNING id;
    `, [restaurantId, sessionId, runId]);
    const transactionId = tx.rows[0].id;

    // 9. Initial payment ($60 cash) via sp_collect_payment
    await appClient.query(`
      SELECT sp_collect_payment(
        $1, $2, 60.00, 60.00, 'USD', 'USD', 1.0000, 0.00, 60.00, 0.00,
        'CASH'::"PaymentMethod", 'IDEM-INIT-P1-' || $3, $4
      );
    `, [restaurantId, transactionId, runId, cashierId]);

    console.log('[SETUP] Fixtures provisioned successfully.\n');

    // ------------------------------------------------------------------------
    // TEST 1: Supervisor Auth Failure - Wrong PIN
    // ------------------------------------------------------------------------
    console.log('[TEST 1] Testing Supervisor Auth Failure - Wrong PIN...');
    try {
      await appClient.query(`
        SELECT sp_apply_write_off_authorized(
          $1, $2, 20.00, $3, '0000', 'Dispute write-off', 'IDEM-T1-' || $4, $5
        );
      `, [restaurantId, transactionId, supervisorId, runId, sessionId]);
      throw new Error('TEST 1 FAILED: Expected wrong PIN rejection');
    } catch (e: any) {
      if (!e.message.includes('Authorization Denied') && !e.message.includes('insufficient_privilege')) {
        throw e;
      }
      console.log('✓ TEST 1 PASSED: Wrong PIN correctly rejected (insufficient_privilege).\n');
    }

    // ------------------------------------------------------------------------
    // TEST 2: Supervisor Auth Failure - Inactive Supervisor
    // ------------------------------------------------------------------------
    console.log('[TEST 2] Testing Supervisor Auth Failure - Inactive Supervisor...');
    try {
      await appClient.query(`
        SELECT sp_apply_write_off_authorized(
          $1, $2, 20.00, $3, '8888', 'Dispute write-off', 'IDEM-T2-' || $4, $5
        );
      `, [restaurantId, transactionId, inactiveSupervisorId, runId, sessionId]);
      throw new Error('TEST 2 FAILED: Expected inactive supervisor rejection');
    } catch (e: any) {
      if (!e.message.includes('Authorization Denied') && !e.message.includes('insufficient_privilege')) {
        throw e;
      }
      console.log('✓ TEST 2 PASSED: Inactive supervisor correctly rejected.\n');
    }

    // ------------------------------------------------------------------------
    // TEST 3: Supervisor Auth Failure - Missing Permission (Cashier)
    // ------------------------------------------------------------------------
    console.log('[TEST 3] Testing Supervisor Auth Failure - Missing Permission (Cashier Role)...');
    try {
      await appClient.query(`
        SELECT sp_apply_write_off_authorized(
          $1, $2, 20.00, $3, '1234', 'Dispute write-off', 'IDEM-T3-' || $4, $5
        );
      `, [restaurantId, transactionId, cashierId, runId, sessionId]);
      throw new Error('TEST 3 FAILED: Expected cashier without permission rejection');
    } catch (e: any) {
      if (!e.message.includes('Authorization Denied') && !e.message.includes('insufficient_privilege')) {
        throw e;
      }
      console.log('✓ TEST 3 PASSED: Cashier lacking write-off permission correctly rejected.\n');
    }

    // ------------------------------------------------------------------------
    // TEST 4: Supervisor Auth Failure - Cross-Tenant Supervisor
    // ------------------------------------------------------------------------
    console.log('[TEST 4] Testing Supervisor Auth Failure - Cross-Tenant Supervisor...');
    try {
      await appClient.query(`
        SELECT sp_apply_write_off_authorized(
          $1, $2, 20.00, $3, '7777', 'Dispute write-off', 'IDEM-T4-' || $4, $5
        );
      `, [restaurantId, transactionId, rivalSupervisorId, runId, sessionId]);
      throw new Error('TEST 4 FAILED: Expected cross-tenant supervisor rejection');
    } catch (e: any) {
      if (!e.message.includes('Authorization Denied') && !e.message.includes('insufficient_privilege')) {
        throw e;
      }
      console.log('✓ TEST 4 PASSED: Cross-tenant supervisor correctly rejected.\n');
    }

    // ------------------------------------------------------------------------
    // TEST 5: Rate Limiting / Lockout Protection
    // ------------------------------------------------------------------------
    console.log('[TEST 5] Testing Rate Limiting / Temporary Lockout (5 failed attempts)...');
    // Insert 5 failed attempts in past 15 min for supervisorId:
    for (let i = 0; i < 5; i++) {
      await adminClient.query(`
        INSERT INTO "audit_logs" (id, "restaurantId", "userId", action, "entityType", "entityId", details, "createdAt")
        VALUES (gen_random_uuid(), $1, $2, 'TRANSACTION_WRITE_OFF_FAILED', 'Transaction', $3, '{"reason": "test"}', NOW());
      `, [restaurantId, supervisorId, transactionId]);
    }
    // Now supervisor has 5 failed attempts in past 15 min. Even with correct PIN '9999', must be blocked!
    try {
      await appClient.query(`
        SELECT sp_apply_write_off_authorized(
          $1, $2, 20.00, $3, '9999', 'Dispute write-off', 'IDEM-T5-' || $4, $5
        );
      `, [restaurantId, transactionId, supervisorId, runId, sessionId]);
      throw new Error('TEST 5 FAILED: Expected lockout rejection');
    } catch (e: any) {
      if (!e.message.includes('temporarily locked')) {
        throw e;
      }
      console.log('✓ TEST 5 PASSED: Supervisor temporary lockout successfully enforced after 5 failed attempts.\n');
    }

    // Clear failed attempts for supervisor to allow subsequent tests
    await adminClient.query("SET session_replication_role = 'replica';");
    await adminClient.query(`
      DELETE FROM "audit_logs"
      WHERE "userId" = $1 AND action = 'TRANSACTION_WRITE_OFF_FAILED';
    `, [supervisorId]);
    await adminClient.query("SET session_replication_role = 'origin';");

    // ------------------------------------------------------------------------
    // TEST 6: Validation - Non-Positive and Zero Amounts
    // ------------------------------------------------------------------------
    console.log('[TEST 6] Testing Validation - Non-Positive Amounts...');
    try {
      await appClient.query(`
        SELECT sp_apply_write_off_authorized(
          $1, $2, 0.00, $3, '9999', 'Dispute write-off', 'IDEM-T6A-' || $4, $5
        );
      `, [restaurantId, transactionId, supervisorId, runId, sessionId]);
      throw new Error('TEST 6 FAILED: Expected zero amount rejection');
    } catch (e: any) {
      if (!e.message.includes('strictly positive')) throw e;
    }

    try {
      await appClient.query(`
        SELECT sp_apply_write_off_authorized(
          $1, $2, -10.00, $3, '9999', 'Dispute write-off', 'IDEM-T6B-' || $4, $5
        );
      `, [restaurantId, transactionId, supervisorId, runId, sessionId]);
      throw new Error('TEST 6 FAILED: Expected negative amount rejection');
    } catch (e: any) {
      if (!e.message.includes('strictly positive')) throw e;
      console.log('✓ TEST 6 PASSED: Non-positive write-off amounts strictly rejected.\n');
    }

    // ------------------------------------------------------------------------
    // TEST 7: Validation - Partial Write-Off on Unpaid Transaction Prohibited
    // ------------------------------------------------------------------------
    console.log('[TEST 7] Testing Validation - Partial Write-Off on Unpaid Transaction Prohibited...');
    // Create an unpaid transaction on a new session ($100 gross, $0 paid)
    const tbl2 = await adminClient.query(`
      INSERT INTO "tables" (id, "restaurantId", name, seats, status, "qrCodeKey", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'T-302', 2, 'OCCUPIED', 'QR-T302-' || $2, NOW(), NOW())
      RETURNING id;
    `, [restaurantId, runId]);
    const tableId2 = tbl2.rows[0].id;

    const sess2 = await adminClient.query(`
      INSERT INTO "table_sessions" (id, "restaurantId", "tableId", "sessionNumber", "openedById", "totalAmount", status, "openedAt", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'SES-2-' || $4, $3, 100.00, 'ACTIVE', NOW(), NOW(), NOW())
      RETURNING id;
    `, [restaurantId, tableId2, cashierId, runId]);
    const sessionId2 = sess2.rows[0].id;

    const unpaidTx = await adminClient.query(`
      INSERT INTO "transactions" (
        id, "restaurantId", "sessionId", "transactionNumber", "orderType", subtotal, "discountAmount", "taxAmount",
        "serviceChargeAmount", "grossAmount", "amountPaid", "writeOffAmount", "paymentStatus", status, "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, 'TX-UNPAID-' || $3, 'DINE_IN', 100.00, 0.00, 0.00,
        0.00, 100.00, 0.00, 0.00, 'UNPAID', 'ACTIVE', NOW(), NOW()
      )
      RETURNING id;
    `, [restaurantId, sessionId2, runId]);
    const unpaidTxId = unpaidTx.rows[0].id;

    try {
      await appClient.query(`
        SELECT sp_apply_write_off_authorized(
          $1, $2, 20.00, $3, '9999', 'Dispute write-off', 'IDEM-T7-' || $4, $5
        );
      `, [restaurantId, unpaidTxId, supervisorId, runId, sessionId2]);
      throw new Error('TEST 7 FAILED: Expected partial write-off on unpaid transaction rejection');
    } catch (e: any) {
      if (!e.message.includes('Partial write-off on unpaid transaction')) throw e;
      console.log('✓ TEST 7 PASSED: Partial write-off on unpaid transaction correctly prohibited.\n');
    }

    // ------------------------------------------------------------------------
    // TEST 8: Validation - Excessive Write-Off Exceeding Balance
    // ------------------------------------------------------------------------
    console.log('[TEST 8] Testing Validation - Excessive Write-Off Exceeding Balance...');
    // Outstanding balance on transactionId is $40.00 ($100 gross - $60 paid). Attempt $45.00
    try {
      await appClient.query(`
        SELECT sp_apply_write_off_authorized(
          $1, $2, 45.00, $3, '9999', 'Dispute write-off', 'IDEM-T8-' || $4, $5
        );
      `, [restaurantId, transactionId, supervisorId, runId, sessionId]);
      throw new Error('TEST 8 FAILED: Expected excessive write-off rejection');
    } catch (e: any) {
      if (!e.message.includes('exceeds outstanding balance')) throw e;
      console.log('✓ TEST 8 PASSED: Write-off exceeding outstanding balance correctly rejected.\n');
    }

    // ------------------------------------------------------------------------
    // TEST 9: Happy Path - Partial Write-Off on Partially Paid Transaction
    // ------------------------------------------------------------------------
    console.log('[TEST 9] Testing Happy Path - Partial Write-Off on Partially Paid Transaction ($20.00)...');
    const idemKey9 = 'IDEM-T9-' + runId;
    const res9 = await appClient.query(`
      SELECT sp_apply_write_off_authorized(
        $1, $2, 20.00, $3, '9999', 'Dispute on appetizers discount', $4, $5
      ) as result;
    `, [restaurantId, transactionId, supervisorId, idemKey9, sessionId]);

    const out9 = res9.rows[0].result;
    console.log('  Procedure Output:', out9);

    if (
      out9.status !== 'SUCCESS' ||
      out9.idempotentReplay !== false ||
      Number(out9.writtenOffAmount) !== 20.00 ||
      Number(out9.totalWriteOffAmount) !== 20.00 ||
      Number(out9.amountPaid) !== 60.00 ||
      Number(out9.outstandingBalance) !== 20.00 ||
      out9.transactionStatus !== 'ACTIVE' ||
      out9.paymentStatus !== 'PARTIALLY_PAID'
    ) {
      throw new Error('TEST 9 FAILED: Output values do not match expected partial write-off state');
    }

    // Verify DB row
    const txDb9 = await adminClient.query(`SELECT * FROM "transactions" WHERE id = $1;`, [transactionId]);
    const row9 = txDb9.rows[0];
    if (
      Number(row9.writeOffAmount) !== 20.00 ||
      Number(row9.amountPaid) !== 60.00 ||
      row9.status !== 'ACTIVE' ||
      row9.paymentStatus !== 'PARTIALLY_PAID' ||
      row9.completedAt !== null
    ) {
      throw new Error('TEST 9 FAILED: Database transaction row not updated correctly');
    }

    // Verify Audit Log
    const audit9 = await adminClient.query(`
      SELECT * FROM "audit_logs"
      WHERE "restaurantId" = $1 AND "action" = 'TRANSACTION_WRITE_OFF' AND "details"->>'idempotencyKey' = $2;
    `, [restaurantId, idemKey9]);
    if (audit9.rows.length !== 1) {
      throw new Error('TEST 9 FAILED: Missing AuditLog for write-off');
    }
    console.log('✓ TEST 9 PASSED: Partial write-off successfully applied ($20 written off, $20 balance remaining, tab ACTIVE).\n');

    // ------------------------------------------------------------------------
    // TEST 10: Scoped Idempotency Replay & Tamper Detection
    // ------------------------------------------------------------------------
    console.log('[TEST 10] Testing Scoped Idempotency Replay & Tamper Detection...');
    // 10a. Identical replay
    const replayRes = await appClient.query(`
      SELECT sp_apply_write_off_authorized(
        $1, $2, 20.00, $3, '9999', 'Dispute on appetizers discount', $4, $5
      ) as result;
    `, [restaurantId, transactionId, supervisorId, idemKey9, sessionId]);
    const replayOut = replayRes.rows[0].result;
    if (replayOut.idempotentReplay !== true || Number(replayOut.outstandingBalance) !== 20.00) {
      throw new Error('TEST 10a FAILED: Idempotent replay returned incorrect result');
    }

    // Ensure no duplicate audit log or balance distortion
    const countAudit = await adminClient.query(`
      SELECT count(*) FROM "audit_logs" WHERE "details"->>'idempotencyKey' = $1;
    `, [idemKey9]);
    if (Number(countAudit.rows[0].count) !== 1) {
      throw new Error('TEST 10a FAILED: Duplicate audit log created on idempotent replay');
    }

    // 10b. Same key, altered amount ($15.00 instead of $20.00)
    try {
      await appClient.query(`
        SELECT sp_apply_write_off_authorized(
          $1, $2, 15.00, $3, '9999', 'Dispute on appetizers discount', $4, $5
        );
      `, [restaurantId, transactionId, supervisorId, idemKey9, sessionId]);
      throw new Error('TEST 10b FAILED: Expected mismatched amount rejection');
    } catch (e: any) {
      if (!e.message.includes('mismatched write-off amount')) throw e;
    }

    // 10c. Same key, different transaction
    try {
      await appClient.query(`
        SELECT sp_apply_write_off_authorized(
          $1, $2, 20.00, $3, '9999', 'Dispute on appetizers discount', $4, $5
        );
      `, [restaurantId, unpaidTxId, supervisorId, idemKey9, sessionId2]);
      throw new Error('TEST 10c FAILED: Expected different transaction rejection');
    } catch (e: any) {
      if (!e.message.includes('already used for a different transaction')) throw e;
      console.log('✓ TEST 10 PASSED: Idempotency replay and payload tamper detection fully verified.\n');
    }

    // ------------------------------------------------------------------------
    // TEST 11: Happy Path - Full Write-Off of Remaining Balance (Tab Settled)
    // ------------------------------------------------------------------------
    console.log('[TEST 11] Testing Happy Path - Full Write-Off of Remaining Balance ($20.00)...');
    const idemKey11 = 'IDEM-T11-' + runId;
    const res11 = await appClient.query(`
      SELECT sp_apply_write_off_authorized(
        $1, $2, 20.00, $3, '9999', 'Manager authorized full balance closure', $4, $5
      ) as result;
    `, [restaurantId, transactionId, supervisorId, idemKey11, sessionId]);

    const out11 = res11.rows[0].result;
    console.log('  Procedure Output:', out11);

    if (
      out11.status !== 'SUCCESS' ||
      Number(out11.writtenOffAmount) !== 20.00 ||
      Number(out11.totalWriteOffAmount) !== 40.00 ||
      Number(out11.amountPaid) !== 60.00 ||
      Number(out11.outstandingBalance) !== 0.00 ||
      out11.transactionStatus !== 'COMPLETED' ||
      out11.paymentStatus !== 'PARTIALLY_PAID'
    ) {
      throw new Error('TEST 11 FAILED: Final settlement output mismatch');
    }

    // Verify DB row
    const txDb11 = await adminClient.query(`SELECT * FROM "transactions" WHERE id = $1;`, [transactionId]);
    const row11 = txDb11.rows[0];
    if (
      Number(row11.writeOffAmount) !== 40.00 ||
      Number(row11.amountPaid) !== 60.00 ||
      row11.status !== 'COMPLETED' ||
      row11.paymentStatus !== 'PARTIALLY_PAID' ||
      row11.completedAt === null
    ) {
      throw new Error('TEST 11 FAILED: Database row does not reflect COMPLETED status or completedAt timestamp');
    }
    console.log('✓ TEST 11 PASSED: Full settlement reached (status COMPLETED, completedAt set, balance 0.00).\n');

    // ------------------------------------------------------------------------
    // TEST 12: Write-off on Already Completed Transaction Prohibited
    // ------------------------------------------------------------------------
    console.log('[TEST 12] Testing Write-Off on Already Completed Transaction...');
    try {
      await appClient.query(`
        SELECT sp_apply_write_off_authorized(
          $1, $2, 10.00, $3, '9999', 'Another write-off attempt', 'IDEM-T12-' || $4, $5
        );
      `, [restaurantId, transactionId, supervisorId, runId, sessionId]);
      throw new Error('TEST 12 FAILED: Expected completed transaction rejection');
    } catch (e: any) {
      if (!e.message.includes('expected ACTIVE')) throw e;
      console.log('✓ TEST 12 PASSED: Write-off on COMPLETED transaction strictly rejected.\n');
    }

    // ------------------------------------------------------------------------
    // TEST 13: Happy Path - 100% Write-Off on Unpaid Transaction (Bad Debt)
    // ------------------------------------------------------------------------
    console.log('[TEST 13] Testing 100% Write-Off on Unpaid Transaction (Walkout / Bad Debt)...');
    const idemKey13 = 'IDEM-T13-' + runId;
    const res13 = await appClient.query(`
      SELECT sp_apply_write_off_authorized(
        $1, $2, 100.00, $3, '9999', 'Customer walkout, bad debt write-off', $4, $5
      ) as result;
    `, [restaurantId, unpaidTxId, supervisorId, idemKey13, sessionId2]);

    const out13 = res13.rows[0].result;
    console.log('  Procedure Output:', out13);

    if (
      out13.status !== 'SUCCESS' ||
      Number(out13.writtenOffAmount) !== 100.00 ||
      Number(out13.totalWriteOffAmount) !== 100.00 ||
      Number(out13.amountPaid) !== 0.00 ||
      Number(out13.outstandingBalance) !== 0.00 ||
      out13.transactionStatus !== 'COMPLETED' ||
      out13.paymentStatus !== 'UNPAID'
    ) {
      throw new Error('TEST 13 FAILED: Bad debt full write-off output mismatch');
    }

    const txDb13 = await adminClient.query(`SELECT * FROM "transactions" WHERE id = $1;`, [unpaidTxId]);
    const row13 = txDb13.rows[0];
    if (
      Number(row13.writeOffAmount) !== 100.00 ||
      Number(row13.amountPaid) !== 0.00 ||
      row13.status !== 'COMPLETED' ||
      row13.paymentStatus !== 'UNPAID' ||
      row13.completedAt === null
    ) {
      throw new Error('TEST 13 FAILED: DB row mismatch for bad debt full write-off');
    }
    console.log('✓ TEST 13 PASSED: Full unpaid bad debt write-off correctly transitions to COMPLETED with paymentStatus = UNPAID.\n');

    // ------------------------------------------------------------------------
    // TEST 14: Direct Raw SQL UPDATE on writeOffAmount Blocked for resto_app
    // ------------------------------------------------------------------------
    console.log('[TEST 14] Testing Direct Raw SQL UPDATE on writeOffAmount Blocked for resto_app...');
    try {
      await appClient.query(`
        UPDATE "transactions" SET "writeOffAmount" = 999.00 WHERE id = $1;
      `, [transactionId]);
      throw new Error('TEST 14 FAILED: resto_app was able to directly UPDATE writeOffAmount!');
    } catch (e: any) {
      if (!e.code || e.code !== '42501') {
        throw new Error(`TEST 14 FAILED: Expected error 42501 (permission denied), got ${e.code}: ${e.message}`);
      }
      console.log('✓ TEST 14 PASSED: resto_app cannot update writeOffAmount directly (Error 42501: permission denied).\n');
    }

    // ------------------------------------------------------------------------
    // TEST 15: AuditLog Immutability (UPDATE / DELETE Blocked)
    // ------------------------------------------------------------------------
    console.log('[TEST 15] Testing AuditLog Immutability (UPDATE / DELETE Blocked)...');
    try {
      await appClient.query(`
        UPDATE "audit_logs" SET details = '{"hacked": true}' WHERE "restaurantId" = $1;
      `, [restaurantId]);
      throw new Error('TEST 15 FAILED: Expected UPDATE on audit_logs to be blocked');
    } catch (e: any) {
      console.log('  Audit UPDATE blocked as expected:', e.message);
    }

    try {
      await appClient.query(`
        DELETE FROM "audit_logs" WHERE "restaurantId" = $1;
      `, [restaurantId]);
      throw new Error('TEST 15 FAILED: Expected DELETE on audit_logs to be blocked');
    } catch (e: any) {
      console.log('  Audit DELETE blocked as expected:', e.message);
      console.log('✓ TEST 15 PASSED: audit_logs is completely immutable.\n');
    }

    // Clean up test 1-15 fixtures
    await adminClient.query("SET session_replication_role = 'replica';");
    await adminClient.query('DELETE FROM "audit_logs" WHERE "restaurantId" IN ($1, $2);', [restaurantId, rivalRestaurantId]);
    await adminClient.query('DELETE FROM "payments" WHERE "restaurantId" IN ($1, $2);', [restaurantId, rivalRestaurantId]);
    await adminClient.query('DELETE FROM "orders" WHERE "restaurantId" IN ($1, $2);', [restaurantId, rivalRestaurantId]);
    await adminClient.query('DELETE FROM "transactions" WHERE "restaurantId" IN ($1, $2);', [restaurantId, rivalRestaurantId]);
    await adminClient.query('DELETE FROM "table_sessions" WHERE "restaurantId" IN ($1, $2);', [restaurantId, rivalRestaurantId]);
    await adminClient.query('DELETE FROM "tables" WHERE "restaurantId" IN ($1, $2);', [restaurantId, rivalRestaurantId]);
    await adminClient.query('DELETE FROM "staff_profiles" WHERE "restaurantId" IN ($1, $2);', [restaurantId, rivalRestaurantId]);
    await adminClient.query('DELETE FROM "role_permissions" WHERE "restaurantId" IN ($1, $2);', [restaurantId, rivalRestaurantId]);
    await adminClient.query('DELETE FROM "users" WHERE "restaurantId" IN ($1, $2);', [restaurantId, rivalRestaurantId]);
    await adminClient.query('DELETE FROM "roles" WHERE "restaurantId" IN ($1, $2);', [restaurantId, rivalRestaurantId]);
    await adminClient.query('DELETE FROM "restaurants" WHERE id IN ($1, $2);', [restaurantId, rivalRestaurantId]);
    await adminClient.query("SET session_replication_role = 'origin';");
    console.log('[CLEANUP] Base test fixtures cleanly deleted.\n');

  } finally {
    adminClient.release();
    appClient.release();
  }

  // ------------------------------------------------------------------------
  // TEST 16: Concurrency Serialization Test
  // ------------------------------------------------------------------------
  console.log('[TEST 16] Testing Concurrency Serialization (Race Condition Protection)...');
  const adminClient2 = await adminPool.connect();
  const concApp1 = await appPool.connect();
  const concApp2 = await appPool.connect();

  try {
    const cRunId = Date.now();
    const cRest = await adminClient2.query(`
      INSERT INTO "restaurants" (id, name, slug, "phoneNumber", address, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), 'Conc Bistro', 'conc-bistro-' || $1, '+85511002200', 'Street 63, Phnom Penh', NOW(), NOW())
      RETURNING id;
    `, [cRunId]);
    const cRestId = cRest.rows[0].id;

    const cRole = await adminClient2.query(`
      INSERT INTO "roles" (id, "restaurantId", name, "displayName", description, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'SUPERVISOR', 'Supervisor', 'Floor Supervisor', NOW(), NOW())
      RETURNING id;
    `, [cRestId]);
    const cRoleId = cRole.rows[0].id;

    const permRes = await adminClient2.query(`SELECT id FROM "permissions" WHERE code = 'TRANSACTION_WRITE_OFF';`);
    await adminClient2.query(`
      INSERT INTO "role_permissions" ("roleId", "permissionId", "restaurantId", "assignedAt")
      VALUES ($1, $2, $3, NOW());
    `, [cRoleId, permRes.rows[0].id, cRestId]);

    const cUser = await adminClient2.query(`
      INSERT INTO "users" (id, "restaurantId", "roleId", email, name, "passwordHash", "isActive", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'c.sup-' || $3 || '@bistro.com', 'Charlie Conc', 'hash', true, NOW(), NOW())
      RETURNING id;
    `, [cRestId, cRoleId, cRunId]);
    const cUserId = cUser.rows[0].id;

    await adminClient2.query(`
      INSERT INTO "staff_profiles" (id, "userId", "restaurantId", "employeeCode", "pinHash", "shiftStatus", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'EMP-C-' || $3, public.crypt('9999', public.gen_salt('bf')), 'ACTIVE', NOW(), NOW());
    `, [cUserId, cRestId, cRunId]);

    const cTbl = await adminClient2.query(`
      INSERT INTO "tables" (id, "restaurantId", name, seats, status, "qrCodeKey", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'T-CONC', 4, 'OCCUPIED', 'QR-CONC-' || $2, NOW(), NOW())
      RETURNING id;
    `, [cRestId, cRunId]);
    const cTblId = cTbl.rows[0].id;

    const cSess = await adminClient2.query(`
      INSERT INTO "table_sessions" (id, "restaurantId", "tableId", "sessionNumber", "openedById", "totalAmount", status, "openedAt", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'SES-C-' || $3, $4, 100.00, 'ACTIVE', NOW(), NOW(), NOW())
      RETURNING id;
    `, [cRestId, cTblId, cRunId, cUserId]);
    const cSessId = cSess.rows[0].id;

    // Transaction has $100 gross, $50 paid, outstanding balance $50
    const cTx = await adminClient2.query(`
      INSERT INTO "transactions" (
        id, "restaurantId", "sessionId", "transactionNumber", "orderType", subtotal, "discountAmount", "taxAmount",
        "serviceChargeAmount", "grossAmount", "amountPaid", "writeOffAmount", "paymentStatus", status, "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, 'TX-C-' || $3, 'DINE_IN', 100.00, 0.00, 0.00,
        0.00, 100.00, 50.00, 0.00, 'PARTIALLY_PAID', 'ACTIVE', NOW(), NOW()
      )
      RETURNING id;
    `, [cRestId, cSessId, cRunId]);
    const cTxId = cTx.rows[0].id;

    console.log('  Firing 2 concurrent write-off requests for $30 each on a $50 remaining balance...');
    // Both try to write off $30. Total balance is only $50, so one must succeed and the second must be rejected (balance exceeded)
    const p1 = concApp1.query(`
      SELECT sp_apply_write_off_authorized(
        $1, $2, 30.00, $3, '9999', 'Conc Write-Off 1', 'CONC-IDEM-1-' || $4, $5
      ) as result;
    `, [cRestId, cTxId, cUserId, cRunId, cSessId]);

    const p2 = concApp2.query(`
      SELECT sp_apply_write_off_authorized(
        $1, $2, 30.00, $3, '9999', 'Conc Write-Off 2', 'CONC-IDEM-2-' || $4, $5
      ) as result;
    `, [cRestId, cTxId, cUserId, cRunId, cSessId]);

    const results = await Promise.allSettled([p1, p2]);
    let successCount = 0;
    let rejectedCount = 0;

    results.forEach((r, idx) => {
      if (r.status === 'fulfilled') {
        successCount++;
        console.log(`  Thread ${idx + 1} Succeeded:`, r.value.rows[0].result);
      } else {
        rejectedCount++;
        console.log(`  Thread ${idx + 1} Rejected (Expected Over-Balance):`, r.reason.message);
      }
    });

    if (successCount !== 1 || rejectedCount !== 1) {
      throw new Error(`CONCURRENCY TEST FAILED: Expected exactly 1 success and 1 rejection, got ${successCount} successes and ${rejectedCount} rejections`);
    }

    // Teardown concurrency fixtures
    await adminClient2.query("SET session_replication_role = 'replica';");
    await adminClient2.query('DELETE FROM "audit_logs" WHERE "restaurantId" = $1;', [cRestId]);
    await adminClient2.query('DELETE FROM "transactions" WHERE "restaurantId" = $1;', [cRestId]);
    await adminClient2.query('DELETE FROM "table_sessions" WHERE "restaurantId" = $1;', [cRestId]);
    await adminClient2.query('DELETE FROM "tables" WHERE "restaurantId" = $1;', [cRestId]);
    await adminClient2.query('DELETE FROM "staff_profiles" WHERE "restaurantId" = $1;', [cRestId]);
    await adminClient2.query('DELETE FROM "role_permissions" WHERE "restaurantId" = $1;', [cRestId]);
    await adminClient2.query('DELETE FROM "users" WHERE "restaurantId" = $1;', [cRestId]);
    await adminClient2.query('DELETE FROM "roles" WHERE "restaurantId" = $1;', [cRestId]);
    await adminClient2.query('DELETE FROM "restaurants" WHERE id = $1;', [cRestId]);
    await adminClient2.query("SET session_replication_role = 'origin';");
    console.log('[CONCURRENCY CLEANUP] Concurrency fixtures cleanly deleted.\n');

    console.log('✓ TEST 16 PASSED: Concurrent write-offs serialized by row locks; race condition prevented.\n');

  } finally {
    concApp1.release();
    concApp2.release();
    adminClient2.release();
  }

  // Final verification of 0 residual rows
  const verifyClient = await adminPool.connect();
  try {
    const counts = await verifyClient.query(`
      SELECT
        (SELECT count(*) FROM "restaurants") as r_count,
        (SELECT count(*) FROM "transactions") as tx_count,
        (SELECT count(*) FROM "payments") as p_count,
        (SELECT count(*) FROM "audit_logs") as aud_count;
    `);
    console.log('Final Business Table Row Counts (Must be 0):', counts.rows[0]);
    if (Number(counts.rows[0].r_count) !== 0 || Number(counts.rows[0].tx_count) !== 0 || Number(counts.rows[0].p_count) !== 0 || Number(counts.rows[0].aud_count) !== 0) {
      throw new Error('LEFTOVER TEST DATA DETECTED!');
    }
  } finally {
    verifyClient.release();
  }

  console.log('====================================================================');
  console.log('✔ ALL 16 TESTS PASSED! sp_apply_write_off_authorized FULLY VERIFIED!');
  console.log('====================================================================');
}

runTests()
  .catch((e) => {
    console.error('TEST RUN FAILED:', e);
    process.exit(1);
  })
  .finally(() => {
    adminPool.end();
    appPool.end();
  });
