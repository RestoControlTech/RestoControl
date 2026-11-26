/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { generateToken } from '../src/utils/jwt.js';

async function runPosTests() {
  console.log('====================================================================');
  console.log('STEP 3: POS READ-ONLY BACKEND API TEST SUITE');
  console.log('====================================================================\n');

  const app = createApp();
  const runId = Date.now();

  let restaurantAlpha: any = null;
  let restaurantBeta: any = null;
  let restaurantEmpty: any = null;

  try {
    console.log('[SETUP] Provisioning isolated multi-tenant POS fixtures...');

    restaurantAlpha = await prisma.restaurant.create({
      data: {
        name: `Alpha POS ${runId}`,
        slug: `alpha-pos-${runId}`,
        primaryCurrency: 'USD',
        isActive: true,
      },
    });

    restaurantBeta = await prisma.restaurant.create({
      data: {
        name: `Beta POS ${runId}`,
        slug: `beta-pos-${runId}`,
        primaryCurrency: 'USD',
        isActive: true,
      },
    });

    restaurantEmpty = await prisma.restaurant.create({
      data: {
        name: `Empty POS ${runId}`,
        slug: `empty-pos-${runId}`,
        primaryCurrency: 'USD',
        isActive: true,
      },
    });

    const permPosUse = await prisma.permission.findUnique({
      where: { code: 'pos.use' },
    });
    if (!permPosUse) {
      throw new Error('Required permission "pos.use" not found in PostgreSQL');
    }

    const roleAlphaPos = await prisma.role.create({
      data: {
        restaurantId: restaurantAlpha.id,
        name: 'POS_CASHIER',
        displayName: 'POS Cashier',
        permissions: {
          create: [{ permissionId: permPosUse.id }],
        },
      },
    });

    const roleAlphaNoPos = await prisma.role.create({
      data: {
        restaurantId: restaurantAlpha.id,
        name: 'NO_POS_USER',
        displayName: 'No POS User',
      },
    });

    const roleBetaPos = await prisma.role.create({
      data: {
        restaurantId: restaurantBeta.id,
        name: 'POS_CASHIER',
        displayName: 'POS Cashier',
        permissions: {
          create: [{ permissionId: permPosUse.id }],
        },
      },
    });

    const roleEmptyPos = await prisma.role.create({
      data: {
        restaurantId: restaurantEmpty.id,
        name: 'POS_CASHIER',
        displayName: 'POS Cashier',
        permissions: {
          create: [{ permissionId: permPosUse.id }],
        },
      },
    });

    const [{ dummyHash }] = await prisma.$queryRaw<Array<{ dummyHash: string }>>`
      SELECT public.crypt('TestPosPass123!', public.gen_salt('bf', 10)) AS "dummyHash"
    `;

    const userAlphaPos = await prisma.user.create({
      data: {
        restaurantId: restaurantAlpha.id,
        roleId: roleAlphaPos.id,
        name: 'Alpha Cashier',
        email: `alpha-pos-${runId}@test.local`,
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

    const userBetaPos = await prisma.user.create({
      data: {
        restaurantId: restaurantBeta.id,
        roleId: roleBetaPos.id,
        name: 'Beta Cashier',
        email: `beta-pos-${runId}@test.local`,
        passwordHash: dummyHash,
        isActive: true,
      },
    });

    const userEmptyPos = await prisma.user.create({
      data: {
        restaurantId: restaurantEmpty.id,
        roleId: roleEmptyPos.id,
        name: 'Empty Cashier',
        email: `empty-pos-${runId}@test.local`,
        passwordHash: dummyHash,
        isActive: true,
      },
    });

    const tokenAlpha = generateToken({ userId: userAlphaPos.id, restaurantId: restaurantAlpha.id });
    const tokenAlphaNoPos = generateToken({ userId: userAlphaNoPos.id, restaurantId: restaurantAlpha.id });
    const tokenBeta = generateToken({ userId: userBetaPos.id, restaurantId: restaurantBeta.id });
    const tokenEmpty = generateToken({ userId: userEmptyPos.id, restaurantId: restaurantEmpty.id });

    // Alpha categories (1 active, 1 inactive)
    const catAlphaMain = await prisma.category.create({
      data: {
        restaurantId: restaurantAlpha.id,
        name: 'Main Dishes',
        sortOrder: 1,
        isActive: true,
      },
    });
    const catAlphaArchived = await prisma.category.create({
      data: {
        restaurantId: restaurantAlpha.id,
        name: 'Seasonal Archived',
        sortOrder: 2,
        isActive: false,
      },
    });

    // Alpha products (1 available, 1 unavailable, 1 soft-deleted)
    const prodAlphaAvail = await prisma.product.create({
      data: {
        restaurantId: restaurantAlpha.id,
        categoryId: catAlphaMain.id,
        name: 'Amok Fish',
        description: 'Steamed coconut fish curry',
        price: '6.50',
        costPrice: '2.10',
        isAvailable: true,
        isPopular: true,
      },
    });

    const prodAlphaUnavail = await prisma.product.create({
      data: {
        restaurantId: restaurantAlpha.id,
        categoryId: catAlphaMain.id,
        name: 'Sold Out Crab',
        description: 'Currently unavailable',
        price: '12.00',
        isAvailable: false,
        isPopular: false,
      },
    });

    await prisma.product.create({
      data: {
        restaurantId: restaurantAlpha.id,
        categoryId: catAlphaMain.id,
        name: 'Deleted Dish',
        price: '5.00',
        isAvailable: true,
        deletedAt: new Date(),
      },
    });

    // Alpha tables (t1 AVAILABLE, t2 BUSY, 1 soft-deleted)
    const tblAlpha1 = await prisma.table.create({
      data: {
        restaurantId: restaurantAlpha.id,
        legacyId: 't1',
        name: 'Table 01',
        section: 'Main Dining',
        seats: 4,
        status: 'AVAILABLE',
        qrCodeKey: `alpha-pos-t1-${runId}`,
        qrCodeUrl: 'restocontrol.menu/menu/t1',
        isActive: false,
        totalAmount: '0.00',
      },
    });

    const tblAlpha2 = await prisma.table.create({
      data: {
        restaurantId: restaurantAlpha.id,
        legacyId: 't2',
        name: 'Table 02',
        section: 'Patio',
        seats: 2,
        status: 'BUSY',
        qrCodeKey: `alpha-pos-t2-${runId}`,
        qrCodeUrl: 'restocontrol.menu/menu/t2',
        isActive: true,
        totalAmount: '18.50',
      },
    });

    await prisma.table.create({
      data: {
        restaurantId: restaurantAlpha.id,
        legacyId: 't99',
        name: 'Deleted Table',
        section: 'Hidden',
        seats: 2,
        status: 'AVAILABLE',
        qrCodeKey: `alpha-pos-t99-${runId}`,
        deletedAt: new Date(),
      },
    });

    // Beta fixtures (must never leak to Alpha)
    const catBeta = await prisma.category.create({
      data: {
        restaurantId: restaurantBeta.id,
        name: 'Beta Secret Cat',
        sortOrder: 1,
        isActive: true,
      },
    });

    await prisma.product.create({
      data: {
        restaurantId: restaurantBeta.id,
        categoryId: catBeta.id,
        name: 'Beta Secret Dish',
        price: '99.00',
        isAvailable: true,
      },
    });

    await prisma.table.create({
      data: {
        restaurantId: restaurantBeta.id,
        legacyId: 't1',
        name: 'Beta Table 01',
        section: 'VIP',
        seats: 8,
        status: 'RESERVED',
        qrCodeKey: `beta-pos-t1-${runId}`,
      },
    });

    // -----------------------------------------------------------------------
    // 1. Unauthenticated access returns 401
    // -----------------------------------------------------------------------
    console.log('1. Testing unauthenticated requests return 401 ...');
    await request(app).get('/api/pos/products').expect(401);
    await request(app).get('/api/pos/categories').expect(401);
    await request(app).get('/api/pos/tables').expect(401);
    console.log('✓ 1. Unauthenticated requests returned 401.');

    // -----------------------------------------------------------------------
    // 2. Missing pos.use permission returns 403
    // -----------------------------------------------------------------------
    console.log('2. Testing missing pos.use permission returns 403 ...');
    await request(app)
      .get('/api/pos/products')
      .set('Authorization', `Bearer ${tokenAlphaNoPos}`)
      .expect(403);
    await request(app)
      .get('/api/pos/categories')
      .set('Authorization', `Bearer ${tokenAlphaNoPos}`)
      .expect(403);
    await request(app)
      .get('/api/pos/tables')
      .set('Authorization', `Bearer ${tokenAlphaNoPos}`)
      .expect(403);
    console.log('✓ 2. Missing pos.use permission returned 403.');

    // -----------------------------------------------------------------------
    // 3. Normal authenticated results & DTO checks
    // -----------------------------------------------------------------------
    console.log('3. Testing authenticated GET /api/pos/products, /categories, /tables ...');
    const prodRes = await request(app)
      .get('/api/pos/products')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(200);
    assert.strictEqual(prodRes.body.success, true);
    assert.strictEqual(prodRes.body.data.total, 2, 'Soft-deleted product must be excluded');
    assert.strictEqual(prodRes.body.data.products[0].id, prodAlphaAvail.id);
    assert.strictEqual(prodRes.body.data.products[0].price, '6.50');
    assert.strictEqual(prodRes.body.data.products[0].categoryName, 'Main Dishes');
    assert.strictEqual(prodRes.body.data.products[0].restaurantId, undefined, 'Must not expose restaurantId');
    assert.strictEqual(prodRes.body.data.products[0].costPrice, undefined, 'Must not expose costPrice');

    const catRes = await request(app)
      .get('/api/pos/categories')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(200);
    assert.strictEqual(catRes.body.success, true);
    assert.strictEqual(catRes.body.data.total, 2);
    assert.strictEqual(catRes.body.data.categories[0].id, catAlphaMain.id);
    assert.strictEqual(catRes.body.data.categories[0].productCount, 2);
    assert.strictEqual(catRes.body.data.categories[0].restaurantId, undefined);

    const tblRes = await request(app)
      .get('/api/pos/tables')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(200);
    assert.strictEqual(tblRes.body.success, true);
    assert.strictEqual(tblRes.body.data.total, 2, 'Soft-deleted table must be excluded');
    assert.strictEqual(tblRes.body.data.tables[0].id, tblAlpha1.id);
    assert.strictEqual(tblRes.body.data.tables[0].legacyId, 't1');
    assert.strictEqual(tblRes.body.data.tables[1].id, tblAlpha2.id);
    assert.strictEqual(tblRes.body.data.tables[1].totalAmount, '18.50');
    assert.strictEqual(tblRes.body.data.tables[0].restaurantId, undefined);
    console.log('✓ 3. Normal authenticated results verified.');

    // -----------------------------------------------------------------------
    // 4. POS filters
    // -----------------------------------------------------------------------
    console.log('4. Testing POS query filters ...');
    const availProdRes = await request(app)
      .get(`/api/pos/products?categoryId=${catAlphaMain.id}&availableOnly=true&search=Amok`)
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(200);
    assert.strictEqual(availProdRes.body.data.total, 1);
    assert.strictEqual(availProdRes.body.data.products[0].id, prodAlphaAvail.id);

    const unavailProdRes = await request(app)
      .get('/api/pos/products?availableOnly=false')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(200);
    assert.strictEqual(unavailProdRes.body.data.total, 1);
    assert.strictEqual(unavailProdRes.body.data.products[0].id, prodAlphaUnavail.id);

    const activeCatRes = await request(app)
      .get('/api/pos/categories?activeOnly=true')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(200);
    assert.strictEqual(activeCatRes.body.data.total, 1);
    assert.strictEqual(activeCatRes.body.data.categories[0].id, catAlphaMain.id);

    const busyTblRes = await request(app)
      .get('/api/pos/tables?status=BUSY&activeOnly=true')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(200);
    assert.strictEqual(busyTblRes.body.data.total, 1);
    assert.strictEqual(busyTblRes.body.data.tables[0].id, tblAlpha2.id);
    console.log('✓ 4. POS filters verified.');

    // -----------------------------------------------------------------------
    // 5. Empty results
    // -----------------------------------------------------------------------
    console.log('5. Testing empty restaurant returns empty arrays ...');
    const emptyProd = await request(app)
      .get('/api/pos/products')
      .set('Authorization', `Bearer ${tokenEmpty}`)
      .expect(200);
    assert.deepStrictEqual(emptyProd.body.data, { products: [], total: 0 });

    const emptyCat = await request(app)
      .get('/api/pos/categories')
      .set('Authorization', `Bearer ${tokenEmpty}`)
      .expect(200);
    assert.deepStrictEqual(emptyCat.body.data, { categories: [], total: 0 });

    const emptyTbl = await request(app)
      .get('/api/pos/tables')
      .set('Authorization', `Bearer ${tokenEmpty}`)
      .expect(200);
    assert.deepStrictEqual(emptyTbl.body.data, { tables: [], total: 0 });
    console.log('✓ 5. Empty results verified.');

    // -----------------------------------------------------------------------
    // 6. Tenant isolation
    // -----------------------------------------------------------------------
    console.log('6. Testing strict tenant isolation ...');
    await request(app)
      .get(`/api/pos/products?restaurantId=${restaurantBeta.id}`)
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(403);

    const crossSearch = await request(app)
      .get('/api/pos/products?search=Beta')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(200);
    assert.strictEqual(crossSearch.body.data.total, 0);

    const betaProd = await request(app)
      .get('/api/pos/products')
      .set('Authorization', `Bearer ${tokenBeta}`)
      .expect(200);
    assert.strictEqual(betaProd.body.data.total, 1);
    assert.strictEqual(betaProd.body.data.products[0].name, 'Beta Secret Dish');
    assert.ok(catAlphaArchived.id);
    console.log('✓ 6. Tenant isolation verified.');

    // -----------------------------------------------------------------------
    // 7. Invalid filters return 400 ValidationError
    // -----------------------------------------------------------------------
    console.log('7. Testing invalid filters return 400 ...');
    await request(app)
      .get('/api/pos/products?categoryId=not-a-uuid')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(400);
    await request(app)
      .get('/api/pos/products?availableOnly=maybe')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(400);
    await request(app)
      .get('/api/pos/categories?activeOnly=invalid')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(400);
    await request(app)
      .get('/api/pos/tables?status=INVALID_STATUS')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(400);
    await request(app)
      .get('/api/pos/tables?activeOnly=nope')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .expect(400);
    console.log('✓ 7. Invalid filters returned 400.');

    console.log('\n====================================================================');
    console.log('✔ ALL 7 STEP 3 POS READ-ONLY API TEST GROUPS PASSED!');
    console.log('====================================================================\n');
  } finally {
    const restaurantIds = [restaurantAlpha?.id, restaurantBeta?.id, restaurantEmpty?.id].filter(Boolean);
    if (restaurantIds.length > 0) {
      await prisma.product.deleteMany({ where: { restaurantId: { in: restaurantIds } } });
      await prisma.category.deleteMany({ where: { restaurantId: { in: restaurantIds } } });
      await prisma.table.deleteMany({ where: { restaurantId: { in: restaurantIds } } });
      await prisma.user.deleteMany({ where: { restaurantId: { in: restaurantIds } } });
      await prisma.role.deleteMany({ where: { restaurantId: { in: restaurantIds } } });
      await prisma.restaurant.deleteMany({ where: { id: { in: restaurantIds } } });
    }
    await prisma.$disconnect();
  }
}

runPosTests().catch((err) => {
  console.error('\n❌ POS API TEST SUITE FAILED:', err);
  process.exitCode = 1;
});
