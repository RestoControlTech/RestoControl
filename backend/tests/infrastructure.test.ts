import assert from 'node:assert';
import express, { Request, Response } from 'express';
import request from 'supertest';
import { z } from 'zod';
import { prisma } from '../src/config/prisma.js';
import { config } from '../src/config/index.js';
import { generateToken } from '../src/utils/jwt.js';
import { authenticate } from '../src/middleware/authenticate.js';
import { tenantContext } from '../src/middleware/tenantContext.js';
import { requirePermission, requireRole } from '../src/middleware/authorize.js';
import { validate } from '../src/middleware/validate.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

// Construct isolated Express test application mounting the new core infrastructure
function createTestApp() {
  const app = express();
  app.use(express.json());

  // Public test endpoint
  app.get('/test/public', (_req: Request, res: Response) => {
    res.json({ success: true, message: 'public' });
  });

  // Protected endpoint: requires authentication + tenant context
  app.get('/test/protected', authenticate, tenantContext, (req: Request, res: Response) => {
    // Assert sensitive hashes are NEVER in req.user
    assert.strictEqual((req.user as any)?.passwordHash, undefined, 'passwordHash must never be exposed');
    assert.strictEqual((req.user as any)?.pinHash, undefined, 'pinHash must never be exposed');

    res.json({
      success: true,
      user: req.user,
      restaurantId: req.restaurantId,
    });
  });

  // Protected endpoint with permission requirement
  app.get(
    '/test/permission-write-off',
    authenticate,
    tenantContext,
    requirePermission('TRANSACTION_WRITE_OFF'),
    (_req: Request, res: Response) => {
      res.json({ success: true, action: 'authorized_write_off' });
    }
  );

  // Protected endpoint with role requirement
  app.get(
    '/test/role-admin-only',
    authenticate,
    tenantContext,
    requireRole('ADMIN'),
    (_req: Request, res: Response) => {
      res.json({ success: true, role: 'admin_granted' });
    }
  );

  // Cross-tenant route: accepts :restaurantId in params
  app.get(
    '/test/tenant/:restaurantId/data',
    authenticate,
    tenantContext,
    (req: Request, res: Response) => {
      res.json({ success: true, restaurantId: req.restaurantId });
    }
  );

  // Endpoint with Zod request validation
  const testSchema = {
    body: z.object({
      name: z.string().min(3, 'Name must be at least 3 characters'),
      price: z.number().positive('Price must be positive'),
    }),
    query: z.object({
      category: z.string().optional(),
    }),
  };

  app.post(
    '/test/validate',
    validate(testSchema),
    (req: Request, res: Response) => {
      res.json({ success: true, data: req.body, query: req.query });
    }
  );

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}

