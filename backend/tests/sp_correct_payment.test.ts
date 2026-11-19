import { Pool, PoolClient } from 'pg';

const adminUrl = 'postgresql://postgres:postgres@localhost:5434/restocontrol_dev';
const appUrl = 'postgresql://resto_app:resto_app_dev_secret@localhost:5434/restocontrol_dev';

const adminPool = new Pool({ connectionString: adminUrl });
const appPool = new Pool({ connectionString: appUrl });

async function runTests() {
  console.log('====================================================================');
  console.log('STEP 1F-E2: COMPREHENSIVE TEST SUITE FOR sp_correct_payment_authorized');
  console.log('====================================================================\n');

  const adminClient: PoolClient = await adminPool.connect();
  const appClient: PoolClient = await appPool.connect();

  try {
    console.log('[SETUP] Provisioning isolated test fixtures...');

    const runId = Date.now();
    // 1. Restaurants
    const r1 = await adminClient.query(`
      INSERT INTO "restaurants" (id, name, slug, "phoneNumber", address, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), 'Correction Bistro', 'corr-bistro-' || $1, '+85511223344', 'Street 51, Phnom Penh', NOW(), NOW())
      RETURNING id;
    `, [runId]);
    const restaurantId = r1.rows[0].id;

    const r2 = await adminClient.query(`
      INSERT INTO "restaurants" (id, name, slug, "phoneNumber", address, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), 'Rival Correction Bistro', 'rival-corr-' || $1, '+85599887766', 'Riverside, Phnom Penh', NOW(), NOW())
      RETURNING id;
    `, [runId]);
    const rivalRestaurantId = r2.rows[0].id;

    // 2. Permission lookup
    const permRes = await adminClient.query(`
      SELECT id FROM "permissions" WHERE code = 'PAYMENT_CORRECTION';
    `);
    if (permRes.rows.length === 0) throw new Error('PAYMENT_CORRECTION permission not found');
    const paymentCorrectionPermId = permRes.rows[0].id;

    // 3. Roles
    const roleSupervisor = await adminClient.query(`
      INSERT INTO "roles" (id, "restaurantId", name, "displayName", description, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'SUPERVISOR', 'Supervisor', 'Floor Supervisor', NOW(), NOW())
      RETURNING id;
    `, [restaurantId]);
    const supervisorRoleId = roleSupervisor.rows[0].id;

    const roleCashier = await adminClient.query(`
      INSERT INTO "roles" (id, "restaurantId", name, "displayName", description, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'CASHIER', 'Cashier', 'Floor Cashier', NOW(), NOW())
      RETURNING id;
    `, [restaurantId]);
    const cashierRoleId = roleCashier.rows[0].id;

    const rivalRole = await adminClient.query(`
      INSERT INTO "roles" (id, "restaurantId", name, "displayName", description, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'SUPERVISOR', 'Supervisor', 'Rival Supervisor', NOW(), NOW())
      RETURNING id;
    `, [rivalRestaurantId]);
    const rivalRoleId = rivalRole.rows[0].id;

    // 4. Assign PAYMENT_CORRECTION permission to supervisor role only
    await adminClient.query(`
      INSERT INTO "role_permissions" ("roleId", "permissionId", "restaurantId", "assignedAt")
      VALUES ($1, $2, $3, NOW());
    `, [supervisorRoleId, paymentCorrectionPermId, restaurantId]);

    await adminClient.query(`
      INSERT INTO "role_permissions" ("roleId", "permissionId", "restaurantId", "assignedAt")
      VALUES ($1, $2, $3, NOW());
    `, [rivalRoleId, paymentCorrectionPermId, rivalRestaurantId]);

    // 5. Users & Staff Profiles
    // 5a. Authorized active supervisor with PIN '8888'
    const uSup = await adminClient.query(`
      INSERT INTO "users" (id, "restaurantId", "roleId", email, name, "passwordHash", "isActive", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'supervisor-' || $3 || '@bistro.com', 'Sam Supervisor', 'hash', true, NOW(), NOW())
      RETURNING id;
    `, [restaurantId, supervisorRoleId, runId]);
    const supervisorId = uSup.rows[0].id;

    await adminClient.query(`
      INSERT INTO "staff_profiles" (id, "userId", "restaurantId", "employeeCode", "pinHash", "shiftStatus", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'EMP-SUP-' || $3, public.crypt('8888', public.gen_salt('bf')), 'ACTIVE', NOW(), NOW());
    `, [supervisorId, restaurantId, runId]);

    // 5b. Inactive supervisor with PIN '8888'
    const uInact = await adminClient.query(`
      INSERT INTO "users" (id, "restaurantId", "roleId", email, name, "passwordHash", "isActive", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'inactive.sup-' || $3 || '@bistro.com', 'Ian Inactive', 'hash', false, NOW(), NOW())
      RETURNING id;
    `, [restaurantId, supervisorRoleId, runId]);
    const inactiveSupervisorId = uInact.rows[0].id;

    await adminClient.query(`
      INSERT INTO "staff_profiles" (id, "userId", "restaurantId", "employeeCode", "pinHash", "shiftStatus", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'EMP-INACT-' || $3, public.crypt('8888', public.gen_salt('bf')), 'OFF_DUTY', NOW(), NOW());
    `, [inactiveSupervisorId, restaurantId, runId]);

    // 5c. Active Cashier (no supervisor permission) with PIN '1234'
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

    // 5d. Rival supervisor
    const uRival = await adminClient.query(`
      INSERT INTO "users" (id, "restaurantId", "roleId", email, name, "passwordHash", "isActive", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'rival.sup-' || $3 || '@rival.com', 'Rick Rival', 'hash', true, NOW(), NOW())
      RETURNING id;
    `, [rivalRestaurantId, rivalRoleId, runId]);
    const rivalSupervisorId = uRival.rows[0].id;

    await adminClient.query(`
      INSERT INTO "staff_profiles" (id, "userId", "restaurantId", "employeeCode", "pinHash", "shiftStatus", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'EMP-RIV-' || $3, public.crypt('8888', public.gen_salt('bf')), 'ACTIVE', NOW(), NOW());
    `, [rivalSupervisorId, rivalRestaurantId, runId]);

    // 6. Table & Session
    const tbl = await adminClient.query(`
      INSERT INTO "tables" (id, "restaurantId", name, seats, status, "qrCodeKey", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'T-201', 4, 'OCCUPIED', 'QR-T201-' || $2, NOW(), NOW())
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

    // Collect initial payment 1: $40.00 CASH via sp_collect_payment under resto_app
    const p1Res = await appClient.query(`
      SELECT sp_collect_payment(
        $1, $2, 40.00, 164000.00, 'USD', 'KHR', 4100.0000, 0.00, 200000.00, 36000.00,
        'CASH'::"PaymentMethod", 'IDEM-INIT-P1', $3
      ) as result;
    `, [restaurantId, transactionId, cashierId]);
    const payment1Id = p1Res.rows[0].result.paymentId;

    // Collect initial payment 2: $60.00 CREDIT_CARD via sp_collect_payment under resto_app (completes invoice)
    const p2Res = await appClient.query(`
      SELECT sp_collect_payment(
        $1, $2, 60.00, 60.00, 'USD', 'USD', 1.0000, 0.00, NULL, NULL,
        'CREDIT_CARD'::"PaymentMethod", 'IDEM-INIT-P2', $3, 'GATEWAY-REF-001'
      ) as result;
    `, [restaurantId, transactionId, cashierId]);
    const payment2Id = p2Res.rows[0].result.paymentId;

    console.log(`[SETUP] Done. Invoice TX-201 ($100.00) completed with Payment 1 ($40.00 CASH: ${payment1Id}) and Payment 2 ($60.00 CARD: ${payment2Id})\n`);

    // Helper to call sp_correct_payment_authorized via appClient
    const callCorrectPayment = async (params: {
      restaurantId: string;
      txId: string;
      paymentId: string;
      supervisorId: string;
      pin: string;
      newMethod: string;
      newCashReceived: number | null;
      newChangeGiven: number | null;
      reason: string;
      idempotencyKey: string;
      newTenderCurrency?: string;
      newExchangeRate?: number;
      newRoundingAdj?: number;
      gatewayRef?: string | null;
    }) => {
      const res = await appClient.query(`
        SELECT sp_correct_payment_authorized(
          $1, $2, $3, $4, $5, $6::"PaymentMethod", $7, $8, $9, $10, $11, $12, $13, $14
        ) as result;
      `, [
        params.restaurantId,
        params.txId,
        params.paymentId,
        params.supervisorId,
        params.pin,
        params.newMethod,
        params.newCashReceived,
        params.newChangeGiven,
        params.reason,
        params.idempotencyKey,
        params.newTenderCurrency || null,
        params.newExchangeRate || null,
        params.newRoundingAdj || null,
        params.gatewayRef || null
      ]);
      return res.rows[0].result;
    };

    // ------------------------------------------------------------------------
    // TEST 1: Successful Non-Cash Correction (CASH -> CREDIT_CARD)
    // ------------------------------------------------------------------------
    console.log('--- TEST 1: Successful Non-Cash Correction (CASH -> CREDIT_CARD) ---');
    const c1Res = await callCorrectPayment({
      restaurantId,
      txId: transactionId,
      paymentId: payment1Id,
      supervisorId,
      pin: '8888',
      newMethod: 'CREDIT_CARD',
      newCashReceived: null,
      newChangeGiven: null,
      reason: 'Customer mistakenly billed cash instead of Visa card',
      idempotencyKey: 'IDEM-CORR-001',
      gatewayRef: 'AUTH-VISA-9911'
    });
    console.log('Result 1:', c1Res);

    if (c1Res.status !== 'SUCCESS' || c1Res.idempotentReplay !== false || c1Res.originalPaymentId !== payment1Id || !c1Res.replacementPaymentId) {
      throw new Error(`TEST 1 Failed: unexpected response ${JSON.stringify(c1Res)}`);
    }
    const replacement1Id = c1Res.replacementPaymentId;

    // ------------------------------------------------------------------------
    // TEST 2: Original Payment Preservation & Immutability Verification
    // ------------------------------------------------------------------------
    console.log('--- TEST 2: Original Payment Preservation & Immutability Verification ---');
    const origP1 = await adminClient.query(`
      SELECT * FROM "payments" WHERE id = $1;
    `, [payment1Id]);
    console.log('Original payment record after correction:', {
      id: origP1.rows[0].id,
      status: origP1.rows[0].status,
      amount: origP1.rows[0].amount,
      tenderAmount: origP1.rows[0].tenderAmount,
      cashReceived: origP1.rows[0].cashReceived,
      changeGiven: origP1.rows[0].changeGiven,
      method: origP1.rows[0].method
    });

    if (origP1.rows[0].status !== 'CORRECTED') throw new Error('Original payment status is not CORRECTED');
    if (Number(origP1.rows[0].amount) !== 40.00) throw new Error('Original payment amount was altered!');
    if (Number(origP1.rows[0].cashReceived) !== 200000.00 || Number(origP1.rows[0].changeGiven) !== 36000.00) {
      throw new Error('Original tender fields were altered!');
    }
    console.log('✓ TEST 2 PASSED: Original payment preserved, status is CORRECTED, financial fields 100% immutable.\n');

    // ------------------------------------------------------------------------
    // TEST 3: Replacement Payment Details & Exact USD Base Amount Match
    // ------------------------------------------------------------------------
    console.log('--- TEST 3: Replacement Payment Details & Exact USD Amount Match ---');
    const replP1 = await adminClient.query(`
      SELECT * FROM "payments" WHERE id = $1;
    `, [replacement1Id]);
    console.log('Replacement payment record:', {
      id: replP1.rows[0].id,
      status: replP1.rows[0].status,
      amount: replP1.rows[0].amount,
      method: replP1.rows[0].method,
      processedById: replP1.rows[0].processedById
    });

    if (replP1.rows[0].status !== 'SUCCESS') throw new Error('Replacement payment status is not SUCCESS');
    if (Number(replP1.rows[0].amount) !== 40.00) throw new Error('Replacement amount does not match original base USD!');
    if (replP1.rows[0].method !== 'CREDIT_CARD') throw new Error('Replacement method is not CREDIT_CARD');
    if (replP1.rows[0].processedById !== supervisorId) throw new Error('Replacement processedById does not match supervisor');
    console.log('✓ TEST 3 PASSED: Replacement payment inserted with status SUCCESS, exact $40.00 USD, correct method and supervisor.\n');

    // ------------------------------------------------------------------------
    // TEST 4: Aggregate amountPaid & Transaction Lifecycle Status Preservation
    // ------------------------------------------------------------------------
    console.log('--- TEST 4: Aggregate amountPaid & Transaction Lifecycle Status Preservation ---');
    const txAfterC1 = await adminClient.query(`
      SELECT "amountPaid", "grossAmount", "paymentStatus", status, "completedAt" FROM "transactions" WHERE id = $1;
    `, [transactionId]);
    console.log('Transaction after correction:', txAfterC1.rows[0]);

    if (Number(txAfterC1.rows[0].amountPaid) !== 100.00 || txAfterC1.rows[0].paymentStatus !== 'PAID' || txAfterC1.rows[0].status !== 'COMPLETED' || !txAfterC1.rows[0].completedAt) {
      throw new Error(`TEST 4 Failed: Transaction aggregate corrupted: ${JSON.stringify(txAfterC1.rows[0])}`);
    }
    console.log('✓ TEST 4 PASSED: Aggregate amountPaid remains exactly $100.00, COMPLETED / PAID preserved.\n');

    // ------------------------------------------------------------------------
    // TEST 5: Successful Cash Correction (CREDIT_CARD -> CASH)
    // ------------------------------------------------------------------------
    console.log('--- TEST 5: Successful Cash Correction (Payment 2: CARD -> CASH) ---');
    const c2Res = await callCorrectPayment({
      restaurantId,
      txId: transactionId,
      paymentId: payment2Id,
      supervisorId,
      pin: '8888',
      newMethod: 'CASH',
      newCashReceived: 300000.00,
      newChangeGiven: 54000.00, // 300000 - 54000 = 246000 KHR = $60.00 @ 4100
      newTenderCurrency: 'KHR',
      newExchangeRate: 4100.0000,
      reason: 'Customer requested to pay cash in KHR instead of Card',
      idempotencyKey: 'IDEM-CORR-002'
    });
    console.log('Result 5:', c2Res);

    if (c2Res.status !== 'SUCCESS' || c2Res.idempotentReplay !== false || !c2Res.replacementPaymentId) {
      throw new Error(`TEST 5 Failed: unexpected return ${JSON.stringify(c2Res)}`);
    }
    const replacement2Id = c2Res.replacementPaymentId;

    const replP2 = await adminClient.query(`SELECT * FROM "payments" WHERE id = $1;`, [replacement2Id]);
    if (Number(replP2.rows[0].amount) !== 60.00 || replP2.rows[0].method !== 'CASH' || Number(replP2.rows[0].tenderAmount) !== 246000.00) {
      throw new Error('Replacement cash tender amounts invalid');
    }
    console.log('✓ TEST 5 PASSED: Cash tender correction executed, KHR conversion verified, amount matches $60.00 USD.\n');

    // ------------------------------------------------------------------------
    // TEST 6: Already-Corrected Payment Rejection
    // ------------------------------------------------------------------------
    console.log('--- TEST 6: Already-Corrected Payment Rejection ---');
    let alreadyCorrectedCaught = false;
    try {
      await callCorrectPayment({
        restaurantId,
        txId: transactionId,
        paymentId: payment1Id, // Already CORRECTED
        supervisorId,
        pin: '8888',
        newMethod: 'CASH',
        newCashReceived: 200000.00,
        newChangeGiven: 36000.00,
        reason: 'Attempting to re-correct already corrected payment',
        idempotencyKey: 'IDEM-CORR-ALREADY'
      });
    } catch (err: any) {
      alreadyCorrectedCaught = true;
      console.log('Expected check_violation caught:', err.message);
    }
    if (!alreadyCorrectedCaught) throw new Error('TEST 6 Failed: Re-correction of already-corrected payment was NOT rejected!');
    console.log('✓ TEST 6 PASSED: Re-correction of already CORRECTED payment strictly rejected.\n');

    // ------------------------------------------------------------------------
    // TEST 7: Idempotency Exact Replay
    // ------------------------------------------------------------------------
    console.log('--- TEST 7: Idempotency Exact Replay (Same Key, Same Payload) ---');
    const t7Res = await callCorrectPayment({
      restaurantId,
      txId: transactionId,
      paymentId: payment1Id,
      supervisorId,
      pin: '8888',
      newMethod: 'CREDIT_CARD',
      newCashReceived: null,
      newChangeGiven: null,
      reason: 'Customer mistakenly billed cash instead of Visa card',
      idempotencyKey: 'IDEM-CORR-001',
      gatewayRef: 'AUTH-VISA-9911'
    });
    console.log('Result 7:', t7Res);

    if (t7Res.status !== 'SUCCESS' || t7Res.idempotentReplay !== true || t7Res.replacementPaymentId !== replacement1Id) {
      throw new Error(`TEST 7 Failed: Expected idempotent replay of ${replacement1Id}, got ${JSON.stringify(t7Res)}`);
    }

    const pCountAfter7 = await adminClient.query(`SELECT count(*) as count FROM "payments" WHERE "transactionId" = $1;`, [transactionId]);
    if (Number(pCountAfter7.rows[0].count) !== 4) { // 2 original + 2 replacement
      throw new Error(`TEST 7 Duplicate payment detected: count is ${pCountAfter7.rows[0].count}`);
    }
    console.log('✓ TEST 7 PASSED: Idempotent replay returned existing replacement payment with idempotentReplay = true and 0 duplicate rows.\n');

    // ------------------------------------------------------------------------
    // TEST 8: Idempotency Changed-Payload Rejection
    // ------------------------------------------------------------------------
    console.log('--- TEST 8: Idempotency Changed-Payload Rejection ---');
    let replayMismatchCaught = false;
    try {
      await callCorrectPayment({
        restaurantId,
        txId: transactionId,
        paymentId: payment1Id,
        supervisorId,
        pin: '8888',
        newMethod: 'CASH', // Mismatched method on key IDEM-CORR-001
        newCashReceived: 200000.00,
        newChangeGiven: 36000.00,
        reason: 'Altered replay payload',
        idempotencyKey: 'IDEM-CORR-001'
      });
    } catch (err: any) {
      replayMismatchCaught = true;
      console.log('Expected check_violation caught on payload mismatch:', err.message);
    }
    if (!replayMismatchCaught) throw new Error('TEST 8 Failed: Idempotency changed payload was NOT rejected!');
    console.log('✓ TEST 8 PASSED: Idempotency key reuse with different parameters strictly rejected.\n');

    // ------------------------------------------------------------------------
    // TEST 9: Authorization Rejections (Wrong PIN, Inactive User, Missing Perm, Cross-Tenant)
    // ------------------------------------------------------------------------
    console.log('--- TEST 9: Security Authorization Rejections ---');

    // 9a. Wrong PIN
    let wrongPinCaught = false;
    try {
      await callCorrectPayment({
        restaurantId,
        txId: transactionId,
        paymentId: replacement1Id,
        supervisorId,
        pin: '9999', // Wrong PIN
        newMethod: 'CASH',
        newCashReceived: 200000.00,
        newChangeGiven: 36000.00,
        reason: 'Wrong pin test',
        idempotencyKey: 'IDEM-WRONG-PIN'
      });
    } catch (err: any) {
      wrongPinCaught = true;
      console.log('✓ 9a Wrong PIN rejected with insufficient_privilege:', err.message);
    }
    if (!wrongPinCaught) throw new Error('TEST 9a Failed: Wrong PIN was not rejected!');

    // 9b. Inactive Supervisor
    let inactiveCaught = false;
    try {
      await callCorrectPayment({
        restaurantId,
        txId: transactionId,
        paymentId: replacement1Id,
        supervisorId: inactiveSupervisorId,
        pin: '8888',
        newMethod: 'CASH',
        newCashReceived: 200000.00,
        newChangeGiven: 36000.00,
        reason: 'Inactive supervisor test',
        idempotencyKey: 'IDEM-INACTIVE'
      });
    } catch (err: any) {
      inactiveCaught = true;
      console.log('✓ 9b Inactive supervisor rejected with insufficient_privilege:', err.message);
    }
    if (!inactiveCaught) throw new Error('TEST 9b Failed: Inactive supervisor was not rejected!');

    // 9c. Missing PAYMENT_CORRECTION permission (Cashier role)
    let missingPermCaught = false;
    try {
      await callCorrectPayment({
        restaurantId,
        txId: transactionId,
        paymentId: replacement1Id,
        supervisorId: cashierId,
        pin: '1234',
        newMethod: 'CASH',
        newCashReceived: 200000.00,
        newChangeGiven: 36000.00,
        reason: 'Cashier without permission test',
        idempotencyKey: 'IDEM-NO-PERM'
      });
    } catch (err: any) {
      missingPermCaught = true;
      console.log('✓ 9c Missing permission rejected with insufficient_privilege:', err.message);
    }
    if (!missingPermCaught) throw new Error('TEST 9c Failed: Missing permission was not rejected!');

    // 9d. Cross-Tenant Supervisor
    let crossTenantCaught = false;
    try {
      await callCorrectPayment({
        restaurantId,
        txId: transactionId,
        paymentId: replacement1Id,
        supervisorId: rivalSupervisorId,
        pin: '8888',
        newMethod: 'CASH',
        newCashReceived: 200000.00,
        newChangeGiven: 36000.00,
        reason: 'Cross-tenant supervisor test',
        idempotencyKey: 'IDEM-CROSS-TENANT'
      });
    } catch (err: any) {
      crossTenantCaught = true;
      console.log('✓ 9d Cross-tenant supervisor rejected with insufficient_privilege:', err.message);
    }
    if (!crossTenantCaught) throw new Error('TEST 9d Failed: Cross-tenant supervisor was not rejected!');

    console.log('✓ TEST 9 PASSED: All authorization checks (wrong PIN, inactive, missing permission, cross-tenant) verified.\n');

    // ------------------------------------------------------------------------
    // TEST 10: AuditLog Creation and Immutability Verification
    // ------------------------------------------------------------------------
    console.log('--- TEST 10: AuditLog Creation and Immutability Verification ---');
    const auditLogs = await adminClient.query(`
      SELECT id, "restaurantId", "userId", action, "entityType", "entityId", details
      FROM "audit_logs"
      WHERE "restaurantId" = $1 AND action = 'PAYMENT_CORRECTION'
      ORDER BY "createdAt" ASC;
    `, [restaurantId]);
    console.log(`Found ${auditLogs.rows.length} PAYMENT_CORRECTION audit log entries:`, auditLogs.rows);

    if (auditLogs.rows.length !== 2) {
      throw new Error(`TEST 10 Failed: Expected 2 PAYMENT_CORRECTION audit log entries, found ${auditLogs.rows.length}`);
    }

    // Verify AuditLog Immutability Trigger blocks UPDATE and DELETE
    let auditUpdateBlocked = false;
    try {
      await adminClient.query(`UPDATE "audit_logs" SET action = 'ALTERED' WHERE id = $1;`, [auditLogs.rows[0].id]);
    } catch (err: any) {
      auditUpdateBlocked = true;
      console.log('✓ Blocked UPDATE on audit_logs:', err.message);
    }
    if (!auditUpdateBlocked) throw new Error('TEST 10 Failed: AuditLog UPDATE was not blocked!');

    let auditDeleteBlocked = false;
    try {
      await adminClient.query(`DELETE FROM "audit_logs" WHERE id = $1;`, [auditLogs.rows[0].id]);
    } catch (err: any) {
      auditDeleteBlocked = true;
      console.log('✓ Blocked DELETE on audit_logs:', err.message);
    }
    if (!auditDeleteBlocked) throw new Error('TEST 10 Failed: AuditLog DELETE was not blocked!');

    console.log('✓ TEST 10 PASSED: AuditLog records accurately created and immutability enforced by engine triggers.\n');

    // ------------------------------------------------------------------------
    // TEST 11: Direct Unauthorized UPDATE/DELETE Attempts Blocked
    // ------------------------------------------------------------------------
    console.log('--- TEST 11: Direct Unauthorized UPDATE/DELETE on Payments Blocked ---');
    let directDeleteBlocked = false;
    try {
      await appClient.query(`DELETE FROM "payments" WHERE id = $1;`, [replacement1Id]);
    } catch (err: any) {
      directDeleteBlocked = true;
      console.log('✓ Blocked direct DELETE by resto_app:', err.message);
    }
    if (!directDeleteBlocked) throw new Error('TEST 11 Failed: Direct DELETE was not blocked!');

    let directAmountUpdateBlocked = false;
    try {
      await appClient.query(`UPDATE "payments" SET amount = 999.00 WHERE id = $1;`, [replacement1Id]);
    } catch (err: any) {
      directAmountUpdateBlocked = true;
      console.log('✓ Blocked direct UPDATE amount by resto_app:', err.message);
    }
    if (!directAmountUpdateBlocked) throw new Error('TEST 11 Failed: Direct amount UPDATE was not blocked!');

    console.log('✓ TEST 11 PASSED: Direct unauthorized mutations strictly blocked.\n');

    // Teardown initial test fixtures
    await adminClient.query("SET session_replication_role = 'replica';");
    await adminClient.query('DELETE FROM "audit_logs" WHERE "restaurantId" IN ($1, $2);', [restaurantId, rivalRestaurantId]);
    await adminClient.query('DELETE FROM "payments" WHERE "restaurantId" IN ($1, $2);', [restaurantId, rivalRestaurantId]);
    await adminClient.query('DELETE FROM "transactions" WHERE "restaurantId" IN ($1, $2);', [restaurantId, rivalRestaurantId]);
    await adminClient.query('DELETE FROM "orders" WHERE "restaurantId" IN ($1, $2);', [restaurantId, rivalRestaurantId]);
    await adminClient.query('DELETE FROM "table_sessions" WHERE "restaurantId" IN ($1, $2);', [restaurantId, rivalRestaurantId]);
    await adminClient.query('DELETE FROM "tables" WHERE "restaurantId" IN ($1, $2);', [restaurantId, rivalRestaurantId]);
    await adminClient.query('DELETE FROM "staff_profiles" WHERE "restaurantId" IN ($1, $2);', [restaurantId, rivalRestaurantId]);
    await adminClient.query('DELETE FROM "role_permissions" WHERE "restaurantId" IN ($1, $2);', [restaurantId, rivalRestaurantId]);
    await adminClient.query('DELETE FROM "users" WHERE "restaurantId" IN ($1, $2);', [restaurantId, rivalRestaurantId]);
    await adminClient.query('DELETE FROM "roles" WHERE "restaurantId" IN ($1, $2);', [restaurantId, rivalRestaurantId]);
    await adminClient.query('DELETE FROM "restaurants" WHERE id IN ($1, $2);', [restaurantId, rivalRestaurantId]);
    await adminClient.query("SET session_replication_role = 'origin';");
    console.log('[CLEANUP] Primary test fixtures cleanly deleted.\n');

  } finally {
    adminClient.release();
    appClient.release();
  }

  // --------------------------------------------------------------------------
  // TEST 12: Concurrent Correction Attempts (Parent-First Row Lock Serialization)
  // --------------------------------------------------------------------------
  console.log('--- TEST 12: Concurrent Correction Attempts (Lock Serialization) ---');
  const concApp1 = await appPool.connect();
  const concApp2 = await appPool.connect();
  const adminClient2 = await adminPool.connect();

  try {
    const rC = await adminClient2.query(`
      INSERT INTO "restaurants" (id, name, slug, "phoneNumber", address, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), 'Conc Corr Bistro', 'conc-corr-' || gen_random_uuid()::text, '+85511002200', 'Address', NOW(), NOW())
      RETURNING id;
    `);
    const cRestId = rC.rows[0].id;

    const rRole = await adminClient2.query(`
      INSERT INTO "roles" (id, "restaurantId", name, "displayName", description, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'SUPERVISOR', 'Supervisor', 'Desc', NOW(), NOW())
      RETURNING id;
    `, [cRestId]);

    const permRes = await adminClient2.query(`SELECT id FROM "permissions" WHERE code = 'PAYMENT_CORRECTION';`);
    await adminClient2.query(`
      INSERT INTO "role_permissions" ("roleId", "permissionId", "restaurantId", "assignedAt")
      VALUES ($1, $2, $3, NOW());
    `, [rRole.rows[0].id, permRes.rows[0].id, cRestId]);

    const uC = await adminClient2.query(`
      INSERT INTO "users" (id, "restaurantId", "roleId", email, name, "passwordHash", "isActive", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'conc.sup@bistro.com', 'Conc Supervisor', 'hash', true, NOW(), NOW())
      RETURNING id;
    `, [cRestId, rRole.rows[0].id]);
    const cSupId = uC.rows[0].id;

    await adminClient2.query(`
      INSERT INTO "staff_profiles" (id, "userId", "restaurantId", "employeeCode", "pinHash", "shiftStatus", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'EMP-CONC-SUP', public.crypt('7777', public.gen_salt('bf')), 'ACTIVE', NOW(), NOW());
    `, [cSupId, cRestId]);

    const tblC = await adminClient2.query(`
      INSERT INTO "tables" (id, "restaurantId", name, seats, status, "qrCodeKey", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'T-CONC-CORR', 2, 'OCCUPIED', 'QR-TCONC-CORR', NOW(), NOW())
      RETURNING id;
    `, [cRestId]);

    const sessC = await adminClient2.query(`
      INSERT INTO "table_sessions" (id, "restaurantId", "tableId", "sessionNumber", "openedById", "totalAmount", status, "openedAt", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'SES-CC', $3, 50.00, 'ACTIVE', NOW(), NOW(), NOW())
      RETURNING id;
    `, [cRestId, tblC.rows[0].id, cSupId]);

    const txC = await adminClient2.query(`
      INSERT INTO "transactions" (
        id, "restaurantId", "sessionId", "transactionNumber", "orderType", subtotal, "discountAmount", "taxAmount",
        "serviceChargeAmount", "grossAmount", "amountPaid", "writeOffAmount", "paymentStatus", status, "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, 'TX-CC', 'DINE_IN', 50.00, 0.00, 0.00,
        0.00, 50.00, 0.00, 0.00, 'UNPAID', 'ACTIVE', NOW(), NOW()
      )
      RETURNING id;
    `, [cRestId, sessC.rows[0].id]);
    const cTxId = txC.rows[0].id;

    const pInit = await concApp1.query(`
      SELECT sp_collect_payment(
        $1, $2, 50.00, 50.00, 'USD', 'USD', 1.0000, 0.00, NULL, NULL,
        'CREDIT_CARD'::"PaymentMethod", 'IDEM-INIT-CC', $3
      ) as result;
    `, [cRestId, cTxId, cSupId]);
    const cPaymentId = pInit.rows[0].result.paymentId;

    console.log(`[CONCURRENCY SETUP] Transaction ${cTxId} with payment ${cPaymentId} created. Simulating 2 concurrent corrections...`);

    const results = await Promise.allSettled([
      concApp1.query(`
        SELECT sp_correct_payment_authorized(
          $1, $2, $3, $4, '7777', 'CASH'::"PaymentMethod", 50.00, 0.00,
          'Race thread 1', 'IDEM-RACE-CORR-1'
        ) as result;
      `, [cRestId, cTxId, cPaymentId, cSupId]),
      concApp2.query(`
        SELECT sp_correct_payment_authorized(
          $1, $2, $3, $4, '7777', 'CASH'::"PaymentMethod", 50.00, 0.00,
          'Race thread 2', 'IDEM-RACE-CORR-2'
        ) as result;
      `, [cRestId, cTxId, cPaymentId, cSupId])
    ]);

    let successCount = 0;
    let rejectedCount = 0;

    results.forEach((r, idx) => {
      if (r.status === 'fulfilled') {
        successCount++;
        console.log(`  Thread ${idx + 1} Succeeded:`, r.value.rows[0].result);
      } else {
        rejectedCount++;
        console.log(`  Thread ${idx + 1} Rejected (Expected Status Check):`, r.reason.message);
      }
    });

    if (successCount !== 1 || rejectedCount !== 1) {
      throw new Error(`CONCURRENCY TEST FAILED: Expected exactly 1 success and 1 rejection, got ${successCount} successes and ${rejectedCount} rejections`);
    }

    // Teardown concurrency fixtures
    await adminClient2.query("SET session_replication_role = 'replica';");
    await adminClient2.query('DELETE FROM "audit_logs" WHERE "restaurantId" = $1;', [cRestId]);
    await adminClient2.query('DELETE FROM "payments" WHERE "restaurantId" = $1;', [cRestId]);
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

    console.log('✓ TEST 12 PASSED: Concurrent corrections serialized by row locks; double correction prevented.\n');

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
  console.log('✔ ALL 12 TESTS PASSED! sp_correct_payment_authorized FULLY VERIFIED!');
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
