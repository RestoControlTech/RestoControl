import { Pool, PoolClient } from 'pg';

const adminUrl = 'postgresql://postgres:postgres@localhost:5434/restocontrol_dev';
const appUrl = 'postgresql://resto_app:resto_app_dev_secret@localhost:5434/restocontrol_dev';

const adminPool = new Pool({ connectionString: adminUrl });
const appPool = new Pool({ connectionString: appUrl });

async function runTests() {
  console.log('====================================================================');
  console.log('STEP 1F-E1 SECURITY HARDENING: REGRESSION & PRIVILEGE VERIFICATION');
  console.log('====================================================================\n');

  const adminClient: PoolClient = await adminPool.connect();
  const appClient: PoolClient = await appPool.connect();

  try {
    console.log('[SETUP] Provisioning isolated test fixtures via administrative client...');

    // 1. Restaurant
    const r1 = await adminClient.query(`
      INSERT INTO "restaurants" (id, name, slug, "phoneNumber", address, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), 'Hardened Bistro', 'hardened-bistro', '+85512345678', 'Street 240, Phnom Penh', NOW(), NOW())
      RETURNING id;
    `);
    const restaurantId = r1.rows[0].id;

    const r2 = await adminClient.query(`
      INSERT INTO "restaurants" (id, name, slug, "phoneNumber", address, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), 'Rival Hardened Bistro', 'rival-hardened-bistro', '+85598765432', 'Riverside, Phnom Penh', NOW(), NOW())
      RETURNING id;
    `);
    const rivalRestaurantId = r2.rows[0].id;

    // 2. Roles & Users
    const role1 = await adminClient.query(`
      INSERT INTO "roles" (id, "restaurantId", name, "displayName", description, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'CASHIER', 'Cashier', 'POS Cashier Role', NOW(), NOW())
      RETURNING id;
    `, [restaurantId]);
    const roleId = role1.rows[0].id;

    const rivalRole = await adminClient.query(`
      INSERT INTO "roles" (id, "restaurantId", name, "displayName", description, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'CASHIER', 'Cashier', 'POS Cashier Role', NOW(), NOW())
      RETURNING id;
    `, [rivalRestaurantId]);
    const rivalRoleId = rivalRole.rows[0].id;

    const u1 = await adminClient.query(`
      INSERT INTO "users" (id, "restaurantId", "roleId", email, name, "passwordHash", "isActive", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'cashier@hardenedbistro.com', 'Alice Cashier', 'hash_pw', true, NOW(), NOW())
      RETURNING id;
    `, [restaurantId, roleId]);
    const cashierId = u1.rows[0].id;

    const u2 = await adminClient.query(`
      INSERT INTO "users" (id, "restaurantId", "roleId", email, name, "passwordHash", "isActive", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'inactive@hardenedbistro.com', 'Inactive Cashier', 'hash_pw', false, NOW(), NOW())
      RETURNING id;
    `, [restaurantId, roleId]);
    const inactiveUserId = u2.rows[0].id;

    const u3 = await adminClient.query(`
      INSERT INTO "users" (id, "restaurantId", "roleId", email, name, "passwordHash", "isActive", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'cashier@rivalhardened.com', 'Rival Cashier', 'hash_pw', true, NOW(), NOW())
      RETURNING id;
    `, [rivalRestaurantId, rivalRoleId]);
    const rivalUserId = u3.rows[0].id;

    // 3. Table & Session
    const t1 = await adminClient.query(`
      INSERT INTO "tables" (id, "restaurantId", name, seats, status, "qrCodeKey", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'T-101', 4, 'OCCUPIED', 'QR-T101-SEC', NOW(), NOW())
      RETURNING id;
    `, [restaurantId]);
    const tableId = t1.rows[0].id;

    const s1 = await adminClient.query(`
      INSERT INTO "table_sessions" (id, "restaurantId", "tableId", "sessionNumber", "openedById", "totalAmount", status, "openedAt", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'SES-101', $3, 50.00, 'ACTIVE', NOW(), NOW(), NOW())
      RETURNING id;
    `, [restaurantId, tableId, cashierId]);
    const sessionId = s1.rows[0].id;

    // 4. Order
    const o1 = await adminClient.query(`
      INSERT INTO "orders" (id, "restaurantId", "sessionId", "createdById", "orderNumber", "orderType", subtotal, "discountAmount", "taxAmount", "serviceChargeAmount", total, status, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, $3, 'ORD-101', 'DINE_IN', 50.00, 0.00, 0.00, 0.00, 50.00, 'SERVED', NOW(), NOW())
      RETURNING id;
    `, [restaurantId, sessionId, cashierId]);
    const orderId = o1.rows[0].id;

    // 5. Transaction ($50.00 gross invoice, currently unpaid)
    const tx1 = await adminClient.query(`
      INSERT INTO "transactions" (
        id, "restaurantId", "sessionId", "transactionNumber", "orderType", subtotal, "discountAmount", "taxAmount",
        "serviceChargeAmount", "grossAmount", "amountPaid", "writeOffAmount", "paymentStatus", status, "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, 'TX-101', 'DINE_IN', 50.00, 0.00, 0.00,
        0.00, 50.00, 0.00, 0.00, 'UNPAID', 'ACTIVE', NOW(), NOW()
      )
      RETURNING id;
    `, [restaurantId, sessionId]);
    const transactionId = tx1.rows[0].id;

    console.log(`[SETUP] Done. Restaurant: ${restaurantId}, Transaction: ${transactionId}, Gross: $50.00\n`);

    // Verify current user of appClient is resto_app
    const whoami = await appClient.query('SELECT current_user, session_user;');
    console.log('[SECURITY VERIFICATION] appClient is connected as:', whoami.rows[0]);
    if (whoami.rows[0].current_user !== 'resto_app') {
      throw new Error(`Expected resto_app, got ${whoami.rows[0].current_user}`);
    }

    // Helper to call sp_collect_payment using appClient (running under resto_owner privileges)
    const callCollectPayment = async (
      cl: PoolClient,
      params: {
        restaurantId: string;
        txId: string;
        amount: number;
        tenderAmount: number;
        currency: string;
        tenderCurrency: string;
        rate: number;
        roundingAdj: number;
        cashReceived: number | null;
        changeGiven: number | null;
        method: string;
        idempotencyKey: string;
        processedById: string;
        gatewayRef?: string | null;
      }
    ) => {
      const res = await cl.query(
        `SELECT sp_collect_payment($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::"PaymentMethod", $12, $13, $14) AS result;`,
        [
          params.restaurantId,
          params.txId,
          params.amount,
          params.tenderAmount,
          params.currency,
          params.tenderCurrency,
          params.rate,
          params.roundingAdj,
          params.cashReceived,
          params.changeGiven,
          params.method,
          params.idempotencyKey,
          params.processedById,
          params.gatewayRef || null
        ]
      );
      return res.rows[0].result;
    };

    // ------------------------------------------------------------------------
    // REGRESSION TEST 1: Successful Cash Payment (USD Accounting + KHR Tender, Partial)
    // ------------------------------------------------------------------------
    console.log('--- REGRESSION 1: Successful Cash Payment (USD Accounting + KHR Tender, Partial) ---');
    const idemKey1 = 'IDEM-CASH-TEST-001';
    // $20.00 USD at 4,100 KHR = 82,000 KHR. Cash received = 100,000 KHR, change = 18,000 KHR.
    const t1Res = await callCollectPayment(appClient, {
      restaurantId,
      txId: transactionId,
      amount: 20.00,
      tenderAmount: 82000.00,
      currency: 'USD',
      tenderCurrency: 'KHR',
      rate: 4100.0000,
      roundingAdj: 0.00,
      cashReceived: 100000.00,
      changeGiven: 18000.00,
      method: 'CASH',
      idempotencyKey: idemKey1,
      processedById: cashierId
    });

    console.log('Result 1:', t1Res);
    if (t1Res.status !== 'SUCCESS' || t1Res.idempotentReplay !== false || Number(t1Res.amountPaid) !== 20.00 || t1Res.transactionStatus !== 'ACTIVE' || t1Res.paymentStatus !== 'PARTIALLY_PAID') {
      throw new Error(`REGRESSION 1 Failed: unexpected return ${JSON.stringify(t1Res)}`);
    }

    const txAfter1 = await adminClient.query('SELECT "amountPaid", "paymentStatus", status, "completedAt" FROM "transactions" WHERE id = $1', [transactionId]);
    if (Number(txAfter1.rows[0].amountPaid) !== 20.00 || txAfter1.rows[0].paymentStatus !== 'PARTIALLY_PAID' || txAfter1.rows[0].status !== 'ACTIVE' || txAfter1.rows[0].completedAt !== null) {
      throw new Error(`REGRESSION 1 DB verification failed: ${JSON.stringify(txAfter1.rows[0])}`);
    }
    console.log('✓ REGRESSION 1 PASSED: $20.00 cash payment accepted under resto_owner SECURITY DEFINER.\n');

    // ------------------------------------------------------------------------
    // REGRESSION TEST 2: Successful Card Payment
    // ------------------------------------------------------------------------
    console.log('--- REGRESSION 2: Successful Card Payment (Partial $15.00) ---');
    const idemKey2 = 'IDEM-CARD-TEST-002';
    const t2Res = await callCollectPayment(appClient, {
      restaurantId,
      txId: transactionId,
      amount: 15.00,
      tenderAmount: 15.00,
      currency: 'USD',
      tenderCurrency: 'USD',
      rate: 1.0000,
      roundingAdj: 0.00,
      cashReceived: null,
      changeGiven: null,
      method: 'CREDIT_CARD',
      idempotencyKey: idemKey2,
      processedById: cashierId,
      gatewayRef: 'AUTH_CARD_987654'
    });

    console.log('Result 2:', t2Res);
    if (t2Res.status !== 'SUCCESS' || Number(t2Res.amountPaid) !== 35.00 || t2Res.transactionStatus !== 'ACTIVE' || t2Res.paymentStatus !== 'PARTIALLY_PAID') {
      throw new Error(`REGRESSION 2 Failed: unexpected return ${JSON.stringify(t2Res)}`);
    }

    const txAfter2 = await adminClient.query('SELECT "amountPaid", "paymentStatus", status FROM "transactions" WHERE id = $1', [transactionId]);
    if (Number(txAfter2.rows[0].amountPaid) !== 35.00 || txAfter2.rows[0].paymentStatus !== 'PARTIALLY_PAID' || txAfter2.rows[0].status !== 'ACTIVE') {
      throw new Error(`REGRESSION 2 DB state invalid: ${JSON.stringify(txAfter2.rows[0])}`);
    }
    console.log('✓ REGRESSION 2 PASSED: Non-cash card payment accepted, amountPaid synchronized to $35.00.\n');

    // ------------------------------------------------------------------------
    // REGRESSION TEST 3: Partial Payment State Verification
    // ------------------------------------------------------------------------
    console.log('--- REGRESSION 3: Partial Payment State & Invariant Checks ---');
    if (txAfter2.rows[0].status !== 'ACTIVE' || txAfter2.rows[0].paymentStatus !== 'PARTIALLY_PAID' || Number(txAfter2.rows[0].amountPaid) !== 35.00) {
      throw new Error('REGRESSION 3 Failed: Transaction state is not ACTIVE PARTIALLY_PAID');
    }
    console.log('✓ REGRESSION 3 PASSED: Active tab with partial balance accurately maintained.\n');

    // ------------------------------------------------------------------------
    // REGRESSION TEST 4: Overpayment Rejection
    // ------------------------------------------------------------------------
    console.log('--- REGRESSION 4: Overpayment Rejection ($35 paid + $20 attempted > $50 gross) ---');
    let overpayCaught = false;
    try {
      await callCollectPayment(appClient, {
        restaurantId,
        txId: transactionId,
        amount: 20.00, // Remaining balance is $15.00
        tenderAmount: 20.00,
        currency: 'USD',
        tenderCurrency: 'USD',
        rate: 1.0000,
        roundingAdj: 0.00,
        cashReceived: null,
        changeGiven: null,
        method: 'CREDIT_CARD',
        idempotencyKey: 'IDEM-OVERPAY-001',
        processedById: cashierId
      });
    } catch (err: any) {
      overpayCaught = true;
      console.log('Expected check_violation caught:', err.message);
    }
    if (!overpayCaught) {
      throw new Error('REGRESSION 4 Failed: Overpayment was NOT rejected!');
    }
    console.log('✓ REGRESSION 4 PASSED: Overpayment strictly blocked by sp_collect_payment validation.\n');

    // ------------------------------------------------------------------------
    // REGRESSION TEST 5: Full Payment Completing the Transaction
    // ------------------------------------------------------------------------
    console.log('--- REGRESSION 5: Full Payment Completing Transaction (Remaining $15.00) ---');
    const idemKey3 = 'IDEM-FINAL-TEST-003';
    const t5Res = await callCollectPayment(appClient, {
      restaurantId,
      txId: transactionId,
      amount: 15.00,
      tenderAmount: 15.00,
      currency: 'USD',
      tenderCurrency: 'USD',
      rate: 1.0000,
      roundingAdj: 0.00,
      cashReceived: null,
      changeGiven: null,
      method: 'CREDIT_CARD',
      idempotencyKey: idemKey3,
      processedById: cashierId
    });

    console.log('Result 5:', t5Res);
    if (t5Res.status !== 'SUCCESS' || Number(t5Res.amountPaid) !== 50.00 || t5Res.transactionStatus !== 'COMPLETED' || t5Res.paymentStatus !== 'PAID') {
      throw new Error(`REGRESSION 5 Failed: unexpected return ${JSON.stringify(t5Res)}`);
    }

    const txAfter5 = await adminClient.query('SELECT "amountPaid", "paymentStatus", status, "completedAt" FROM "transactions" WHERE id = $1', [transactionId]);
    if (Number(txAfter5.rows[0].amountPaid) !== 50.00 || txAfter5.rows[0].paymentStatus !== 'PAID' || txAfter5.rows[0].status !== 'COMPLETED' || txAfter5.rows[0].completedAt === null) {
      throw new Error(`REGRESSION 5 DB state invalid: ${JSON.stringify(txAfter5.rows[0])}`);
    }
    console.log('✓ REGRESSION 5 PASSED: Full payment completed transaction (COMPLETED / PAID).\n');

    // ------------------------------------------------------------------------
    // REGRESSION TEST 6: Idempotency Replay (Same Key, Same Payload)
    // ------------------------------------------------------------------------
    console.log('--- REGRESSION 6: Idempotent Replay Returns Existing Payment ---');
    const t6Res = await callCollectPayment(appClient, {
      restaurantId,
      txId: transactionId,
      amount: 20.00,
      tenderAmount: 82000.00,
      currency: 'USD',
      tenderCurrency: 'KHR',
      rate: 4100.0000,
      roundingAdj: 0.00,
      cashReceived: 100000.00,
      changeGiven: 18000.00,
      method: 'CASH',
      idempotencyKey: idemKey1,
      processedById: cashierId
    });

    console.log('Result 6:', t6Res);
    if (t6Res.status !== 'SUCCESS' || t6Res.idempotentReplay !== true || t6Res.paymentId !== t1Res.paymentId || Number(t6Res.amountPaid) !== 50.00) {
      throw new Error(`REGRESSION 6 Failed: expected idempotent replay of ${t1Res.paymentId}, got ${JSON.stringify(t6Res)}`);
    }

    const pCount1 = await adminClient.query('SELECT count(*) as count FROM "payments" WHERE "transactionId" = $1', [transactionId]);
    if (Number(pCount1.rows[0].count) !== 3) {
      throw new Error(`REGRESSION 6 Duplicate insert detected: count is ${pCount1.rows[0].count}`);
    }
    console.log('✓ REGRESSION 6 PASSED: Idempotent replay safely returned existing record without inserting duplicate rows.\n');

    // ------------------------------------------------------------------------
    // REGRESSION TEST 7: Changed-Payload Replay Rejection
    // ------------------------------------------------------------------------
    console.log('--- REGRESSION 7: Changed-Payload Replay Rejection ---');
    let replayMismatchCaught = false;
    try {
      await callCollectPayment(appClient, {
        restaurantId,
        txId: transactionId,
        amount: 25.00, // Modified from 20.00
        tenderAmount: 82000.00,
        currency: 'USD',
        tenderCurrency: 'KHR',
        rate: 4100.0000,
        roundingAdj: 0.00,
        cashReceived: 100000.00,
        changeGiven: 18000.00,
        method: 'CASH',
        idempotencyKey: idemKey1,
        processedById: cashierId
      });
    } catch (err: any) {
      replayMismatchCaught = true;
      console.log('Expected check_violation caught on payload mismatch:', err.message);
    }
    if (!replayMismatchCaught) {
      throw new Error('REGRESSION 7 Failed: Changed-payload replay was NOT rejected!');
    }
    console.log('✓ REGRESSION 7 PASSED: Idempotent reuse with modified payload rejected.\n');

    // ------------------------------------------------------------------------
    // REGRESSION TEST 8: Cross-Tenant Caller Rejection
    // ------------------------------------------------------------------------
    console.log('--- REGRESSION 8: Cross-Tenant Caller Rejection ---');
    let crossTenantCaught = false;
    try {
      await callCollectPayment(appClient, {
        restaurantId,
        txId: transactionId,
        amount: 5.00,
        tenderAmount: 5.00,
        currency: 'USD',
        tenderCurrency: 'USD',
        rate: 1.0000,
        roundingAdj: 0.00,
        cashReceived: null,
        changeGiven: null,
        method: 'CREDIT_CARD',
        idempotencyKey: 'IDEM-RIVAL-TENANT',
        processedById: rivalUserId
      });
    } catch (err: any) {
      crossTenantCaught = true;
      console.log('Expected insufficient_privilege caught:', err.message);
    }
    if (!crossTenantCaught) {
      throw new Error('REGRESSION 8 Failed: Cross-tenant caller was NOT rejected!');
    }
    console.log('✓ REGRESSION 8 PASSED: Cross-tenant user rejected with insufficient_privilege.\n');

    // ------------------------------------------------------------------------
    // REGRESSION TEST 9: Unauthorized Direct Payment Modification
    // ------------------------------------------------------------------------
    console.log('--- REGRESSION 9: Unauthorized Direct Payment Modification (Bypassing Function) ---');
    
    // 9a. Direct DELETE on SUCCESS payment by resto_app
    let directDeleteBlocked = false;
    try {
      await appClient.query('DELETE FROM public."payments" WHERE id = $1', [t1Res.paymentId]);
    } catch (err: any) {
      directDeleteBlocked = true;
      console.log('✓ 9a Direct DELETE blocked on payment:', err.message);
    }
    if (!directDeleteBlocked) {
      throw new Error('REGRESSION 9a Failed: resto_app was able to delete payment directly!');
    }

    // 9b. Direct UPDATE of financial fields on SUCCESS payment by resto_app
    let directUpdateBlocked = false;
    try {
      await appClient.query('UPDATE public."payments" SET amount = 999.00 WHERE id = $1', [t1Res.paymentId]);
    } catch (err: any) {
      directUpdateBlocked = true;
      console.log('✓ 9b Direct UPDATE of amount blocked on payment:', err.message);
    }
    if (!directUpdateBlocked) {
      throw new Error('REGRESSION 9b Failed: resto_app was able to update payment amount directly!');
    }

    // 9c. Direct status change to CANCELLED on SUCCESS payment by resto_app
    let directCancelBlocked = false;
    try {
      await appClient.query('UPDATE public."payments" SET status = \'CANCELLED\' WHERE id = $1', [t1Res.paymentId]);
    } catch (err: any) {
      directCancelBlocked = true;
      console.log('✓ 9c Direct status change to CANCELLED blocked:', err.message);
    }
    if (!directCancelBlocked) {
      throw new Error('REGRESSION 9c Failed: resto_app was able to cancel successful payment!');
    }

    // 9d. Direct alteration of writeOffAmount by resto_app
    let writeOffBlocked = false;
    try {
      await appClient.query('UPDATE public."transactions" SET "writeOffAmount" = 50.00 WHERE id = $1', [transactionId]);
    } catch (err: any) {
      writeOffBlocked = true;
      console.log('✓ 9d Direct UPDATE of writeOffAmount blocked:', err.message);
    }
    if (!writeOffBlocked) {
      throw new Error('REGRESSION 9d Failed: resto_app was able to update writeOffAmount directly!');
    }

    // 9e. Direct alteration of function owner or DDL by resto_app
    let ddlBlocked = false;
    try {
      await appClient.query('ALTER FUNCTION public.sp_collect_payment OWNER TO resto_app;');
    } catch (err: any) {
      ddlBlocked = true;
      console.log('✓ 9e DDL / Alter function blocked:', err.message);
    }
    if (!ddlBlocked) {
      throw new Error('REGRESSION 9e Failed: resto_app was able to alter function ownership!');
    }

    console.log('✓ REGRESSION 9 PASSED: All direct unauthorized modifications strictly blocked by triggers and privilege boundaries.\n');

    // Cleanup initial regression fixtures
    await adminClient.query("SET session_replication_role = 'replica';");
    await adminClient.query('DELETE FROM "payments" WHERE "restaurantId" = $1', [restaurantId]);
    await adminClient.query('DELETE FROM "transactions" WHERE "restaurantId" = $1', [restaurantId]);
    await adminClient.query('DELETE FROM "orders" WHERE "restaurantId" = $1', [restaurantId]);
    await adminClient.query('DELETE FROM "table_sessions" WHERE "restaurantId" = $1', [restaurantId]);
    await adminClient.query('DELETE FROM "tables" WHERE "restaurantId" = $1', [restaurantId]);
    await adminClient.query('DELETE FROM "users" WHERE "restaurantId" IN ($1, $2)', [restaurantId, rivalRestaurantId]);
    await adminClient.query('DELETE FROM "roles" WHERE "restaurantId" IN ($1, $2)', [restaurantId, rivalRestaurantId]);
    await adminClient.query('DELETE FROM "restaurants" WHERE id IN ($1, $2)', [restaurantId, rivalRestaurantId]);
    await adminClient.query("SET session_replication_role = 'origin';");
    console.log('[CLEANUP] Initial regression fixtures cleanly deleted.\n');

  } finally {
    adminClient.release();
    appClient.release();
  }

  // --------------------------------------------------------------------------
  // REGRESSION TEST 10: Concurrent Payment Requests Under resto_app
  // --------------------------------------------------------------------------
  console.log('--- REGRESSION 10: Concurrent Payment Requests Under resto_app ---');
  const concApp1 = await appPool.connect();
  const concApp2 = await appPool.connect();
  const adminClient2 = await adminPool.connect();

  try {
    const rest = await adminClient2.query(`
      INSERT INTO "restaurants" (id, name, slug, "phoneNumber", address, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), 'Concurrent Bistro', 'concurrent-bistro', '+85511223344', 'Monivong Blvd', NOW(), NOW())
      RETURNING id;
    `);
    const cRestId = rest.rows[0].id;

    const role = await adminClient2.query(`
      INSERT INTO "roles" (id, "restaurantId", name, "displayName", description, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'CONCURRENT_CASHIER', 'Concurrent Cashier', 'Role', NOW(), NOW())
      RETURNING id;
    `, [cRestId]);

    const user = await adminClient2.query(`
      INSERT INTO "users" (id, "restaurantId", "roleId", email, name, "passwordHash", "isActive", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'concurrent@bistro.com', 'Concurrent Cashier', 'hash', true, NOW(), NOW())
      RETURNING id;
    `, [cRestId, role.rows[0].id]);
    const cCashierId = user.rows[0].id;

    const table = await adminClient2.query(`
      INSERT INTO "tables" (id, "restaurantId", name, seats, status, "qrCodeKey", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'T-CONC', 2, 'OCCUPIED', 'QR-TCONC-2', NOW(), NOW())
      RETURNING id;
    `, [cRestId]);

    const session = await adminClient2.query(`
      INSERT INTO "table_sessions" (id, "restaurantId", "tableId", "sessionNumber", "openedById", "totalAmount", status, "openedAt", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'SES-CONC', $3, 100.00, 'ACTIVE', NOW(), NOW(), NOW())
      RETURNING id;
    `, [cRestId, table.rows[0].id, cCashierId]);

    const tx = await adminClient2.query(`
      INSERT INTO "transactions" (
        id, "restaurantId", "sessionId", "transactionNumber", "orderType", subtotal, "discountAmount", "taxAmount",
        "serviceChargeAmount", "grossAmount", "amountPaid", "writeOffAmount", "paymentStatus", status, "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, 'TX-CONC', 'DINE_IN', 100.00, 0.00, 0.00,
        0.00, 100.00, 0.00, 0.00, 'UNPAID', 'ACTIVE', NOW(), NOW()
      )
      RETURNING id;
    `, [cRestId, session.rows[0].id]);
    const cTxId = tx.rows[0].id;

    console.log(`[CONCURRENCY SETUP] Transaction ${cTxId} created with gross $100.00. Testing simultaneous payment of $60.00 from two concurrent sessions under resto_app...`);

    const results = await Promise.allSettled([
      concApp1.query(
        `SELECT sp_collect_payment($1, $2, 60.00, 60.00, 'USD', 'USD', 1.0000, 0.00, NULL, NULL, 'CREDIT_CARD'::"PaymentMethod", 'IDEM-RACE-1', $3, 'AUTH-RACE-1') AS result;`,
        [cRestId, cTxId, cCashierId]
      ),
      concApp2.query(
        `SELECT sp_collect_payment($1, $2, 60.00, 60.00, 'USD', 'USD', 1.0000, 0.00, NULL, NULL, 'CREDIT_CARD'::"PaymentMethod", 'IDEM-RACE-2', $3, 'AUTH-RACE-2') AS result;`,
        [cRestId, cTxId, cCashierId]
      )
    ]);

    let successCount = 0;
    let rejectedCount = 0;

    results.forEach((r, idx) => {
      if (r.status === 'fulfilled') {
        successCount++;
        console.log(`  Thread ${idx + 1} Succeeded:`, r.value.rows[0].result);
      } else {
        rejectedCount++;
        console.log(`  Thread ${idx + 1} Rejected (Expected Overpayment):`, r.reason.message);
      }
    });

    if (successCount !== 1 || rejectedCount !== 1) {
      throw new Error(`CONCURRENCY TEST FAILED: Expected exactly 1 success and 1 overpayment rejection, got ${successCount} successes and ${rejectedCount} rejections`);
    }

    const finalTx = await adminClient2.query('SELECT "amountPaid", "paymentStatus", status FROM "transactions" WHERE id = $1', [cTxId]);
    console.log('Final Transaction state after concurrency race:', finalTx.rows[0]);
    if (Number(finalTx.rows[0].amountPaid) !== 60.00 || finalTx.rows[0].paymentStatus !== 'PARTIALLY_PAID') {
      throw new Error(`Invalid final amountPaid: ${finalTx.rows[0].amountPaid}`);
    }

    // Teardown concurrency fixtures
    await adminClient2.query("SET session_replication_role = 'replica';");
    await adminClient2.query('DELETE FROM "payments" WHERE "transactionId" = $1', [cTxId]);
    await adminClient2.query('DELETE FROM "transactions" WHERE id = $1', [cTxId]);
    await adminClient2.query('DELETE FROM "table_sessions" WHERE "restaurantId" = $1', [cRestId]);
    await adminClient2.query('DELETE FROM "tables" WHERE "restaurantId" = $1', [cRestId]);
    await adminClient2.query('DELETE FROM "users" WHERE "restaurantId" = $1', [cRestId]);
    await adminClient2.query('DELETE FROM "roles" WHERE "restaurantId" = $1', [cRestId]);
    await adminClient2.query('DELETE FROM "restaurants" WHERE id = $1', [cRestId]);
    await adminClient2.query("SET session_replication_role = 'origin';");
    console.log('[CONCURRENCY CLEANUP] Concurrent test fixtures cleanly deleted.\n');

    console.log('✓ REGRESSION 10 PASSED: Concurrency serialization verified under resto_app and resto_owner.\n');

  } finally {
    concApp1.release();
    concApp2.release();
    adminClient2.release();
  }

  // Final verification of 0 business rows
  const verifyClient = await adminPool.connect();
  try {
    const counts = await verifyClient.query(`
      SELECT
        (SELECT count(*) FROM "restaurants") as r_count,
        (SELECT count(*) FROM "transactions") as tx_count,
        (SELECT count(*) FROM "payments") as p_count;
    `);
    console.log('Final Business Table Row Counts (Must be 0):', counts.rows[0]);
    if (Number(counts.rows[0].r_count) !== 0 || Number(counts.rows[0].tx_count) !== 0 || Number(counts.rows[0].p_count) !== 0) {
      throw new Error('LEFTOVER TEST DATA DETECTED!');
    }
  } finally {
    verifyClient.release();
  }

  console.log('====================================================================');
  console.log('✔ ALL 10 REGRESSION TESTS PASSED! SECURITY DEFINER FULLY HARDENED!');
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