async function runTests() {
  console.log('====================================================================');
  console.log('STEP 2C: CORE BACKEND INFRASTRUCTURE & SECURITY VERIFICATION');
  console.log('====================================================================\n');

  const app = createTestApp();
  const runId = Date.now();

  // Provision isolated test fixtures via Prisma
  console.log('[SETUP] Provisioning isolated test fixtures in PostgreSQL...');

  const restaurantA = await prisma.restaurant.create({
    data: {
      name: 'Alpha Bistro',
      slug: `alpha-${runId}`,
      primaryCurrency: 'USD',
    },
  });

  const restaurantB = await prisma.restaurant.create({
    data: {
      name: 'Beta Bistro',
      slug: `beta-${runId}`,
      primaryCurrency: 'USD',
    },
  });

  // Permissions
  const permWriteOff = await prisma.permission.findUnique({
    where: { code: 'TRANSACTION_WRITE_OFF' },
  });
  if (!permWriteOff) throw new Error('TRANSACTION_WRITE_OFF permission not found');

  const permCorrection = await prisma.permission.findUnique({
    where: { code: 'PAYMENT_CORRECTION' },
  });
  if (!permCorrection) throw new Error('PAYMENT_CORRECTION permission not found');

  // Roles in Restaurant A
  const roleAdminA = await prisma.role.create({
    data: {
      restaurantId: restaurantA.id,
      name: 'ADMIN',
      displayName: 'Administrator',
      permissions: {
        create: [
          { permissionId: permWriteOff.id },
          { permissionId: permCorrection.id },
        ],
      },
    },
  });

  const roleCashierA = await prisma.role.create({
    data: {
      restaurantId: restaurantA.id,
      name: 'CASHIER',
      displayName: 'Cashier',
      // No TRANSACTION_WRITE_OFF permission
    },
  });

  // Users in Restaurant A
  const activeUser = await prisma.user.create({
    data: {
      restaurantId: restaurantA.id,
      roleId: roleAdminA.id,
      name: 'Alice Admin',
      email: `alice-${runId}@alpha.com`,
      passwordHash: 'secret_hash_not_exposed',
      isActive: true,
    },
  });

  const cashierUser = await prisma.user.create({
    data: {
      restaurantId: restaurantA.id,
      roleId: roleCashierA.id,
      name: 'Charlie Cashier',
      email: `charlie-${runId}@alpha.com`,
      passwordHash: 'secret_hash_not_exposed',
      isActive: true,
    },
  });

  const inactiveUser = await prisma.user.create({
    data: {
      restaurantId: restaurantA.id,
      roleId: roleAdminA.id,
      name: 'Ian Inactive',
      email: `ian-${runId}@alpha.com`,
      passwordHash: 'secret_hash_not_exposed',
      isActive: false, // Deactivated user
    },
  });

  console.log('[SETUP] Test fixtures created cleanly.\n');

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Missing Authentication Token Returns HTTP 401
    // ------------------------------------------------------------------------
    console.log('1. Testing missing authentication header ...');
    const res1 = await request(app).get('/test/protected');
    assert.strictEqual(res1.status, 401);
    assert.strictEqual(res1.body.success, false);
    assert(res1.body.error.includes('token is required'));
    console.log('✓ 1. Missing authentication token correctly rejected with HTTP 401.\n');

    // ------------------------------------------------------------------------
    // TEST 2: Valid JWT Accepted & Populates User Identity & Tenant Context
    // ------------------------------------------------------------------------
    console.log('2. Testing valid JWT token acceptance ...');
    const validToken = generateToken({
      userId: activeUser.id,
      restaurantId: restaurantA.id,
    });

    const res2 = await request(app)
      .get('/test/protected')
      .set('Authorization', `Bearer ${validToken}`);

    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.body.success, true);
    assert.strictEqual(res2.body.user.id, activeUser.id);
    assert.strictEqual(res2.body.user.restaurantId, restaurantA.id);
    assert.strictEqual(res2.body.restaurantId, restaurantA.id);
    assert.strictEqual(res2.body.user.roleName, 'ADMIN');
    assert(res2.body.user.permissions.includes('TRANSACTION_WRITE_OFF'));
    assert(res2.body.user.permissions.includes('PAYMENT_CORRECTION'));
    console.log('✓ 2. Valid JWT accepted; permissions and verified tenant context populated.\n');

    // ------------------------------------------------------------------------
    // TEST 3: Invalid JWT Signature Rejected with HTTP 401
    // ------------------------------------------------------------------------
    console.log('3. Testing invalid JWT signature ...');
    const tamperedToken = validToken.slice(0, -6) + 'abcdef';
    const res3 = await request(app)
      .get('/test/protected')
      .set('Authorization', `Bearer ${tamperedToken}`);

    assert.strictEqual(res3.status, 401);
    assert.strictEqual(res3.body.success, false);
    assert(res3.body.error.includes('Invalid authentication token'));
    console.log('✓ 3. Tampered JWT signature correctly rejected with HTTP 401.\n');

    // ------------------------------------------------------------------------
    // TEST 4: Expired JWT Rejected with HTTP 401
    // ------------------------------------------------------------------------
    console.log('4. Testing expired JWT token ...');
    const expiredToken = generateToken(
      {
        userId: activeUser.id,
        restaurantId: restaurantA.id,
      },
      '1ms' // Expire immediately in 1 millisecond
    );

    // Short sleep to ensure expiration elapsed
    await new Promise((r) => setTimeout(r, 10));

    const res4 = await request(app)
      .get('/test/protected')
      .set('Authorization', `Bearer ${expiredToken}`);

    assert.strictEqual(res4.status, 401);
    assert.strictEqual(res4.body.success, false);
    assert(res4.body.error.includes('expired'));
    console.log('✓ 4. Expired JWT token correctly rejected with HTTP 401.\n');

    // ------------------------------------------------------------------------
    // TEST 5: Deactivated/Inactive User Rejected with HTTP 401
    // ------------------------------------------------------------------------
    console.log('5. Testing inactive user rejection ...');
    const inactiveToken = generateToken({
      userId: inactiveUser.id,
      restaurantId: restaurantA.id,
    });

    const res5 = await request(app)
      .get('/test/protected')
      .set('Authorization', `Bearer ${inactiveToken}`);

    assert.strictEqual(res5.status, 401);
    assert.strictEqual(res5.body.success, false);
    assert(res5.body.error.includes('deactivated'));
    console.log('✓ 5. Deactivated user strictly rejected with HTTP 401.\n');

    // ------------------------------------------------------------------------
    // TEST 6: Client Header Spoofing Cannot Override Authenticated Tenant/Role
    // ------------------------------------------------------------------------
    console.log('6. Testing that client headers (x-user-role, x-restaurant-id) are untrusted ...');
    const res6 = await request(app)
      .get('/test/protected')
      .set('Authorization', `Bearer ${validToken}`)
      .set('x-user-role', 'SUPER_ADMIN_HACK')
      .set('x-restaurant-id', restaurantB.id);

    assert.strictEqual(res6.status, 200);
    // Verified identity MUST remain restaurantA and ADMIN from database
    assert.strictEqual(res6.body.restaurantId, restaurantA.id);
    assert.strictEqual(res6.body.user.roleName, 'ADMIN');
    console.log('✓ 6. Spoofed client headers completely ignored; database identity enforced.\n');

    // ------------------------------------------------------------------------
    // TEST 7: Server-Side RBAC Permission Checking
    // ------------------------------------------------------------------------
    console.log('7. Testing server-side RBAC permission checking ...');
    // 7a: Admin user with TRANSACTION_WRITE_OFF permission succeeds
    const res7a = await request(app)
      .get('/test/permission-write-off')
      .set('Authorization', `Bearer ${validToken}`);
    assert.strictEqual(res7a.status, 200);
    assert.strictEqual(res7a.body.action, 'authorized_write_off');

    // 7b: Cashier user without TRANSACTION_WRITE_OFF permission is rejected with HTTP 403
    const cashierToken = generateToken({
      userId: cashierUser.id,
      restaurantId: restaurantA.id,
    });

    const res7b = await request(app)
      .get('/test/permission-write-off')
      .set('Authorization', `Bearer ${cashierToken}`);

    assert.strictEqual(res7b.status, 403);
    assert.strictEqual(res7b.body.success, false);
    assert(res7b.body.error.includes('missing permission'));
    console.log('✓ 7. RBAC permissions verified: authorized user succeeds (200), unauthorized user rejected (403).\n');

    // ------------------------------------------------------------------------
    // TEST 8: Role Authorization (requireRole)
    // ------------------------------------------------------------------------
    console.log('8. Testing role authorization (requireRole) ...');
    const res8a = await request(app)
      .get('/test/role-admin-only')
      .set('Authorization', `Bearer ${validToken}`);
    assert.strictEqual(res8a.status, 200);

    const res8b = await request(app)
      .get('/test/role-admin-only')
      .set('Authorization', `Bearer ${cashierToken}`);
    assert.strictEqual(res8b.status, 403);
    assert(res8b.body.error.includes('not authorized'));
    console.log('✓ 8. Role authorization verified: ADMIN accepted, CASHIER rejected with HTTP 403.\n');

    // ------------------------------------------------------------------------
    // TEST 9: Cross-Restaurant Access Rejected with HTTP 403
    // ------------------------------------------------------------------------
    console.log('9. Testing cross-restaurant access prevention (tenantContext) ...');
    // User from Restaurant A attempts to access Restaurant B resource route
    const res9 = await request(app)
      .get(`/test/tenant/${restaurantB.id}/data`)
      .set('Authorization', `Bearer ${validToken}`);

    assert.strictEqual(res9.status, 403);
    assert.strictEqual(res9.body.success, false);
    assert(res9.body.error.includes('Cross-restaurant access is strictly prohibited'));
    console.log('✓ 9. Cross-restaurant access attempt strictly rejected with HTTP 403.\n');

    // ------------------------------------------------------------------------
    // TEST 10: Zod Request Validation Middleware (validate.ts)
    // ------------------------------------------------------------------------
    console.log('10. Testing Zod request validation middleware ...');
    // 10a: Valid payload succeeds
    const res10a = await request(app)
      .post('/test/validate')
      .send({ name: 'Coffee Latte', price: 3.5 });
    assert.strictEqual(res10a.status, 200);
    assert.strictEqual(res10a.body.data.name, 'Coffee Latte');
    assert.strictEqual(res10a.body.data.price, 3.5);

    // 10b: Invalid payload (short name, negative price) returns HTTP 400 with structured issue details
    const res10b = await request(app)
      .post('/test/validate')
      .send({ name: 'Co', price: -5.0 });
    assert.strictEqual(res10b.status, 400);
    assert.strictEqual(res10b.body.success, false);
    assert.strictEqual(res10b.body.error, 'Validation error: invalid request payload');
    assert.strictEqual(res10b.body.details.length, 2);
    console.log('✓ 10. Zod request validation verified: valid passes (200), invalid returns 400 with details.\n');

    // ------------------------------------------------------------------------
    // TEST 11: Security Audit: Hashes Never Exposed
    // ------------------------------------------------------------------------
    console.log('11. Verifying passwordHash and pinHash are never exposed in responses ...');
    const res11 = await request(app)
      .get('/test/protected')
      .set('Authorization', `Bearer ${validToken}`);

    assert.strictEqual(res11.body.user.passwordHash, undefined);
    assert.strictEqual(res11.body.user.pinHash, undefined);
    console.log('✓ 11. Security verified: passwordHash and pinHash are completely absent from user context.\n');

  } finally {
    // Teardown test fixtures
    console.log('[CLEANUP] Cleaning up test fixtures in PostgreSQL...');
    await prisma.rolePermission.deleteMany({
      where: { restaurantId: { in: [restaurantA.id, restaurantB.id] } },
    });
    await prisma.user.deleteMany({
      where: { restaurantId: { in: [restaurantA.id, restaurantB.id] } },
    });
    await prisma.role.deleteMany({
      where: { restaurantId: { in: [restaurantA.id, restaurantB.id] } },
    });
    await prisma.restaurant.deleteMany({
      where: { id: { in: [restaurantA.id, restaurantB.id] } },
    });
    console.log('[CLEANUP] Teardown complete.\n');
  }

  // Final check: Business tables must have 0 residual rows
  const remainingUsers = await prisma.user.count();
  const remainingRestaurants = await prisma.restaurant.count();
  assert.strictEqual(remainingUsers, 0, 'Residual user records detected');
  assert.strictEqual(remainingRestaurants, 0, 'Residual restaurant records detected');

  console.log('====================================================================');
  console.log('✔ ALL 11 INFRASTRUCTURE & SECURITY TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================================');
}

runTests()
  .catch((e) => {
    console.error('INFRASTRUCTURE TEST SUITE FAILED:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
