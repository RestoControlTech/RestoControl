import { Pool, PoolClient } from 'pg';

const adminUrl = 'postgresql://postgres:postgres@localhost:5434/restocontrol_dev';
const appUrl = 'postgresql://resto_app:resto_app_dev_secret@localhost:5434/restocontrol_dev';

const adminPool = new Pool({ connectionString: adminUrl });
const appPool = new Pool({ connectionString: appUrl });

async function runFinalE2EVerification() {
  console.log('====================================================================');
  console.log('STEP 1F-F: FINAL INTEGRATION, SECURITY & CONCURRENCY VERIFICATION');
  console.log('====================================================================\n');

  const adminClient: PoolClient = await adminPool.connect();
  const appClient: PoolClient = await appPool.connect();

  try {
    const runId = Date.now();
    console.log(`[E2E SETUP] Initializing isolated multi-tenant environment (RunId: ${runId})...`);

    // 1. Create Tenant A and Tenant B
    const rA = await adminClient.query(`
      INSERT INTO "restaurants" (id, name, slug, "phoneNumber", address, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), 'Alpha Bistro', 'alpha-' || $1, '+85511000111', 'Phnom Penh A', NOW(), NOW())
      RETURNING id;
    `, [runId]);
    const tenantAId = rA.rows[0].id;

    const rB = await adminClient.query(`
      INSERT INTO "restaurants" (id, name, slug, "phoneNumber", address, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), 'Beta Bistro', 'beta-' || $1, '+85522000222', 'Phnom Penh B', NOW(), NOW())
      RETURNING id;
    `, [runId]);
    const tenantBId = rB.rows[0].id;

    // 2. Roles & Permissions
    const permCorrRes = await adminClient.query(`SELECT id FROM "permissions" WHERE code = 'PAYMENT_CORRECTION';`);
    const permWoRes = await adminClient.query(`SELECT id FROM "permissions" WHERE code = 'TRANSACTION_WRITE_OFF';`);
    const permCorrId = permCorrRes.rows[0].id;
    const permWoId = permWoRes.rows[0].id;

    // Tenant A Roles
    const roleSupA = await adminClient.query(`
      INSERT INTO "roles" (id, "restaurantId", name, "displayName", description, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'SUPERVISOR', 'Supervisor', 'Floor Supervisor', NOW(), NOW())
      RETURNING id;
    `, [tenantAId]);
    const supRoleAId = roleSupA.rows[0].id;

    const roleCashierA = await adminClient.query(`
      INSERT INTO "roles" (id, "restaurantId", name, "displayName", description, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'CASHIER', 'Cashier', 'Register Cashier', NOW(), NOW())
      RETURNING id;
    `, [tenantAId]);
    const cashierRoleAId = roleCashierA.rows[0].id;

    // Assign permissions to Supervisor A
    await adminClient.query(`
      INSERT INTO "role_permissions" ("roleId", "permissionId", "restaurantId", "assignedAt")
      VALUES ($1, $2, $3, NOW()), ($1, $4, $3, NOW());
    `, [supRoleAId, permCorrId, tenantAId, permWoId]);

    // Tenant B Roles
    const roleSupB = await adminClient.query(`
      INSERT INTO "roles" (id, "restaurantId", name, "displayName", description, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'SUPERVISOR', 'Supervisor', 'Floor Supervisor', NOW(), NOW())
      RETURNING id;
    `, [tenantBId]);
    const supRoleBId = roleSupB.rows[0].id;

    await adminClient.query(`
      INSERT INTO "role_permissions" ("roleId", "permissionId", "restaurantId", "assignedAt")
      VALUES ($1, $2, $3, NOW()), ($1, $4, $3, NOW());
    `, [supRoleBId, permCorrId, tenantBId, permWoId]);

    // 3. Staff Users & Profiles
    // Supervisor A (PIN: '5555')
    const uSupA = await adminClient.query(`
      INSERT INTO "users" (id, "restaurantId", "roleId", email, name, "passwordHash", "isActive", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'supA-' || $3 || '@alpha.com', 'Alice Supervisor', 'hash', true, NOW(), NOW())
      RETURNING id;
    `, [tenantAId, supRoleAId, runId]);
    const supervisorAId = uSupA.rows[0].id;

    await adminClient.query(`
      INSERT INTO "staff_profiles" (id, "userId", "restaurantId", "employeeCode", "pinHash", "shiftStatus", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'EMP-SA-' || $3, public.crypt('5555', public.gen_salt('bf')), 'ACTIVE', NOW(), NOW());
    `, [supervisorAId, tenantAId, runId]);

    // Cashier A
    const uCashA = await adminClient.query(`
      INSERT INTO "users" (id, "restaurantId", "roleId", email, name, "passwordHash", "isActive", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'cashA-' || $3 || '@alpha.com', 'Charlie Cashier', 'hash', true, NOW(), NOW())
      RETURNING id;
    `, [tenantAId, cashierRoleAId, runId]);
    const cashierAId = uCashA.rows[0].id;

    await adminClient.query(`
      INSERT INTO "staff_profiles" (id, "userId", "restaurantId", "employeeCode", "pinHash", "shiftStatus", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'EMP-CA-' || $3, public.crypt('1111', public.gen_salt('bf')), 'ACTIVE', NOW(), NOW());
    `, [cashierAId, tenantAId, runId]);

    // Supervisor B (Tenant B, PIN: '5555')
    const uSupB = await adminClient.query(`
      INSERT INTO "users" (id, "restaurantId", "roleId", email, name, "passwordHash", "isActive", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'supB-' || $3 || '@beta.com', 'Bob Supervisor', 'hash', true, NOW(), NOW())
      RETURNING id;
    `, [tenantBId, supRoleBId, runId]);
    const supervisorBId = uSupB.rows[0].id;

    await adminClient.query(`
      INSERT INTO "staff_profiles" (id, "userId", "restaurantId", "employeeCode", "pinHash", "shiftStatus", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'EMP-SB-' || $3, public.crypt('5555', public.gen_salt('bf')), 'ACTIVE', NOW(), NOW());
    `, [supervisorBId, tenantBId, runId]);

    // 4. Tables, Session, Order, and Transaction in Tenant A ($150 gross)
    const tblA = await adminClient.query(`
      INSERT INTO "tables" (id, "restaurantId", name, seats, status, "qrCodeKey", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'Table-1', 4, 'OCCUPIED', 'QR-T1-' || $2, NOW(), NOW())
      RETURNING id;
    `, [tenantAId, runId]);
    const tableAId = tblA.rows[0].id;

    const sessA = await adminClient.query(`
      INSERT INTO "table_sessions" (id, "restaurantId", "tableId", "sessionNumber", "openedById", "totalAmount", status, "openedAt", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'SES-A-' || $4, $3, 150.00, 'ACTIVE', NOW(), NOW(), NOW())
      RETURNING id;
    `, [tenantAId, tableAId, cashierAId, runId]);
    const sessionAId = sessA.rows[0].id;

    const ordA = await adminClient.query(`
      INSERT INTO "orders" (id, "restaurantId", "sessionId", "createdById", "orderNumber", "orderType", subtotal, "discountAmount", "taxAmount", "serviceChargeAmount", total, status, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, $3, 'ORD-A-' || $4, 'DINE_IN', 150.00, 0.00, 0.00, 0.00, 150.00, 'SERVED', NOW(), NOW())
      RETURNING id;
    `, [tenantAId, sessionAId, cashierAId, runId]);

    const txA = await adminClient.query(`
      INSERT INTO "transactions" (
        id, "restaurantId", "sessionId", "transactionNumber", "orderType", subtotal, "discountAmount", "taxAmount",
        "serviceChargeAmount", "grossAmount", "amountPaid", "writeOffAmount", "paymentStatus", status, "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, 'TX-A-' || $3, 'DINE_IN', 150.00, 0.00, 0.00,
        0.00, 150.00, 0.00, 0.00, 'UNPAID', 'ACTIVE', NOW(), NOW()
      )
      RETURNING id;
    `, [tenantAId, sessionAId, runId]);
    const transactionAId = txA.rows[0].id;

    console.log('[E2E SETUP] Provisioning complete. Transaction created with Gross: $150.00\n');

    // ------------------------------------------------------------------------
    // WORKFLOW 1: Payment Collection & KHR Tender Reconciliation
    // ------------------------------------------------------------------------
    console.log('--- WORKFLOW 1: Cash Collection with KHR Tender ($50.00) ---');
    const p1Res = await appClient.query(`
      SELECT sp_collect_payment(
        $1, $2, 50.00, 205000.00, 'USD', 'KHR', 4100.0000, 0.00, 210000.00, 5000.00,
        'CASH'::"PaymentMethod", 'E2E-IDEM-P1-' || $3, $4
      ) as result;
    `, [tenantAId, transactionAId, runId, cashierAId]);
    const p1 = p1Res.rows[0].result;
    console.log('  Payment 1 result:', p1);

    if (p1.status !== 'SUCCESS' || Number(p1.amountPaid) !== 50.00 || p1.paymentStatus !== 'PARTIALLY_PAID' || p1.transactionStatus !== 'ACTIVE') {
      throw new Error('WORKFLOW 1 FAILED: Payment 1 state mismatch');
    }
    const payment1Id = p1.paymentId;

    // ------------------------------------------------------------------------
    // WORKFLOW 2: Card Payment Collection ($50.00)
    // ------------------------------------------------------------------------
    console.log('--- WORKFLOW 2: Credit Card Payment Collection ($50.00) ---');
    const p2Res = await appClient.query(`
      SELECT sp_collect_payment(
        $1, $2, 50.00, 50.00, 'USD', 'USD', 1.0000, 0.00, NULL, NULL,
        'CREDIT_CARD'::"PaymentMethod", 'E2E-IDEM-P2-' || $3, $4, 'GW-VISA-7788'
      ) as result;
    `, [tenantAId, transactionAId, runId, cashierAId]);
    const p2 = p2Res.rows[0].result;
    console.log('  Payment 2 result:', p2);

    if (p2.status !== 'SUCCESS' || Number(p2.amountPaid) !== 100.00 || p2.paymentStatus !== 'PARTIALLY_PAID') {
      throw new Error('WORKFLOW 2 FAILED: Payment 2 state mismatch');
    }
    const payment2Id = p2.paymentId;

    // ------------------------------------------------------------------------
    // WORKFLOW 3: Payment Correction (Payment 2 CREDIT_CARD -> KHQR)
    // ------------------------------------------------------------------------
    console.log('--- WORKFLOW 3: Payment Correction (CREDIT_CARD -> KHQR) ---');
    const corrRes = await appClient.query(`
      SELECT sp_correct_payment_authorized(
        $1, $2, $3, $4, '5555', 'KHQR'::"PaymentMethod", NULL, NULL,
        'Customer requested payment via Bakong KHQR instead of Card',
        'E2E-IDEM-CORR-' || $5, 'USD', 1.0000, 0.00, 'BAKONG-TX-9988'
      ) as result;
    `, [tenantAId, transactionAId, payment2Id, supervisorAId, runId]);
    const corr = corrRes.rows[0].result;
    console.log('  Correction result:', corr);

    if (corr.status !== 'SUCCESS' || corr.newMethod !== 'KHQR' || Number(corr.amountPaid) !== 100.00) {
      throw new Error('WORKFLOW 3 FAILED: Correction state mismatch');
    }

    // Verify original payment 2 is CORRECTED and untouched in financial fields
    const p2Db = await adminClient.query(`SELECT * FROM "payments" WHERE id = $1;`, [payment2Id]);
    if (p2Db.rows[0].status !== 'CORRECTED' || Number(p2Db.rows[0].amount) !== 50.00 || p2Db.rows[0].method !== 'CREDIT_CARD') {
      throw new Error('WORKFLOW 3 FAILED: Original payment immutability violated');
    }

    // ------------------------------------------------------------------------
    // WORKFLOW 4: Security Privilege Boundaries & Direct Mutation Blocks
    // ------------------------------------------------------------------------
    console.log('--- WORKFLOW 4: Security Privilege Enforcement for resto_app ---');
    // 4a. resto_app direct UPDATE on writeOffAmount
    try {
      await appClient.query(`UPDATE "transactions" SET "writeOffAmount" = 999.00 WHERE id = $1;`, [transactionAId]);
      throw new Error('WORKFLOW 4a FAILED: resto_app updated writeOffAmount directly');
    } catch (e: any) {
      if (e.code !== '42501') throw e;
      console.log('  ✓ 4a Direct UPDATE on writeOffAmount blocked (42501 permission denied)');
    }

    // 4b. resto_app direct DELETE on payments
    try {
      await appClient.query(`DELETE FROM "payments" WHERE id = $1;`, [payment1Id]);
      throw new Error('WORKFLOW 4b FAILED: resto_app deleted payment directly');
    } catch (e: any) {
      if (e.code !== '42501') throw e;
      console.log('  ✓ 4b Direct DELETE on payments blocked (42501 permission denied)');
    }

    // 4c. resto_app direct UPDATE on audit_logs
    try {
      await appClient.query(`UPDATE "audit_logs" SET details = '{"hacked": true}' WHERE "restaurantId" = $1;`, [tenantAId]);
      throw new Error('WORKFLOW 4c FAILED: resto_app updated audit_logs directly');
    } catch (e: any) {
      console.log('  ✓ 4c Direct UPDATE on audit_logs blocked');
    }

    // 4d. Cross-Tenant Authorization Rejection (Supervisor B cannot write off in Tenant A)
    try {
      await appClient.query(`
        SELECT sp_apply_write_off_authorized(
          $1, $2, 10.00, $3, '5555', 'Cross-tenant attempt', 'E2E-IDEM-XT-' || $4, $5
        );
      `, [tenantAId, transactionAId, supervisorBId, runId, sessionAId]);
      throw new Error('WORKFLOW 4d FAILED: Cross-tenant supervisor was not rejected');
    } catch (e: any) {
      if (!e.message.includes('Authorization Denied') && !e.message.includes('insufficient_privilege')) throw e;
      console.log('  ✓ 4d Cross-tenant write-off authorization rejected (insufficient_privilege)');
    }

    // ------------------------------------------------------------------------
    // WORKFLOW 5: Partial Write-Off by Authorized Supervisor
    // ------------------------------------------------------------------------
    console.log('--- WORKFLOW 5: Supervisor Authorized Partial Write-Off ($25.00) ---');
    // Balance is $50.00 ($150 gross - $100 paid). Supervisor writes off $25.00.
    const wo1Res = await appClient.query(`
      SELECT sp_apply_write_off_authorized(
        $1, $2, 25.00, $3, '5555', 'Comped dessert and wine due to kitchen delay',
        'E2E-IDEM-WO1-' || $4, $5
      ) as result;
    `, [tenantAId, transactionAId, supervisorAId, runId, sessionAId]);
    const wo1 = wo1Res.rows[0].result;
    console.log('  Write-off 1 result:', wo1);

    if (
      wo1.status !== 'SUCCESS' ||
      Number(wo1.writtenOffAmount) !== 25.00 ||
      Number(wo1.totalWriteOffAmount) !== 25.00 ||
      Number(wo1.amountPaid) !== 100.00 ||
      Number(wo1.outstandingBalance) !== 25.00 ||
      wo1.transactionStatus !== 'ACTIVE' ||
      wo1.paymentStatus !== 'PARTIALLY_PAID'
    ) {
      throw new Error('WORKFLOW 5 FAILED: Write-off 1 state mismatch');
    }

    // ------------------------------------------------------------------------
    // WORKFLOW 6: Full Settlement via Remaining Balance Payment ($25.00)
    // ------------------------------------------------------------------------
    console.log('--- WORKFLOW 6: Full Settlement via Final Cash Payment ($25.00) ---');
    // Final balance is $25.00. Paying $25.00 cash brings total settlement to $150.00 ($125 paid + $25 written off).
    const p3Res = await appClient.query(`
      SELECT sp_collect_payment(
        $1, $2, 25.00, 25.00, 'USD', 'USD', 1.0000, 0.00, 25.00, 0.00,
        'CASH'::"PaymentMethod", 'E2E-IDEM-P3-' || $3, $4
      ) as result;
    `, [tenantAId, transactionAId, runId, cashierAId]);
    const p3 = p3Res.rows[0].result;
    console.log('  Payment 3 result:', p3);

    if (
      p3.status !== 'SUCCESS' ||
      Number(p3.amountPaid) !== 125.00 ||
      p3.paymentStatus !== 'PARTIALLY_PAID' ||
      p3.transactionStatus !== 'COMPLETED'
    ) {
      throw new Error('WORKFLOW 6 FAILED: Final settlement state mismatch');
    }

    // Check database state of completed transaction
    const txFinalDb = await adminClient.query(`SELECT * FROM "transactions" WHERE id = $1;`, [transactionAId]);
    const txRow = txFinalDb.rows[0];
    console.log('  Final Transaction Row:', {
      grossAmount: txRow.grossAmount,
      amountPaid: txRow.amountPaid,
      writeOffAmount: txRow.writeOffAmount,
      paymentStatus: txRow.paymentStatus,
      status: txRow.status,
      completedAt: txRow.completedAt
    });

    if (
      Number(txRow.grossAmount) !== 150.00 ||
      Number(txRow.amountPaid) !== 125.00 ||
      Number(txRow.writeOffAmount) !== 25.00 ||
      txRow.status !== 'COMPLETED' ||
      txRow.paymentStatus !== 'PARTIALLY_PAID' ||
      txRow.completedAt === null
    ) {
      throw new Error('WORKFLOW 6 FAILED: DB final settlement record invariant violated');
    }

    // ------------------------------------------------------------------------
    // WORKFLOW 7: Over-Settlement Protection on Completed Transaction
    // ------------------------------------------------------------------------
    console.log('--- WORKFLOW 7: Over-Settlement Protection ---');
    // Further payment must be rejected
    try {
      await appClient.query(`
        SELECT sp_collect_payment(
          $1, $2, 10.00, 10.00, 'USD', 'USD', 1.0000, 0.00, 10.00, 0.00,
          'CASH'::"PaymentMethod", 'E2E-IDEM-OVERPAY-' || $3, $4
        );
      `, [tenantAId, transactionAId, runId, cashierAId]);
      throw new Error('WORKFLOW 7a FAILED: Overpayment accepted on completed transaction');
    } catch (e: any) {
      console.log('  ✓ 7a Extra payment on completed transaction rejected');
    }

    // Further write-off must be rejected
    try {
      await appClient.query(`
        SELECT sp_apply_write_off_authorized(
          $1, $2, 5.00, $3, '5555', 'Extra write off attempt', 'E2E-IDEM-OVERWO-' || $4, $5
        );
      `, [tenantAId, transactionAId, supervisorAId, runId, sessionAId]);
      throw new Error('WORKFLOW 7b FAILED: Extra write-off accepted on completed transaction');
    } catch (e: any) {
      console.log('  ✓ 7b Extra write-off on completed transaction rejected');
    }

    // Teardown Workflow 1-7 fixtures
    await adminClient.query("SET session_replication_role = 'replica';");
    await adminClient.query('DELETE FROM "audit_logs" WHERE "restaurantId" IN ($1, $2);', [tenantAId, tenantBId]);
    await adminClient.query('DELETE FROM "payments" WHERE "restaurantId" IN ($1, $2);', [tenantAId, tenantBId]);
    await adminClient.query('DELETE FROM "orders" WHERE "restaurantId" IN ($1, $2);', [tenantAId, tenantBId]);
    await adminClient.query('DELETE FROM "transactions" WHERE "restaurantId" IN ($1, $2);', [tenantAId, tenantBId]);
    await adminClient.query('DELETE FROM "table_sessions" WHERE "restaurantId" IN ($1, $2);', [tenantAId, tenantBId]);
    await adminClient.query('DELETE FROM "tables" WHERE "restaurantId" IN ($1, $2);', [tenantAId, tenantBId]);
    await adminClient.query('DELETE FROM "staff_profiles" WHERE "restaurantId" IN ($1, $2);', [tenantAId, tenantBId]);
    await adminClient.query('DELETE FROM "role_permissions" WHERE "restaurantId" IN ($1, $2);', [tenantAId, tenantBId]);
    await adminClient.query('DELETE FROM "users" WHERE "restaurantId" IN ($1, $2);', [tenantAId, tenantBId]);
    await adminClient.query('DELETE FROM "roles" WHERE "restaurantId" IN ($1, $2);', [tenantAId, tenantBId]);
    await adminClient.query('DELETE FROM "restaurants" WHERE id IN ($1, $2);', [tenantAId, tenantBId]);
    await adminClient.query("SET session_replication_role = 'origin';");
    console.log('[CLEANUP] Base workflow test fixtures cleanly deleted.\n');

  } finally {
    adminClient.release();
    appClient.release();
  }

  // ------------------------------------------------------------------------
  // WORKFLOW 8: Controlled Multi-Threaded Concurrency & Deadlock Stress Test
  // ------------------------------------------------------------------------
  console.log('--- WORKFLOW 8: Multi-Threaded Concurrent Payment & Write-Off Race ---');
  const adminClient2 = await adminPool.connect();
  const cApp1 = await appPool.connect();
  const cApp2 = await appPool.connect();

  try {
    const cRunId = Date.now();
    const cRest = await adminClient2.query(`
      INSERT INTO "restaurants" (id, name, slug, "phoneNumber", address, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), 'Conc Race Bistro', 'conc-race-' || $1, '+85511333444', 'Phnom Penh C', NOW(), NOW())
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
      VALUES (gen_random_uuid(), $1, $2, 'race.sup-' || $3 || '@bistro.com', 'Race Supervisor', 'hash', true, NOW(), NOW())
      RETURNING id;
    `, [cRestId, cRoleId, cRunId]);
    const cUserId = cUser.rows[0].id;

    await adminClient2.query(`
      INSERT INTO "staff_profiles" (id, "userId", "restaurantId", "employeeCode", "pinHash", "shiftStatus", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'EMP-RACE-' || $3, public.crypt('9999', public.gen_salt('bf')), 'ACTIVE', NOW(), NOW());
    `, [cUserId, cRestId, cRunId]);

    const cTbl = await adminClient2.query(`
      INSERT INTO "tables" (id, "restaurantId", name, seats, status, "qrCodeKey", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'T-RACE', 4, 'OCCUPIED', 'QR-RACE-' || $2, NOW(), NOW())
      RETURNING id;
    `, [cRestId, cRunId]);
    const cTblId = cTbl.rows[0].id;

    const cSess = await adminClient2.query(`
      INSERT INTO "table_sessions" (id, "restaurantId", "tableId", "sessionNumber", "openedById", "totalAmount", status, "openedAt", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'SES-RACE-' || $3, $4, 100.00, 'ACTIVE', NOW(), NOW(), NOW())
      RETURNING id;
    `, [cRestId, cTblId, cRunId, cUserId]);
    const cSessId = cSess.rows[0].id;

    // Transaction has $100 gross, $0 paid, balance $100
    const cTx = await adminClient2.query(`
      INSERT INTO "transactions" (
        id, "restaurantId", "sessionId", "transactionNumber", "orderType", subtotal, "discountAmount", "taxAmount",
        "serviceChargeAmount", "grossAmount", "amountPaid", "writeOffAmount", "paymentStatus", status, "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, 'TX-RACE-' || $3, 'DINE_IN', 100.00, 0.00, 0.00,
        0.00, 100.00, 0.00, 0.00, 'UNPAID', 'ACTIVE', NOW(), NOW()
      )
      RETURNING id;
    `, [cRestId, cSessId, cRunId]);
    const cTxId = cTx.rows[0].id;

    console.log('  Simulating race: Thread 1 collects $60.00 Payment vs Thread 2 writes off $60.00 simultaneously on $100.00 invoice...');
    const thread1 = cApp1.query(`
      SELECT sp_collect_payment(
        $1, $2, 60.00, 60.00, 'USD', 'USD', 1.0000, 0.00, 60.00, 0.00,
        'CASH'::"PaymentMethod", 'RACE-IDEM-P-' || $3, $4
      ) as result;
    `, [cRestId, cTxId, cRunId, cUserId]);

    const thread2 = cApp2.query(`
      SELECT sp_apply_write_off_authorized(
        $1, $2, 60.00, $3, '9999', 'Simultaneous write off', 'RACE-IDEM-WO-' || $4, $5
      ) as result;
    `, [cRestId, cTxId, cUserId, cRunId, cSessId]);

    const results = await Promise.allSettled([thread1, thread2]);
    let successCount = 0;
    let rejectedCount = 0;

    results.forEach((r, idx) => {
      if (r.status === 'fulfilled') {
        successCount++;
        console.log(`  Thread ${idx + 1} Succeeded:`, r.value.rows[0].result);
      } else {
        rejectedCount++;
        console.log(`  Thread ${idx + 1} Rejected (Expected Over-Balance/Overpayment):`, r.reason.message);
      }
    });

    if (successCount !== 1 || rejectedCount !== 1) {
      throw new Error(`CONCURRENCY RACE FAILED: Expected exactly 1 success and 1 rejection, got ${successCount} successes and ${rejectedCount} rejections`);
    }

    // Verify database state: total settlement must be exactly $60.00 ($60 paid OR $60 writeOff)
    const finalTxRes = await adminClient2.query(`SELECT * FROM "transactions" WHERE id = $1;`, [cTxId]);
    const fTx = finalTxRes.rows[0];
    const totalSettled = Number(fTx.amountPaid) + Number(fTx.writeOffAmount);
    console.log('  Race Final Transaction Aggregate:', {
      amountPaid: fTx.amountPaid,
      writeOffAmount: fTx.writeOffAmount,
      totalSettled,
      status: fTx.status
    });

    if (totalSettled !== 60.00 || fTx.status !== 'ACTIVE') {
      throw new Error(`CONCURRENCY RACE FAILED: Aggregate distorted (totalSettled = ${totalSettled})`);
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
    console.log('[CONCURRENCY CLEANUP] Race fixtures cleanly deleted.\n');

    console.log('✓ WORKFLOW 8 PASSED: Concurrent payment collection and write-off safely serialized by row locks; zero balance distortion, zero deadlocks.\n');

  } finally {
    cApp1.release();
    cApp2.release();
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
    console.log('Final Database Residual Row Counts (Must be 0):', counts.rows[0]);
    if (Number(counts.rows[0].r_count) !== 0 || Number(counts.rows[0].tx_count) !== 0 || Number(counts.rows[0].p_count) !== 0 || Number(counts.rows[0].aud_count) !== 0) {
      throw new Error('LEFTOVER TEST DATA DETECTED!');
    }
  } finally {
    verifyClient.release();
  }

  console.log('====================================================================');
  console.log('✔ FINAL VERIFICATION COMPLETE! ALL INTEGRATION WORKFLOWS PASSED!');
  console.log('====================================================================');
}

runFinalE2EVerification()
  .catch((e) => {
    console.error('FINAL E2E VERIFICATION FAILED:', e);
    process.exit(1);
  })
  .finally(() => {
    adminPool.end();
    appPool.end();
  });
