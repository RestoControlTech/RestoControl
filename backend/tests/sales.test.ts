/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { generateToken } from '../src/utils/jwt.js';

async function runSalesTests() {
  console.log('====================================================================');
  console.log('STEP 2H-A: BACKEND SALES HISTORY API TEST SUITE');
  console.log('====================================================================\n');

  const app = createApp();
  const runId = Date.now();

  let restaurantAlpha: any = null;
  let restaurantBeta: any = null;
  let restaurantEmpty: any = null;

  try {
    // -----------------------------------------------------------------------
    // Setup isolated test tenants, roles, users, orders, transactions, payments
    // -----------------------------------------------------------------------
    console.log('[SETUP] Provisioning isolated multi-tenant fixtures...');

    restaurantAlpha = await prisma.restaurant.create({
      data: {
        name: `Alpha Sales ${runId}`,
        slug: `alpha-sales-${runId}`,
        primaryCurrency: 'USD',
        isActive: true,
      },
    });

    restaurantBeta = await prisma.restaurant.create({
      data: {
        name: `Beta Sales ${runId}`,
        slug: `beta-sales-${runId}`,
        primaryCurrency: 'USD',
        isActive: true,
      },
    });

    restaurantEmpty = await prisma.restaurant.create({
      data: {
        name: `Empty Sales ${runId}`,
        slug: `empty-sales-${runId}`,
        primaryCurrency: 'USD',
        isActive: true,
      },
    });

    const permSalesView = await prisma.permission.findUnique({
      where: { code: 'sales.view' },
    });
    if (!permSalesView) {
      throw new Error('Required permission "sales.view" not found in PostgreSQL');
    }

    const roleAlphaManager = await prisma.role.create({
      data: {
        restaurantId: restaurantAlpha.id,
        name: 'SALES_MANAGER',
        displayName: 'Sales Manager',
        permissions: {
          create: [{ permissionId: permSalesView.id }],
        },
      },
    });

    const roleAlphaNoSales = await prisma.role.create({
      data: {
        restaurantId: restaurantAlpha.id,
        name: 'LIMITED_STAFF',
        displayName: 'Limited Staff',
      },
    });

    const roleBetaManager = await prisma.role.create({
      data: {
        restaurantId: restaurantBeta.id,
        name: 'SALES_MANAGER',
        displayName: 'Sales Manager',
        permissions: {
          create: [{ permissionId: permSalesView.id }],
        },
      },
    });

    const roleEmptyManager = await prisma.role.create({
      data: {
        restaurantId: restaurantEmpty.id,
        name: 'SALES_MANAGER',
        displayName: 'Sales Manager',
        permissions: {
          create: [{ permissionId: permSalesView.id }],
        },
      },
    });

    const [{ dummyHash }] = await prisma.$queryRaw<Array<{ dummyHash: string }>>`
      SELECT public.crypt('TestPass123!', public.gen_salt('bf', 10)) AS "dummyHash"
    `;

    const userAlphaManager = await prisma.user.create({
      data: {
        restaurantId: restaurantAlpha.id,
        roleId: roleAlphaManager.id,
        name: 'Alpha Manager',
        email: `alpha-mgr-${runId}@test.local`,
        passwordHash: dummyHash,
        isActive: true,
      },
    });

    const userAlphaNoPerm = await prisma.user.create({
      data: {
        restaurantId: restaurantAlpha.id,
        roleId: roleAlphaNoSales.id,
        name: 'Alpha NoSales',
        email: `alpha-noperm-${runId}@test.local`,
        passwordHash: dummyHash,
        isActive: true,
      },
    });

    const userBetaManager = await prisma.user.create({
      data: {
        restaurantId: restaurantBeta.id,
        roleId: roleBetaManager.id,
        name: 'Beta Manager',
        email: `beta-mgr-${runId}@test.local`,
        passwordHash: dummyHash,
        isActive: true,
      },
    });

    const userEmptyManager = await prisma.user.create({
      data: {
        restaurantId: restaurantEmpty.id,
        roleId: roleEmptyManager.id,
        name: 'Empty Manager',
        email: `empty-mgr-${runId}@test.local`,
        passwordHash: dummyHash,
        isActive: true,
      },
    });

    const tokenAlpha = generateToken({
      userId: userAlphaManager.id,
      restaurantId: restaurantAlpha.id,
    });
    const tokenAlphaNoPerm = generateToken({
      userId: userAlphaNoPerm.id,
      restaurantId: restaurantAlpha.id,
    });
    const tokenBeta = generateToken({
      userId: userBetaManager.id,
      restaurantId: restaurantBeta.id,
    });
    const tokenEmpty = generateToken({
      userId: userEmptyManager.id,
      restaurantId: restaurantEmpty.id,
    });

    // Table, TableSession, Customer & Order in Alpha
    const tableAlpha5 = await prisma.table.create({
      data: {
        restaurantId: restaurantAlpha.id,
        name: 'Table 05',
        section: 'Main Dining',
        seats: 4,
        qrCodeKey: `qr-alpha-5-${runId}`,
      },
    });

    const sessionAlpha5 = await prisma.tableSession.create({
      data: {
        restaurantId: restaurantAlpha.id,
        tableId: tableAlpha5.id,
        sessionNumber: `SES-${runId}-1`,
        status: 'COMPLETED',
        openedById: userAlphaManager.id,
        closedById: userAlphaManager.id,
      },
    });

    const customerSokha = await prisma.customer.create({
      data: {
        restaurantId: restaurantAlpha.id,
        name: 'Sokha Chan',
        phone: '+85512000111',
      },
    });

    const orderAlpha1 = await prisma.order.create({
      data: {
        restaurantId: restaurantAlpha.id,
        sessionId: sessionAlpha5.id,
        createdById: userAlphaManager.id,
        customerId: customerSokha.id,
        orderNumber: 'ORD-ALPHA-1',
        source: 'POS',
        orderType: 'DINE_IN',
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        subtotal: '20.00',
        taxAmount: '2.00',
        serviceChargeAmount: '1.00',
        discountAmount: '0.00',
        total: '23.00',
        items: {
          create: [
            {
              productName: 'Lok Lak Beef',
              quantity: 2,
              unitPrice: '8.00',
              lineTotal: '16.00',
            },
            {
              productName: 'Iced Latte',
              quantity: 1,
              unitPrice: '4.00',
              lineTotal: '4.00',
            },
          ],
        },
      },
    });

    const orderAlpha2 = await prisma.order.create({
      data: {
        restaurantId: restaurantAlpha.id,
        createdById: userAlphaManager.id,
        orderNumber: 'ORD-ALPHA-2',
        source: 'POS',
        orderType: 'TAKEAWAY',
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        subtotal: '10.00',
        total: '10.00',
      },
    });

    const tableBeta1 = await prisma.table.create({
      data: {
        restaurantId: restaurantBeta.id,
        name: 'VIP 1',
        section: 'VIP',
        seats: 6,
        qrCodeKey: `qr-beta-1-${runId}`,
      },
    });

    const sessionBeta1 = await prisma.tableSession.create({
      data: {
        restaurantId: restaurantBeta.id,
        tableId: tableBeta1.id,
        sessionNumber: `SES-BETA-${runId}-1`,
        status: 'COMPLETED',
        openedById: userBetaManager.id,
        closedById: userBetaManager.id,
      },
    });

    // Deterministic timestamps (tx2 and tx3 share exact same createdAt for tie-breaker test)
    const tOld = new Date('2026-11-10T09:00:00.000Z');
    const tSame = new Date('2026-11-20T12:00:00.000Z');
    const tNew = new Date('2026-11-25T15:30:00.000Z');

    const txAlpha1 = await prisma.transaction.create({
      data: {
        restaurantId: restaurantAlpha.id,
        sessionId: sessionAlpha5.id,
        customerId: customerSokha.id,
        cashierId: userAlphaManager.id,
        transactionNumber: 'TX-ALPHA-1',
        tableName: 'Table 05',
        orderType: 'DINE_IN',
        currency: 'USD',
        subtotal: '20.00',
        taxAmount: '2.00',
        serviceChargeAmount: '1.00',
        discountAmount: '0.00',
        grossAmount: '23.00',
        amountPaid: '23.00',
        paymentStatus: 'PAID',
        status: 'COMPLETED',
        paymentSummary: 'Cash ($23.00)',
        itemSummary: '2x Lok Lak Beef, 1x Iced Latte',
        completedAt: tOld,
        createdAt: tOld,
        payments: {
          create: {
            processedById: userAlphaManager.id,
            method: 'CASH',
            status: 'SUCCESS',
            currency: 'USD',
            amount: '23.00',
            tenderCurrency: 'USD',
            tenderAmount: '23.00',
            cashReceived: '25.00',
            changeGiven: '2.00',
            paidAt: tOld,
          },
        },
      },
    });

    // Two transactions with identical createdAt (deterministic ordering by id DESC)
    const txAlphaTieA = await prisma.transaction.create({
      data: {
        id: '10000000-0000-4000-8000-000000000001',
        restaurantId: restaurantAlpha.id,
        directOrderId: orderAlpha2.id,
        cashierId: userAlphaManager.id,
        transactionNumber: 'TX-ALPHA-2',
        tableName: 'Table 02',
        orderType: 'TAKEAWAY',
        currency: 'USD',
        subtotal: '10.00',
        grossAmount: '10.00',
        amountPaid: '10.00',
        paymentStatus: 'PAID',
        status: 'COMPLETED',
        paymentSummary: 'KHQR ($10.00)',
        itemSummary: '1x Green Tea',
        completedAt: tSame,
        createdAt: tSame,
        payments: {
          create: {
            processedById: userAlphaManager.id,
            method: 'KHQR',
            status: 'SUCCESS',
            currency: 'USD',
            amount: '10.00',
            tenderCurrency: 'USD',
            tenderAmount: '10.00',
            paidAt: tSame,
          },
        },
      },
    });

    const txAlphaTieB = await prisma.transaction.create({
      data: {
        id: '20000000-0000-4000-8000-000000000002',
        restaurantId: restaurantAlpha.id,
        sessionId: sessionAlpha5.id,
        cashierId: userAlphaManager.id,
        transactionNumber: 'TX-ALPHA-3',
        tableName: 'Table 03',
        orderType: 'DINE_IN',
        currency: 'USD',
        subtotal: '15.00',
        grossAmount: '15.00',
        amountPaid: '0.00',
        paymentStatus: 'UNPAID',
        status: 'CANCELLED',
        paymentSummary: 'Cancelled',
        itemSummary: '1x Seafood Fried Rice',
        createdAt: tSame,
      },
    });

    const txAlpha4 = await prisma.transaction.create({
      data: {
        restaurantId: restaurantAlpha.id,
        sessionId: sessionAlpha5.id,
        cashierId: userAlphaManager.id,
        transactionNumber: 'TX-ALPHA-4',
        tableName: 'Table 08',
        orderType: 'DINE_IN',
        currency: 'USD',
        subtotal: '40.00',
        grossAmount: '40.00',
        amountPaid: '40.00',
        paymentStatus: 'PAID',
        status: 'COMPLETED',
        paymentSummary: 'Credit Card ($40.00)',
        itemSummary: '2x Salmon Sashimi',
        completedAt: tNew,
        createdAt: tNew,
        payments: {
          create: {
            processedById: userAlphaManager.id,
            method: 'CREDIT_CARD',
            status: 'SUCCESS',
            currency: 'USD',
            amount: '40.00',
            tenderCurrency: 'USD',
            tenderAmount: '40.00',
            paidAt: tNew,
          },
        },
      },
    });

    // Transaction in Restaurant Beta (must never leak to Alpha)
    const txBeta = await prisma.transaction.create({
      data: {
        restaurantId: restaurantBeta.id,
        sessionId: sessionBeta1.id,
        cashierId: userBetaManager.id,
        transactionNumber: 'TX-BETA-SECRET',
        tableName: 'VIP 1',
        orderType: 'DINE_IN',
        currency: 'USD',
        subtotal: '99.00',
        grossAmount: '99.00',
        amountPaid: '99.00',
        paymentStatus: 'PAID',
        status: 'COMPLETED',
        paymentSummary: 'Cash ($99.00)',
        itemSummary: 'Secret Beta Item',
        completedAt: tNew,
        createdAt: tNew,
      },
    });

    // -----------------------------------------------------------------------
    // 1. Valid GET /api/sales
    // -----------------------------------------------------------------------
    console.log('1. Testing valid GET /api/sales ...');
    const listRes = await request(app)
      .get('/api/sales')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(200);

    assert.strictEqual(listRes.body.success, true);
    assert.strictEqual(listRes.body.data.sales.length, 4);
    assert.strictEqual(listRes.body.data.pagination.total, 4);
    assert.strictEqual(listRes.body.data.pagination.page, 1);
    assert.strictEqual(listRes.body.data.pagination.limit, 20);
    assert.strictEqual(listRes.body.data.pagination.totalPages, 1);
    assert.strictEqual(listRes.body.data.pagination.hasNextPage, false);
    assert.strictEqual(listRes.body.data.pagination.hasPreviousPage, false);
    // Verify string decimal money formatting & no internal fields
    assert.strictEqual(listRes.body.data.sales[0].grossAmount, '40.00');
    assert.strictEqual(listRes.body.data.sales[0].restaurantId, undefined);
    console.log('✓ 1. Valid GET /api/sales passed.');

    // -----------------------------------------------------------------------
    // 2. Empty database result
    // -----------------------------------------------------------------------
    console.log('2. Testing empty database result ...');
    const emptyRes = await request(app)
      .get('/api/sales')
      .set('Authorization', `Bearer ${tokenEmpty}`)
      .expect(200);

    assert.strictEqual(emptyRes.body.success, true);
    assert.deepStrictEqual(emptyRes.body.data.sales, []);
    assert.deepStrictEqual(emptyRes.body.data.pagination, {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
    console.log('✓ 2. Empty database result passed.');

    // -----------------------------------------------------------------------
    // 3. Pagination & 15. Deterministic ordering
    // -----------------------------------------------------------------------
    console.log('3. Testing pagination & deterministic ordering ...');
    const page1Res = await request(app)
      .get('/api/sales?page=1&limit=2')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(200);

    assert.strictEqual(page1Res.body.data.sales.length, 2);
    assert.strictEqual(page1Res.body.data.pagination.total, 4);
    assert.strictEqual(page1Res.body.data.pagination.totalPages, 2);
    assert.strictEqual(page1Res.body.data.pagination.hasNextPage, true);
    assert.strictEqual(page1Res.body.data.pagination.hasPreviousPage, false);
    // tNew first, then tie-breaker id DESC (txAlphaTieB > txAlphaTieA)
    assert.strictEqual(page1Res.body.data.sales[0].id, txAlpha4.id);
    assert.strictEqual(page1Res.body.data.sales[1].id, txAlphaTieB.id);

    const page2Res = await request(app)
      .get('/api/sales?page=2&limit=2')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(200);

    assert.strictEqual(page2Res.body.data.sales.length, 2);
    assert.strictEqual(page2Res.body.data.pagination.hasNextPage, false);
    assert.strictEqual(page2Res.body.data.pagination.hasPreviousPage, true);
    assert.strictEqual(page2Res.body.data.sales[0].id, txAlphaTieA.id);
    assert.strictEqual(page2Res.body.data.sales[1].id, txAlpha1.id);
    console.log('✓ 3 & 15. Pagination and deterministic ordering passed.');

    // -----------------------------------------------------------------------
    // 4. Search filtering
    // -----------------------------------------------------------------------
    console.log('4. Testing search filtering ...');
    const searchCustomer = await request(app)
      .get('/api/sales?search=Sokha')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(200);
    assert.strictEqual(searchCustomer.body.data.sales.length, 1);
    assert.strictEqual(searchCustomer.body.data.sales[0].id, txAlpha1.id);

    const searchTxNum = await request(app)
      .get('/api/sales?search=TX-ALPHA-2')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(200);
    assert.strictEqual(searchTxNum.body.data.sales.length, 1);
    assert.strictEqual(searchTxNum.body.data.sales[0].id, txAlphaTieA.id);
    console.log('✓ 4. Search filtering passed.');

    // -----------------------------------------------------------------------
    // 5. Date filtering
    // -----------------------------------------------------------------------
    console.log('5. Testing date filtering ...');
    const dateRes = await request(app)
      .get('/api/sales?startDate=2026-11-19&endDate=2026-11-21')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(200);
    assert.strictEqual(dateRes.body.data.sales.length, 2);
    console.log('✓ 5. Date filtering passed.');

    // -----------------------------------------------------------------------
    // 6. Payment method filtering
    // -----------------------------------------------------------------------
    console.log('6. Testing paymentMethod filtering ...');
    const khqrRes = await request(app)
      .get('/api/sales?paymentMethod=KHQR')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(200);
    assert.strictEqual(khqrRes.body.data.sales.length, 1);
    assert.strictEqual(khqrRes.body.data.sales[0].id, txAlphaTieA.id);
    assert.strictEqual(khqrRes.body.data.sales[0].paymentMethod, 'KHQR');
    console.log('✓ 6. Payment method filtering passed.');

    // -----------------------------------------------------------------------
    // 7. Status filtering
    // -----------------------------------------------------------------------
    console.log('7. Testing status filtering ...');
    const cancelledRes = await request(app)
      .get('/api/sales?status=CANCELLED')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(200);
    assert.strictEqual(cancelledRes.body.data.sales.length, 1);
    assert.strictEqual(cancelledRes.body.data.sales[0].id, txAlphaTieB.id);

    const paidRes = await request(app)
      .get('/api/sales?status=PAID')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(200);
    assert.strictEqual(paidRes.body.data.sales.length, 3);
    console.log('✓ 7. Status filtering passed.');

    // -----------------------------------------------------------------------
    // 8. GET /api/sales/:id
    // -----------------------------------------------------------------------
    console.log('8. Testing GET /api/sales/:id ...');
    const detailRes = await request(app)
      .get(`/api/sales/${txAlpha1.id}`)
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(200);

    const saleDetail = detailRes.body.data.sale;
    assert.strictEqual(saleDetail.id, txAlpha1.id);
    assert.strictEqual(saleDetail.transactionNumber, 'TX-ALPHA-1');
    assert.strictEqual(saleDetail.orderNumber, 'ORD-ALPHA-1');
    assert.strictEqual(saleDetail.tableName, 'Table 05');
    assert.strictEqual(saleDetail.customer.name, 'Sokha Chan');
    assert.strictEqual(saleDetail.cashier.name, 'Alpha Manager');
    assert.strictEqual(saleDetail.subtotal, '20.00');
    assert.strictEqual(saleDetail.taxAmount, '2.00');
    assert.strictEqual(saleDetail.serviceChargeAmount, '1.00');
    assert.strictEqual(saleDetail.grossAmount, '23.00');
    assert.strictEqual(saleDetail.payments.length, 1);
    assert.strictEqual(saleDetail.payments[0].cashReceived, '25.00');
    assert.strictEqual(saleDetail.payments[0].changeGiven, '2.00');
    assert.strictEqual(saleDetail.items.length, 2);
    assert.strictEqual(saleDetail.items[0].productName, 'Lok Lak Beef');
    assert.strictEqual(saleDetail.items[0].unitPrice, '8.00');
    assert.strictEqual(saleDetail.items[0].lineTotal, '16.00');
    assert.strictEqual(saleDetail.restaurantId, undefined);
    console.log('✓ 8. GET /api/sales/:id passed.');

    // -----------------------------------------------------------------------
    // 9. Missing transaction returns 404
    // -----------------------------------------------------------------------
    console.log('9. Testing missing transaction returns 404 ...');
    await request(app)
      .get('/api/sales/99999999-9999-4999-8999-999999999999')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(404);
    console.log('✓ 9. Missing transaction returned 404.');

    // -----------------------------------------------------------------------
    // 10. Unauthorized request returns 401
    // -----------------------------------------------------------------------
    console.log('10. Testing unauthorized request returns 401 ...');
    await request(app).get('/api/sales').expect(401);
    await request(app).get(`/api/sales/${txAlpha1.id}`).expect(401);
    console.log('✓ 10. Unauthorized requests returned 401.');

    // -----------------------------------------------------------------------
    // 11. Missing sales.view permission returns 403
    // -----------------------------------------------------------------------
    console.log('11. Testing missing sales.view permission returns 403 ...');
    await request(app)
      .get('/api/sales')
      .set('Authorization', `Bearer ${tokenAlphaNoPerm}`)
      .expect(403);
    await request(app)
      .get(`/api/sales/${txAlpha1.id}`)
      .set('Authorization', `Bearer ${tokenAlphaNoPerm}`)
      .expect(403);
    console.log('✓ 11. Missing sales.view permission returned 403.');

    // -----------------------------------------------------------------------
    // 12 & 13. Tenant isolation & no cross-restaurant access
    // -----------------------------------------------------------------------
    console.log('12 & 13. Testing tenant isolation & cross-restaurant protection ...');
    // Competing restaurantId in query rejected by tenantContext
    await request(app)
      .get(`/api/sales?restaurantId=${restaurantBeta.id}`)
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(403);

    // Alpha search for Beta's transaction returns 0 results
    const crossSearch = await request(app)
      .get('/api/sales?search=TX-BETA-SECRET')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(200);
    assert.strictEqual(crossSearch.body.data.sales.length, 0);

    // Alpha requesting Beta's sale by ID returns 404 (not revealing existence)
    await request(app)
      .get(`/api/sales/${txBeta.id}`)
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(404);

    // Beta only sees Beta's 1 sale
    const betaList = await request(app)
      .get('/api/sales')
      .set('Authorization', `Bearer ${tokenBeta}`)
      .expect(200);
    assert.strictEqual(betaList.body.data.sales.length, 1);
    assert.strictEqual(betaList.body.data.sales[0].id, txBeta.id);
    console.log('✓ 12 & 13. Tenant isolation verified.');

    // -----------------------------------------------------------------------
    // 14. Validation errors
    // -----------------------------------------------------------------------
    console.log('14. Testing validation errors ...');
    await request(app)
      .get('/api/sales/not-a-uuid')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(400);
    await request(app)
      .get('/api/sales?page=0')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(400);
    await request(app)
      .get('/api/sales?limit=250')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(400);
    await request(app)
      .get('/api/sales?paymentMethod=BITCOIN')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(400);
    await request(app)
      .get('/api/sales?status=BOGUS')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(400);
    await request(app)
      .get('/api/sales?startDate=not-a-date')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(400);
    await request(app)
      .get('/api/sales?startDate=2026-11-25&endDate=2026-11-10')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(400);
    console.log('✓ 14. Validation errors passed.');

    console.log('\n====================================================================');
    console.log('✔ ALL 15 BACKEND SALES HISTORY API TESTS PASSED!');
    console.log('====================================================================\n');
  } finally {
    const restaurantIds = [restaurantAlpha?.id, restaurantBeta?.id, restaurantEmpty?.id].filter(Boolean);
    if (restaurantIds.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL session_replication_role = 'replica'`);
        await tx.payment.deleteMany({ where: { restaurantId: { in: restaurantIds } } });
        await tx.transaction.deleteMany({ where: { restaurantId: { in: restaurantIds } } });
        await tx.orderItem.deleteMany({ where: { restaurantId: { in: restaurantIds } } });
        await tx.order.deleteMany({ where: { restaurantId: { in: restaurantIds } } });
        await tx.tableSession.deleteMany({ where: { restaurantId: { in: restaurantIds } } });
        await tx.table.deleteMany({ where: { restaurantId: { in: restaurantIds } } });
        await tx.customer.deleteMany({ where: { restaurantId: { in: restaurantIds } } });
        await tx.user.deleteMany({ where: { restaurantId: { in: restaurantIds } } });
        await tx.role.deleteMany({ where: { restaurantId: { in: restaurantIds } } });
        await tx.restaurant.deleteMany({ where: { id: { in: restaurantIds } } });
      });
    }
    await prisma.$disconnect();
  }
}

runSalesTests().catch((err) => {
  console.error('\n❌ SALES API TEST SUITE FAILED:', err);
  process.exit(1);
});
