/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { generateToken } from '../src/utils/jwt.js';

async function cleanupRestaurant(restaurantId: string) {
  await prisma.payment.deleteMany({ where: { restaurantId } });
  await prisma.transaction.deleteMany({ where: { restaurantId } });
  await prisma.orderItem.deleteMany({ where: { restaurantId } });
  await prisma.order.deleteMany({ where: { restaurantId } });
  await prisma.tableSession.deleteMany({ where: { restaurantId } });
  await prisma.table.deleteMany({ where: { restaurantId } });
  await prisma.customer.deleteMany({ where: { restaurantId } });
  await prisma.product.deleteMany({ where: { restaurantId } });
  await prisma.category.deleteMany({ where: { restaurantId } });
  await prisma.auditLog.deleteMany({ where: { restaurantId } });
  await prisma.user.deleteMany({ where: { restaurantId } });
  await prisma.rolePermission.deleteMany({ where: { restaurantId } });
  await prisma.role.deleteMany({ where: { restaurantId } });
  await prisma.restaurant.delete({ where: { id: restaurantId } });
}

async function runPosOrderTests() {
  console.log('====================================================================');
  console.log('STEP 4: POS ORDER BACKEND API TEST SUITE');
  console.log('====================================================================\n');

  const app = createApp();
  const runId = Date.now();

  let restaurantAlpha: any = null;
  let restaurantBeta: any = null;

  try {
    console.log('[SETUP] Provisioning isolated multi-tenant POS order fixtures...');

    // Alpha has 10% tax and 5% service charge to verify backend financial calculation
    restaurantAlpha = await prisma.restaurant.create({
      data: {
        name: `Alpha Orders ${runId}`,
        slug: `alpha-orders-${runId}`,
        primaryCurrency: 'USD',
        taxRate: '10.00',
        serviceChargeRate: '5.00',
        isActive: true,
      },
    });

    restaurantBeta = await prisma.restaurant.create({
      data: {
        name: `Beta Orders ${runId}`,
        slug: `beta-orders-${runId}`,
        primaryCurrency: 'USD',
        taxRate: '0.00',
        serviceChargeRate: '0.00',
        isActive: true,
      },
    });

    const permissionCodes = [
      'pos.use',
      'orders.create',
      'orders.update',
      'orders.view',
      'orders.cancel',
    ];
    const perms = await prisma.permission.findMany({
      where: { code: { in: permissionCodes } },
    });
    const permByCode = new Map(perms.map((p) => [p.code, p.id]));
    for (const code of permissionCodes) {
      if (!permByCode.has(code)) {
        throw new Error(`Required permission "${code}" not found in PostgreSQL`);
      }
    }

    const roleAlphaManager = await prisma.role.create({
      data: {
        restaurantId: restaurantAlpha.id,
        name: 'POS_MANAGER',
        displayName: 'POS Manager',
        permissions: {
          create: permissionCodes.map((code) => ({
            permissionId: permByCode.get(code)!,
          })),
        },
      },
    });

    const roleAlphaStaff = await prisma.role.create({
      data: {
        restaurantId: restaurantAlpha.id,
        name: 'POS_STAFF',
        displayName: 'POS Staff',
        permissions: {
          create: ['pos.use', 'orders.create', 'orders.update', 'orders.view'].map((code) => ({
            permissionId: permByCode.get(code)!,
          })),
        },
      },
    });

    const roleAlphaPosOnly = await prisma.role.create({
      data: {
        restaurantId: restaurantAlpha.id,
        name: 'POS_VIEW_ONLY',
        displayName: 'POS View Only',
        permissions: {
          create: [{ permissionId: permByCode.get('pos.use')! }],
        },
      },
    });

    const roleAlphaNoPos = await prisma.role.create({
      data: {
        restaurantId: restaurantAlpha.id,
        name: 'NO_POS',
        displayName: 'No POS',
      },
    });

    const roleBetaManager = await prisma.role.create({
      data: {
        restaurantId: restaurantBeta.id,
        name: 'POS_MANAGER',
        displayName: 'POS Manager',
        permissions: {
          create: permissionCodes.map((code) => ({
            permissionId: permByCode.get(code)!,
          })),
        },
      },
    });

    const [{ dummyHash }] = await prisma.$queryRaw<Array<{ dummyHash: string }>>`
      SELECT public.crypt('TestOrderPass123!', public.gen_salt('bf', 10)) AS "dummyHash"
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

    const userAlphaStaff = await prisma.user.create({
      data: {
        restaurantId: restaurantAlpha.id,
        roleId: roleAlphaStaff.id,
        name: 'Alpha Staff',
        email: `alpha-staff-${runId}@test.local`,
        passwordHash: dummyHash,
        isActive: true,
      },
    });

    const userAlphaPosOnly = await prisma.user.create({
      data: {
        restaurantId: restaurantAlpha.id,
        roleId: roleAlphaPosOnly.id,
        name: 'Alpha PosOnly',
        email: `alpha-posonly-${runId}@test.local`,
        passwordHash: dummyHash,
        isActive: true,
      },
    });

    const userAlphaNoPos = await prisma.user.create({
      data: {
        restaurantId: restaurantAlpha.id,
        roleId: roleAlphaNoPos.id,
        name: 'Alpha NoPos',
        email: `alpha-nopos-${runId}@test.local`,
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

    const tokenAlphaManager = generateToken({
      userId: userAlphaManager.id,
      restaurantId: restaurantAlpha.id,
      roleId: roleAlphaManager.id,
      roleName: roleAlphaManager.name,
    });
    const tokenAlphaStaff = generateToken({
      userId: userAlphaStaff.id,
      restaurantId: restaurantAlpha.id,
      roleId: roleAlphaStaff.id,
      roleName: roleAlphaStaff.name,
    });
    const tokenAlphaPosOnly = generateToken({
      userId: userAlphaPosOnly.id,
      restaurantId: restaurantAlpha.id,
      roleId: roleAlphaPosOnly.id,
      roleName: roleAlphaPosOnly.name,
    });
    const tokenAlphaNoPos = generateToken({
      userId: userAlphaNoPos.id,
      restaurantId: restaurantAlpha.id,
      roleId: roleAlphaNoPos.id,
      roleName: roleAlphaNoPos.name,
    });
    const tokenBetaManager = generateToken({
      userId: userBetaManager.id,
      restaurantId: restaurantBeta.id,
      roleId: roleBetaManager.id,
      roleName: roleBetaManager.name,
    });

    const catAlpha = await prisma.category.create({
      data: { restaurantId: restaurantAlpha.id, name: 'Main Dishes', sortOrder: 1 },
    });
    const catBeta = await prisma.category.create({
      data: { restaurantId: restaurantBeta.id, name: 'Beta Dishes', sortOrder: 1 },
    });

    const prodAmok = await prisma.product.create({
      data: {
        restaurantId: restaurantAlpha.id,
        categoryId: catAlpha.id,
        name: 'Fish Amok',
        price: '6.50',
        costPrice: '2.50',
        isAvailable: true,
      },
    });
    const prodLatte = await prisma.product.create({
      data: {
        restaurantId: restaurantAlpha.id,
        categoryId: catAlpha.id,
        name: 'Iced Latte',
        price: '3.25',
        costPrice: '1.00',
        isAvailable: true,
      },
    });
    const prodUnavailable = await prisma.product.create({
      data: {
        restaurantId: restaurantAlpha.id,
        categoryId: catAlpha.id,
        name: 'Seasonal Crab',
        price: '12.00',
        isAvailable: false,
      },
    });
    const prodDeleted = await prisma.product.create({
      data: {
        restaurantId: restaurantAlpha.id,
        categoryId: catAlpha.id,
        name: 'Archived Dish',
        price: '5.00',
        isAvailable: true,
        deletedAt: new Date(),
      },
    });
    const prodBeta = await prisma.product.create({
      data: {
        restaurantId: restaurantBeta.id,
        categoryId: catBeta.id,
        name: 'Beta Steak',
        price: '15.00',
        isAvailable: true,
      },
    });

    const tableA1 = await prisma.table.create({
      data: {
        restaurantId: restaurantAlpha.id,
        legacyId: 't1',
        name: 'Table 01',
        qrCodeKey: `alpha-t1-${runId}`,
        status: 'AVAILABLE',
        isActive: false,
      },
    });
    const tableA2 = await prisma.table.create({
      data: {
        restaurantId: restaurantAlpha.id,
        legacyId: 't2',
        name: 'Table 02',
        qrCodeKey: `alpha-t2-${runId}`,
        status: 'AVAILABLE',
        isActive: false,
      },
    });
    const tableA3 = await prisma.table.create({
      data: {
        restaurantId: restaurantAlpha.id,
        legacyId: 't3',
        name: 'Table 03',
        qrCodeKey: `alpha-t3-${runId}`,
        status: 'AVAILABLE',
        isActive: false,
      },
    });
    const tableAConcurrent = await prisma.table.create({
      data: {
        restaurantId: restaurantAlpha.id,
        legacyId: 't4',
        name: 'Table 04',
        qrCodeKey: `alpha-t4-${runId}`,
        status: 'AVAILABLE',
        isActive: false,
      },
    });
    const tableDeleted = await prisma.table.create({
      data: {
        restaurantId: restaurantAlpha.id,
        legacyId: 't9',
        name: 'Deleted Table',
        qrCodeKey: `alpha-t9-${runId}`,
        status: 'AVAILABLE',
        deletedAt: new Date(),
      },
    });
    const tableBeta = await prisma.table.create({
      data: {
        restaurantId: restaurantBeta.id,
        legacyId: 't1',
        name: 'Beta Table 01',
        qrCodeKey: `beta-t1-${runId}`,
        status: 'AVAILABLE',
      },
    });

    const completedSession = await prisma.tableSession.create({
      data: {
        restaurantId: restaurantAlpha.id,
        tableId: tableA3.id,
        sessionNumber: `SES-DONE-${runId}`,
        status: 'COMPLETED',
        openedById: userAlphaManager.id,
        closedById: userAlphaManager.id,
        closedAt: new Date(),
      },
    });

    const betaSession = await prisma.tableSession.create({
      data: {
        restaurantId: restaurantBeta.id,
        tableId: tableBeta.id,
        sessionNumber: `SES-BETA-${runId}`,
        status: 'ACTIVE',
        openedById: userBetaManager.id,
      },
    });

    const customerAlpha = await prisma.customer.create({
      data: {
        restaurantId: restaurantAlpha.id,
        name: 'Sokha Chan',
        phone: '012345678',
      },
    });
    const customerBeta = await prisma.customer.create({
      data: {
        restaurantId: restaurantBeta.id,
        name: 'Beta Customer',
      },
    });

    const fakeUuid = '00000000-0000-4000-8000-000000000099';

    // ------------------------------------------------------------------
    // 1. Unauthenticated access returns 401
    // ------------------------------------------------------------------
    console.log('1. Testing unauthenticated requests return 401 ...');
    assert.strictEqual((await request(app).get('/api/pos/orders')).status, 401);
    assert.strictEqual((await request(app).post('/api/pos/orders').send({})).status, 401);
    assert.strictEqual(
      (await request(app).post(`/api/pos/orders/${fakeUuid}/items`).send({})).status,
      401
    );
    assert.strictEqual(
      (await request(app).patch(`/api/pos/orders/${fakeUuid}/items/${fakeUuid}`).send({})).status,
      401
    );
    assert.strictEqual(
      (await request(app).delete(`/api/pos/orders/${fakeUuid}/items/${fakeUuid}`)).status,
      401
    );
    console.log('✓ 1. Unauthenticated requests returned 401.');

    // ------------------------------------------------------------------
    // 2. Permission denied returns 403
    // ------------------------------------------------------------------
    console.log('2. Testing missing permissions return 403 ...');
    const resNoPos = await request(app)
      .post('/api/pos/orders')
      .set('Authorization', `Bearer ${tokenAlphaNoPos}`)
      .send({ orderType: 'TAKEAWAY' });
    assert.strictEqual(resNoPos.status, 403);

    const resPosOnlyCreate = await request(app)
      .post('/api/pos/orders')
      .set('Authorization', `Bearer ${tokenAlphaPosOnly}`)
      .send({ orderType: 'TAKEAWAY' });
    assert.strictEqual(resPosOnlyCreate.status, 403);

    const resPosOnlyView = await request(app)
      .get('/api/pos/orders')
      .set('Authorization', `Bearer ${tokenAlphaPosOnly}`);
    assert.strictEqual(resPosOnlyView.status, 403);

    const resPosOnlyUpdate = await request(app)
      .post(`/api/pos/orders/${fakeUuid}/items`)
      .set('Authorization', `Bearer ${tokenAlphaPosOnly}`)
      .send({ productId: prodAmok.id, quantity: 1 });
    assert.strictEqual(resPosOnlyUpdate.status, 403);

    const resStaffCancel = await request(app)
      .post(`/api/pos/orders/${fakeUuid}/cancel`)
      .set('Authorization', `Bearer ${tokenAlphaStaff}`)
      .send({ reason: 'Test cancel' });
    assert.strictEqual(resStaffCancel.status, 403);
    console.log('✓ 2. Missing permissions returned 403.');

    // ------------------------------------------------------------------
    // 3. Transaction rollback on failure
    // ------------------------------------------------------------------
    console.log('3. Testing transaction rollback when order creation fails mid-flight ...');
    const rollbackRes = await request(app)
      .post('/api/pos/orders')
      .set('Authorization', `Bearer ${tokenAlphaStaff}`)
      .send({
        orderType: 'DINE_IN',
        tableId: tableA1.id,
        items: [
          { productId: prodAmok.id, quantity: 2 },
          { productId: prodUnavailable.id, quantity: 1 },
        ],
      });
    assert.strictEqual(rollbackRes.status, 400);
    assert.strictEqual(
      await prisma.order.count({ where: { restaurantId: restaurantAlpha.id } }),
      0,
      'Order must be rolled back'
    );
    assert.strictEqual(
      await prisma.orderItem.count({ where: { restaurantId: restaurantAlpha.id } }),
      0,
      'OrderItems must be rolled back'
    );
    assert.strictEqual(
      await prisma.tableSession.count({
        where: { restaurantId: restaurantAlpha.id, tableId: tableA1.id },
      }),
      0,
      'Auto-created TableSession must be rolled back'
    );
    const tableA1AfterRollback = await prisma.table.findUniqueOrThrow({ where: { id: tableA1.id } });
    assert.strictEqual(tableA1AfterRollback.status, 'AVAILABLE');
    assert.strictEqual(tableA1AfterRollback.isActive, false);
    console.log('✓ 3. Transaction rollback on failure verified.');

    // ------------------------------------------------------------------
    // 4. Create DINE_IN order + Backend price validation + Total calculation
    // ------------------------------------------------------------------
    console.log('4. Testing DINE_IN creation, tampered price rejection, and total calculation ...');
    // 2 * $6.50 + 1 * $3.25 = $16.25 subtotal
    // tax 10% = $1.63 (1625 * 10 / 100 = 162.5 -> 163 cents)
    // serviceCharge 5% = $0.81 (1625 * 5 / 100 = 81.25 -> 81 cents)
    // total = 16.25 + 1.63 + 0.81 = $18.69
    const dineInRes = await request(app)
      .post('/api/pos/orders')
      .set('Authorization', `Bearer ${tokenAlphaStaff}`)
      .send({
        orderType: 'DINE_IN',
        tableId: tableA1.id,
        customerId: customerAlpha.id,
        idempotencyKey: `idem-dinein-${runId}`,
        notes: 'No peanuts',
        // Tampered prices intentionally supplied to prove backend ignores them
        subtotal: 0.01,
        taxAmount: 0.0,
        total: 0.01,
        items: [
          { productId: prodAmok.id, quantity: 2, unitPrice: 0.01, lineTotal: 0.02, instructions: 'Spicy' },
          { productId: prodLatte.id, quantity: 1, price: 0.01 },
        ],
      });
    assert.strictEqual(dineInRes.status, 201);
    assert.strictEqual(dineInRes.body.success, true);
    const dineInOrder = dineInRes.body.data.order;
    assert.strictEqual(dineInOrder.orderType, 'DINE_IN');
    assert.strictEqual(dineInOrder.source, 'POS');
    assert.strictEqual(dineInOrder.status, 'PENDING');
    assert.strictEqual(dineInOrder.paymentStatus, 'UNPAID');
    assert.ok(dineInOrder.sessionId);
    assert.strictEqual(dineInOrder.subtotal, '16.25');
    assert.strictEqual(dineInOrder.taxAmount, '1.63');
    assert.strictEqual(dineInOrder.serviceChargeAmount, '0.81');
    assert.strictEqual(dineInOrder.total, '18.69');
    assert.strictEqual(dineInOrder.items.length, 2);
    assert.strictEqual(dineInOrder.items[0].productName, 'Fish Amok');
    assert.strictEqual(dineInOrder.items[0].unitPrice, '6.50');
    assert.strictEqual(dineInOrder.items[0].lineTotal, '13.00');
    assert.strictEqual(dineInOrder.items[1].unitPrice, '3.25');
    assert.strictEqual(dineInOrder.items[1].lineTotal, '3.25');

    const tableA1After = await prisma.table.findUniqueOrThrow({ where: { id: tableA1.id } });
    assert.strictEqual(tableA1After.status, 'OCCUPIED');
    assert.strictEqual(tableA1After.isActive, true);
    assert.strictEqual(tableA1After.totalAmount.toFixed(2), '18.69');

    // Idempotency replay returns same order (200) and mismatch returns 409
    const replayRes = await request(app)
      .post('/api/pos/orders')
      .set('Authorization', `Bearer ${tokenAlphaStaff}`)
      .send({
        orderType: 'DINE_IN',
        tableId: tableA1.id,
        idempotencyKey: `idem-dinein-${runId}`,
        items: [{ productId: prodAmok.id, quantity: 2 }],
      });
    assert.strictEqual(replayRes.status, 200);
    assert.strictEqual(replayRes.body.data.idempotentReplay, true);
    assert.strictEqual(replayRes.body.data.order.id, dineInOrder.id);

    const replayConflict = await request(app)
      .post('/api/pos/orders')
      .set('Authorization', `Bearer ${tokenAlphaStaff}`)
      .send({
        orderType: 'TAKEAWAY',
        idempotencyKey: `idem-dinein-${runId}`,
        items: [{ productId: prodAmok.id, quantity: 1 }],
      });
    assert.strictEqual(replayConflict.status, 409);

    // Second DINE_IN order on same sessionId attaches and sums TableSession totalAmount
    const secondDineInRes = await request(app)
      .post('/api/pos/orders')
      .set('Authorization', `Bearer ${tokenAlphaStaff}`)
      .send({
        orderType: 'DINE_IN',
        sessionId: dineInOrder.sessionId,
        tableId: tableA1.id,
        items: [{ productId: prodLatte.id, quantity: 2 }],
      });
    assert.strictEqual(secondDineInRes.status, 201);
    const secondOrder = secondDineInRes.body.data.order;
    assert.strictEqual(secondOrder.sessionId, dineInOrder.sessionId);
    // 2 * 3.25 = 6.50 subtotal; tax 10% = 0.65; svc 5% = 0.33 (32.5 -> 33); total = 7.48
    assert.strictEqual(secondOrder.total, '7.48');
    // Session total = 18.69 + 7.48 = 26.17
    assert.strictEqual(secondOrder.session.totalAmount, '26.17');
    console.log('✓ 4. DINE_IN creation, DB pricing, totals, and idempotency verified.');

    // ------------------------------------------------------------------
    // 5. Create TAKEAWAY and DELIVERY orders
    // ------------------------------------------------------------------
    console.log('5. Testing TAKEAWAY and DELIVERY order creation ...');
    const takeawayRes = await request(app)
      .post('/api/pos/orders')
      .set('Authorization', `Bearer ${tokenAlphaStaff}`)
      .send({
        orderType: 'TAKEAWAY',
        items: [{ productId: prodLatte.id, quantity: 2 }],
      });
    assert.strictEqual(takeawayRes.status, 201);
    const takeawayOrder = takeawayRes.body.data.order;
    assert.strictEqual(takeawayOrder.orderType, 'TAKEAWAY');
    assert.strictEqual(takeawayOrder.sessionId, null);
    assert.strictEqual(takeawayOrder.session, null);
    assert.strictEqual(takeawayOrder.subtotal, '6.50');
    assert.strictEqual(takeawayOrder.total, '7.48');

    const deliveryRes = await request(app)
      .post('/api/pos/orders')
      .set('Authorization', `Bearer ${tokenAlphaStaff}`)
      .send({
        orderType: 'DELIVERY',
        customerId: customerAlpha.id,
        notes: 'Ring bell at gate 2',
        items: [{ productId: prodAmok.id, quantity: 1 }],
      });
    assert.strictEqual(deliveryRes.status, 201);
    const deliveryOrder = deliveryRes.body.data.order;
    assert.strictEqual(deliveryOrder.orderType, 'DELIVERY');
    assert.strictEqual(deliveryOrder.sessionId, null);
    assert.strictEqual(deliveryOrder.subtotal, '6.50');
    // tax 0.65 + svc 0.33 = 7.48
    assert.strictEqual(deliveryOrder.total, '7.48');
    console.log('✓ 5. TAKEAWAY and DELIVERY creation verified.');

    // ------------------------------------------------------------------
    // 6. Invalid table/session relationships & tenant isolation
    // ------------------------------------------------------------------
    console.log('6. Testing invalid table/session relationships and tenant isolation ...');
    // DINE_IN missing tableId and sessionId
    assert.strictEqual(
      (
        await request(app)
          .post('/api/pos/orders')
          .set('Authorization', `Bearer ${tokenAlphaStaff}`)
          .send({ orderType: 'DINE_IN', items: [{ productId: prodAmok.id, quantity: 1 }] })
      ).status,
      400
    );

    // TAKEAWAY/DELIVERY specifying tableId or sessionId
    assert.strictEqual(
      (
        await request(app)
          .post('/api/pos/orders')
          .set('Authorization', `Bearer ${tokenAlphaStaff}`)
          .send({ orderType: 'TAKEAWAY', tableId: tableA1.id })
      ).status,
      400
    );
    assert.strictEqual(
      (
        await request(app)
          .post('/api/pos/orders')
          .set('Authorization', `Bearer ${tokenAlphaStaff}`)
          .send({ orderType: 'DELIVERY', sessionId: dineInOrder.sessionId })
      ).status,
      400
    );

    // Mismatched sessionId and tableId (session belongs to tableA1, passed tableA2)
    assert.strictEqual(
      (
        await request(app)
          .post('/api/pos/orders')
          .set('Authorization', `Bearer ${tokenAlphaStaff}`)
          .send({
            orderType: 'DINE_IN',
            sessionId: dineInOrder.sessionId,
            tableId: tableA2.id,
            items: [{ productId: prodAmok.id, quantity: 1 }],
          })
      ).status,
      400
    );

    // COMPLETED table session rejected (409)
    assert.strictEqual(
      (
        await request(app)
          .post('/api/pos/orders')
          .set('Authorization', `Bearer ${tokenAlphaStaff}`)
          .send({
            orderType: 'DINE_IN',
            sessionId: completedSession.id,
            items: [{ productId: prodAmok.id, quantity: 1 }],
          })
      ).status,
      409
    );

    // Soft-deleted table rejected (404)
    assert.strictEqual(
      (
        await request(app)
          .post('/api/pos/orders')
          .set('Authorization', `Bearer ${tokenAlphaStaff}`)
          .send({
            orderType: 'DINE_IN',
            tableId: tableDeleted.id,
          })
      ).status,
      404
    );

    // Tenant isolation: body restaurantId mismatch -> 403
    assert.strictEqual(
      (
        await request(app)
          .post('/api/pos/orders')
          .set('Authorization', `Bearer ${tokenAlphaStaff}`)
          .send({
            restaurantId: restaurantBeta.id,
            orderType: 'TAKEAWAY',
          })
      ).status,
      403
    );

    // Tenant isolation: Alpha user cannot reference Beta table, session, product, customer, or order
    assert.strictEqual(
      (
        await request(app)
          .post('/api/pos/orders')
          .set('Authorization', `Bearer ${tokenAlphaStaff}`)
          .send({ orderType: 'DINE_IN', tableId: tableBeta.id })
      ).status,
      404
    );
    assert.strictEqual(
      (
        await request(app)
          .post('/api/pos/orders')
          .set('Authorization', `Bearer ${tokenAlphaStaff}`)
          .send({ orderType: 'DINE_IN', sessionId: betaSession.id })
      ).status,
      404
    );
    assert.strictEqual(
      (
        await request(app)
          .post('/api/pos/orders')
          .set('Authorization', `Bearer ${tokenAlphaStaff}`)
          .send({ orderType: 'TAKEAWAY', items: [{ productId: prodBeta.id, quantity: 1 }] })
      ).status,
      404
    );
    assert.strictEqual(
      (
        await request(app)
          .post('/api/pos/orders')
          .set('Authorization', `Bearer ${tokenAlphaStaff}`)
          .send({ orderType: 'DELIVERY', customerId: customerBeta.id })
      ).status,
      404
    );
    assert.strictEqual(
      (
        await request(app)
          .get(`/api/pos/orders/${dineInOrder.id}`)
          .set('Authorization', `Bearer ${tokenBetaManager}`)
      ).status,
      404
    );
    assert.strictEqual(
      (
        await request(app)
          .post(`/api/pos/orders/${dineInOrder.id}/items`)
          .set('Authorization', `Bearer ${tokenBetaManager}`)
          .send({ productId: prodBeta.id, quantity: 1 })
      ).status,
      404
    );
    console.log('✓ 6. Invalid relationships and strict tenant isolation verified.');

    // ------------------------------------------------------------------
    // 7. Adding, updating, removing items + historical price/name snapshot
    // ------------------------------------------------------------------
    console.log('7. Testing item add, update, remove, and historical snapshot preservation ...');
    const addItemRes = await request(app)
      .post(`/api/pos/orders/${takeawayOrder.id}/items`)
      .set('Authorization', `Bearer ${tokenAlphaStaff}`)
      .send({
        productId: prodAmok.id,
        quantity: 2,
        unitPrice: 0.01,
        instructions: 'Extra lime',
      });
    assert.strictEqual(addItemRes.status, 201);
    const addedOrder = addItemRes.body.data.order;
    assert.strictEqual(addedOrder.items.length, 2);
    // 2 * 3.25 + 2 * 6.50 = 19.50; tax 1.95; svc 0.98 (97.5->98); total = 22.43
    assert.strictEqual(addedOrder.subtotal, '19.50');
    assert.strictEqual(addedOrder.taxAmount, '1.95');
    assert.strictEqual(addedOrder.serviceChargeAmount, '0.98');
    assert.strictEqual(addedOrder.total, '22.43');

    const secondItemId = addedOrder.items[1].id;

    // Update Product catalog price & name after item snapshot was saved
    await prisma.product.update({
      where: { id: prodAmok.id },
      data: { name: 'Fish Amok Deluxe', price: '9.99' },
    });

    // Update quantity of existing OrderItem: historical unitPrice ($6.50) and productName MUST remain preserved!
    const updateItemRes = await request(app)
      .patch(`/api/pos/orders/${takeawayOrder.id}/items/${secondItemId}`)
      .set('Authorization', `Bearer ${tokenAlphaStaff}`)
      .send({ quantity: 3, instructions: 'Very spicy' });
    assert.strictEqual(updateItemRes.status, 200);
    const updatedOrder = updateItemRes.body.data.order;
    const updatedAmokItem = updatedOrder.items.find((i: any) => i.id === secondItemId);
    assert.strictEqual(updatedAmokItem.productName, 'Fish Amok');
    assert.strictEqual(updatedAmokItem.unitPrice, '6.50');
    assert.strictEqual(updatedAmokItem.quantity, 3);
    assert.strictEqual(updatedAmokItem.lineTotal, '19.50');
    assert.strictEqual(updatedAmokItem.instructions, 'Very spicy');
    // 2*3.25 + 3*6.50 = 6.50 + 19.50 = 26.00; tax 2.60; svc 1.30; total = 29.90
    assert.strictEqual(updatedOrder.subtotal, '26.00');
    assert.strictEqual(updatedOrder.total, '29.90');

    // Restore product price & name for later assertions
    await prisma.product.update({
      where: { id: prodAmok.id },
      data: { name: 'Fish Amok', price: '6.50' },
    });

    // Remove item -> total reverts cleanly
    const deleteItemRes = await request(app)
      .delete(`/api/pos/orders/${takeawayOrder.id}/items/${secondItemId}`)
      .set('Authorization', `Bearer ${tokenAlphaStaff}`);
    assert.strictEqual(deleteItemRes.status, 200);
    assert.strictEqual(deleteItemRes.body.data.order.items.length, 1);
    assert.strictEqual(deleteItemRes.body.data.order.subtotal, '6.50');
    assert.strictEqual(deleteItemRes.body.data.order.total, '7.48');
    console.log('✓ 7. Item add/update/remove and historical snapshot preservation verified.');

    // ------------------------------------------------------------------
    // 8. Invalid quantities & unavailable / deleted products
    // ------------------------------------------------------------------
    console.log('8. Testing invalid quantities and unavailable/deleted products ...');
    for (const badQty of [0, -2, 1.5, 1000, 'abc']) {
      const badAdd = await request(app)
        .post(`/api/pos/orders/${takeawayOrder.id}/items`)
        .set('Authorization', `Bearer ${tokenAlphaStaff}`)
        .send({ productId: prodLatte.id, quantity: badQty });
      assert.strictEqual(badAdd.status, 400);

      const firstItemId = deleteItemRes.body.data.order.items[0].id;
      const badPatch = await request(app)
        .patch(`/api/pos/orders/${takeawayOrder.id}/items/${firstItemId}`)
        .set('Authorization', `Bearer ${tokenAlphaStaff}`)
        .send({ quantity: badQty });
      assert.strictEqual(badPatch.status, 400);
    }

    assert.strictEqual(
      (
        await request(app)
          .post(`/api/pos/orders/${takeawayOrder.id}/items`)
          .set('Authorization', `Bearer ${tokenAlphaStaff}`)
          .send({ productId: prodUnavailable.id, quantity: 1 })
      ).status,
      400
    );
    assert.strictEqual(
      (
        await request(app)
          .post(`/api/pos/orders/${takeawayOrder.id}/items`)
          .set('Authorization', `Bearer ${tokenAlphaStaff}`)
          .send({ productId: prodDeleted.id, quantity: 1 })
      ).status,
      404
    );
    console.log('✓ 8. Invalid quantities and unavailable/deleted products rejected.');

    // ------------------------------------------------------------------
    // 9. Invalid order states & database-level frozen bill protection
    // ------------------------------------------------------------------
    console.log('9. Testing invalid order states and frozen bill rules ...');
    // Cannot set COMPLETED via PATCH /orders/:id
    assert.strictEqual(
      (
        await request(app)
          .patch(`/api/pos/orders/${deliveryOrder.id}`)
          .set('Authorization', `Bearer ${tokenAlphaStaff}`)
          .send({ status: 'COMPLETED' })
      ).status,
      400
    );

    // Valid transition PENDING -> READY -> reject READY -> PENDING
    assert.strictEqual(
      (
        await request(app)
          .patch(`/api/pos/orders/${deliveryOrder.id}`)
          .set('Authorization', `Bearer ${tokenAlphaStaff}`)
          .send({ status: 'READY' })
      ).status,
      200
    );
    assert.strictEqual(
      (
        await request(app)
          .patch(`/api/pos/orders/${deliveryOrder.id}`)
          .set('Authorization', `Bearer ${tokenAlphaStaff}`)
          .send({ status: 'PENDING' })
      ).status,
      409
    );

    // Cancel delivery order (ADMIN/Manager has orders.cancel) -> subsequent item add/update/delete rejected (409)
    const cancelRes = await request(app)
      .post(`/api/pos/orders/${deliveryOrder.id}/cancel`)
      .set('Authorization', `Bearer ${tokenAlphaManager}`)
      .send({ reason: 'Customer changed mind' });
    assert.strictEqual(cancelRes.status, 200);
    assert.strictEqual(cancelRes.body.data.order.status, 'CANCELLED');
    assert.strictEqual(cancelRes.body.data.order.subtotal, '0.00');
    assert.strictEqual(cancelRes.body.data.order.total, '0.00');

    const cancelledItemId = cancelRes.body.data.order.items[0].id;
    assert.strictEqual(
      (
        await request(app)
          .post(`/api/pos/orders/${deliveryOrder.id}/items`)
          .set('Authorization', `Bearer ${tokenAlphaManager}`)
          .send({ productId: prodLatte.id, quantity: 1 })
      ).status,
      409
    );
    assert.strictEqual(
      (
        await request(app)
          .patch(`/api/pos/orders/${deliveryOrder.id}/items/${cancelledItemId}`)
          .set('Authorization', `Bearer ${tokenAlphaManager}`)
          .send({ quantity: 2 })
      ).status,
      409
    );
    assert.strictEqual(
      (
        await request(app)
          .delete(`/api/pos/orders/${deliveryOrder.id}/items/${cancelledItemId}`)
          .set('Authorization', `Bearer ${tokenAlphaManager}`)
      ).status,
      409
    );

    // Frozen order via ACTIVE transaction on TAKEAWAY order -> rejects add/update/delete/cancel (409)
    await prisma.transaction.create({
      data: {
        restaurantId: restaurantAlpha.id,
        directOrderId: takeawayOrder.id,
        cashierId: userAlphaManager.id,
        transactionNumber: `TX-FREEZE-TA-${runId}`,
        orderType: 'TAKEAWAY',
        currency: 'USD',
        subtotal: '6.50',
        taxAmount: '0.65',
        serviceChargeAmount: '0.33',
        discountAmount: '0.00',
        grossAmount: '7.48',
        amountPaid: '0.00',
        writeOffAmount: '0.00',
        paymentStatus: 'UNPAID',
        status: 'ACTIVE',
      },
    });
    const takeawayFirstItemId = deleteItemRes.body.data.order.items[0].id;
    assert.strictEqual(
      (
        await request(app)
          .post(`/api/pos/orders/${takeawayOrder.id}/items`)
          .set('Authorization', `Bearer ${tokenAlphaManager}`)
          .send({ productId: prodAmok.id, quantity: 1 })
      ).status,
      409
    );
    assert.strictEqual(
      (
        await request(app)
          .patch(`/api/pos/orders/${takeawayOrder.id}/items/${takeawayFirstItemId}`)
          .set('Authorization', `Bearer ${tokenAlphaManager}`)
          .send({ quantity: 5 })
      ).status,
      409
    );
    assert.strictEqual(
      (
        await request(app)
          .delete(`/api/pos/orders/${takeawayOrder.id}/items/${takeawayFirstItemId}`)
          .set('Authorization', `Bearer ${tokenAlphaManager}`)
      ).status,
      409
    );
    assert.strictEqual(
      (
        await request(app)
          .post(`/api/pos/orders/${takeawayOrder.id}/cancel`)
          .set('Authorization', `Bearer ${tokenAlphaManager}`)
          .send({ reason: 'Should fail on frozen bill' })
      ).status,
      409
    );

    // Frozen DINE_IN TableSession -> rejects adding new orders to frozen session AND modifying existing session orders (409)
    await prisma.transaction.create({
      data: {
        restaurantId: restaurantAlpha.id,
        sessionId: dineInOrder.sessionId,
        cashierId: userAlphaManager.id,
        transactionNumber: `TX-FREEZE-SES-${runId}`,
        tableName: 'Table 01',
        orderType: 'DINE_IN',
        currency: 'USD',
        subtotal: '22.75',
        taxAmount: '2.28',
        serviceChargeAmount: '1.14',
        discountAmount: '0.00',
        grossAmount: '26.17',
        amountPaid: '0.00',
        writeOffAmount: '0.00',
        paymentStatus: 'UNPAID',
        status: 'ACTIVE',
      },
    });
    assert.strictEqual(
      (
        await request(app)
          .post('/api/pos/orders')
          .set('Authorization', `Bearer ${tokenAlphaManager}`)
          .send({
            orderType: 'DINE_IN',
            sessionId: dineInOrder.sessionId,
            items: [{ productId: prodLatte.id, quantity: 1 }],
          })
      ).status,
      409
    );
    assert.strictEqual(
      (
        await request(app)
          .post(`/api/pos/orders/${dineInOrder.id}/items`)
          .set('Authorization', `Bearer ${tokenAlphaManager}`)
          .send({ productId: prodLatte.id, quantity: 1 })
      ).status,
      409
    );
    console.log('✓ 9. Invalid order states and DB bill-freezing protection verified.');

    // ------------------------------------------------------------------
    // 10. Concurrent requests (DINE_IN table creation + concurrent item additions)
    // ------------------------------------------------------------------
    console.log('10. Testing concurrent DINE_IN order creation and concurrent item updates ...');
    const [concurrentA, concurrentB] = await Promise.all([
      request(app)
        .post('/api/pos/orders')
        .set('Authorization', `Bearer ${tokenAlphaStaff}`)
        .send({
          orderType: 'DINE_IN',
          tableId: tableAConcurrent.id,
          items: [{ productId: prodAmok.id, quantity: 1 }],
        }),
      request(app)
        .post('/api/pos/orders')
        .set('Authorization', `Bearer ${tokenAlphaStaff}`)
        .send({
          orderType: 'DINE_IN',
          tableId: tableAConcurrent.id,
          items: [{ productId: prodLatte.id, quantity: 2 }],
        }),
    ]);

    assert.strictEqual(concurrentA.status, 201);
    assert.strictEqual(concurrentB.status, 201);
    assert.strictEqual(
      concurrentA.body.data.order.sessionId,
      concurrentB.body.data.order.sessionId,
      'Concurrent DINE_IN orders on an empty table must share one ACTIVE TableSession'
    );

    const activeSessionsOnTable = await prisma.tableSession.count({
      where: { restaurantId: restaurantAlpha.id, tableId: tableAConcurrent.id, status: 'ACTIVE' },
    });
    assert.strictEqual(activeSessionsOnTable, 1);

    // Order A total = 7.48, Order B total = 7.48 -> Table/Session totalAmount = 14.96
    const concurrentTableState = await prisma.table.findUniqueOrThrow({
      where: { id: tableAConcurrent.id },
    });
    assert.strictEqual(concurrentTableState.totalAmount.toFixed(2), '14.96');

    // Concurrent item additions on the same order
    const targetOrderId = concurrentA.body.data.order.id;
    const [itemAdd1, itemAdd2] = await Promise.all([
      request(app)
        .post(`/api/pos/orders/${targetOrderId}/items`)
        .set('Authorization', `Bearer ${tokenAlphaStaff}`)
        .send({ productId: prodLatte.id, quantity: 1 }),
      request(app)
        .post(`/api/pos/orders/${targetOrderId}/items`)
        .set('Authorization', `Bearer ${tokenAlphaStaff}`)
        .send({ productId: prodAmok.id, quantity: 1 }),
    ]);
    assert.strictEqual(itemAdd1.status, 201);
    assert.strictEqual(itemAdd2.status, 201);

    const finalOrderRes = await request(app)
      .get(`/api/pos/orders/${targetOrderId}`)
      .set('Authorization', `Bearer ${tokenAlphaStaff}`);
    assert.strictEqual(finalOrderRes.status, 200);
    // Initial 1*6.50 + concurrent 1*3.25 + concurrent 1*6.50 = 16.25 subtotal -> 18.69 total
    assert.strictEqual(finalOrderRes.body.data.order.items.length, 3);
    assert.strictEqual(finalOrderRes.body.data.order.subtotal, '16.25');
    assert.strictEqual(finalOrderRes.body.data.order.total, '18.69');
    console.log('✓ 10. Concurrent DINE_IN session creation and item mutations serialized cleanly.');

    console.log('\n====================================================================');
    console.log('✔ ALL 10 STEP 4 POS ORDER API TEST GROUPS PASSED!');
    console.log('====================================================================');
  } finally {
    console.log('\n[CLEANUP] Removing isolated POS order test fixtures...');
    if (restaurantAlpha?.id) await cleanupRestaurant(restaurantAlpha.id);
    if (restaurantBeta?.id) await cleanupRestaurant(restaurantBeta.id);
    await prisma.$disconnect();
    console.log('✔ Cleanup completed safely.');
  }
}

runPosOrderTests().catch((err) => {
  console.error('\n❌ POS ORDER API TEST SUITE FAILED:', err);
  process.exit(1);
});
