/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { config } from '../src/config/index.js';
import { generateToken, verifyToken } from '../src/utils/jwt.js';
import { authRepository, DUMMY_COST10_HASH } from '../src/repositories/auth.repository.js';

async function runAuthTests() {
  console.log('====================================================================');
  console.log('STEP 2D: COMPREHENSIVE AUTHENTICATION API TEST SUITE');
  console.log('====================================================================\n');

  const app = createApp();
  const runId = Date.now();

  console.log('[SETUP] Provisioning isolated test fixtures in PostgreSQL...');

  let restaurantActive: any = null;
  let restaurantInactive: any = null;
  let restaurantOther: any = null;

  try {
    // 1. Create Active Restaurant (Alpha)
    restaurantActive = await prisma.restaurant.create({
      data: {
        name: 'Alpha Bistro Auth',
        slug: `alpha-auth-${runId}`,
        primaryCurrency: 'USD',
        isActive: true,
      },
    });

    // 2. Create Inactive Restaurant (Beta)
    restaurantInactive = await prisma.restaurant.create({
      data: {
        name: 'Beta Inactive Bistro',
        slug: `beta-inact-${runId}`,
        primaryCurrency: 'USD',
        isActive: false, // Inactive restaurant
      },
    });

    // 3. Create Another Active Restaurant (Gamma - for cross-tenant check)
    restaurantOther = await prisma.restaurant.create({
      data: {
        name: 'Gamma Bistro Auth',
        slug: `gamma-auth-${runId}`,
        primaryCurrency: 'USD',
        isActive: true,
      },
    });

    // Fetch existing permissions
    const permWriteOff = await prisma.permission.findUnique({
      where: { code: 'TRANSACTION_WRITE_OFF' },
    });
    const permCorrection = await prisma.permission.findUnique({
      where: { code: 'PAYMENT_CORRECTION' },
    });
    if (!permWriteOff || !permCorrection) {
      throw new Error('Required permissions not found in PostgreSQL');
    }

    // Create Roles in Restaurant Alpha
    const roleAdminAlpha = await prisma.role.create({
      data: {
        restaurantId: restaurantActive.id,
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

    // Create Roles in Inactive Restaurant Beta
    const roleBeta = await prisma.role.create({
      data: {
        restaurantId: restaurantInactive.id,
        name: 'MANAGER',
        displayName: 'Manager',
      },
    });

    // Create Roles in Restaurant Gamma
    const roleGamma = await prisma.role.create({
      data: {
        restaurantId: restaurantOther.id,
        name: 'STAFF',
        displayName: 'Staff',
      },
    });

    // Hash passwords using PostgreSQL pgcrypto crypt() with cost 10 Blowfish
    const passwordAlice = 'SecureAlicePassword123!';
    const passwordIan = 'SecureIanPassword123!';
    const passwordBob = 'SecureBobPassword123!';

    const [{ aliceHash }] = await prisma.$queryRaw<Array<{ aliceHash: string }>>`
      SELECT public.crypt(${passwordAlice}, public.gen_salt('bf', 10)) AS "aliceHash"
    `;
    const [{ ianHash }] = await prisma.$queryRaw<Array<{ ianHash: string }>>`
      SELECT public.crypt(${passwordIan}, public.gen_salt('bf', 10)) AS "ianHash"
    `;
    const [{ bobHash }] = await prisma.$queryRaw<Array<{ bobHash: string }>>`
      SELECT public.crypt(${passwordBob}, public.gen_salt('bf', 10)) AS "bobHash"
    `;

    // Create Active User (Alice) in Active Restaurant
    const userAlice = await prisma.user.create({
      data: {
        restaurantId: restaurantActive.id,
        roleId: roleAdminAlpha.id,
        name: 'Alice Admin',
        email: `alice-${runId}@alpha.com`,
        passwordHash: aliceHash,
        phone: '+1234567890',
        avatarUrl: 'https://cdn.example.com/alice.png',
        isActive: true,
      },
    });

    // Create Inactive User (Ian) in Active Restaurant
    const userIan = await prisma.user.create({
      data: {
        restaurantId: restaurantActive.id,
        roleId: roleAdminAlpha.id,
        name: 'Ian Inactive',
        email: `ian-${runId}@alpha.com`,
        passwordHash: ianHash,
        isActive: false, // Deactivated user
      },
    });

    // Create User (Bob) in Inactive Restaurant (Beta)
    const userBob = await prisma.user.create({
      data: {
        restaurantId: restaurantInactive.id,
        roleId: roleBeta.id,
        name: 'Bob Beta',
        email: `bob-${runId}@beta.com`,
        passwordHash: bobHash,
        isActive: true,
      },
    });

    console.log('[SETUP] Isolated fixtures created cleanly.\n');

    // ========================================================================
    // LOGIN TESTS: POST /api/auth/login
    // ========================================================================

    // TEST 1: Valid credentials → HTTP 200
    console.log('1. Testing POST /api/auth/login with valid credentials ...');
    const res1 = await request(app)
      .post('/api/auth/login')
      .send({
        email: userAlice.email,
        password: passwordAlice,
      });
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.body.success, true);
    assert(typeof res1.body.data.token === 'string' && res1.body.data.token.length > 20);
    assert.strictEqual(res1.body.data.user.id, userAlice.id);
    assert.strictEqual(res1.body.data.user.email, userAlice.email);
    assert.strictEqual(res1.body.data.user.name, userAlice.name);
    assert.strictEqual(res1.body.data.user.role.name, 'ADMIN');
    assert.strictEqual(res1.body.data.user.restaurant.id, restaurantActive.id);
    assert.deepStrictEqual(res1.body.data.user.permissions.sort(), ['PAYMENT_CORRECTION', 'TRANSACTION_WRITE_OFF']);
    console.log('✓ 1. Valid credentials succeeded with HTTP 200 and complete safe profile.\n');

    const aliceToken = res1.body.data.token;

    // TEST 2: Incorrect password → HTTP 401
    console.log('2. Testing POST /api/auth/login with incorrect password ...');
    const res2 = await request(app)
      .post('/api/auth/login')
      .send({
        email: userAlice.email,
        password: 'CompletelyWrongPassword123!',
      });
    assert.strictEqual(res2.status, 401);
    assert.strictEqual(res2.body.success, false);
    assert.strictEqual(res2.body.error, 'Invalid email or password');
    console.log('✓ 2. Incorrect password rejected with HTTP 401 and generic message.\n');

    // TEST 3: Unknown user → HTTP 401
    console.log('3. Testing POST /api/auth/login with unknown user email ...');
    const res3 = await request(app)
      .post('/api/auth/login')
      .send({
        email: `nonexistent-${runId}@unknown.com`,
        password: 'AnyPassword123!',
      });
    assert.strictEqual(res3.status, 401);
    assert.strictEqual(res3.body.success, false);
    assert.strictEqual(res3.body.error, 'Invalid email or password');
    console.log('✓ 3. Unknown user rejected with HTTP 401 and identical generic message.\n');

    // TEST 4: Missing password → HTTP 400
    console.log('4. Testing POST /api/auth/login with missing password ...');
    const res4 = await request(app)
      .post('/api/auth/login')
      .send({
        email: userAlice.email,
      });
    assert.strictEqual(res4.status, 400);
    assert.strictEqual(res4.body.success, false);
    assert(res4.body.error.includes('Validation error'));
    console.log('✓ 4. Missing password rejected with HTTP 400 validation error.\n');

    // TEST 5: Missing login identifier (email) → HTTP 400
    console.log('5. Testing POST /api/auth/login with missing email ...');
    const res5 = await request(app)
      .post('/api/auth/login')
      .send({
        password: passwordAlice,
      });
    assert.strictEqual(res5.status, 400);
    assert.strictEqual(res5.body.success, false);
    assert(res5.body.error.includes('Validation error'));
    console.log('✓ 5. Missing email rejected with HTTP 400 validation error.\n');

    // TEST 6: Inactive user → Generic HTTP 401 (account status not revealed)
    console.log('6. Testing POST /api/auth/login with inactive user account ...');
    const res6 = await request(app)
      .post('/api/auth/login')
      .send({
        email: userIan.email,
        password: passwordIan,
      });
    assert.strictEqual(res6.status, 401);
    assert.strictEqual(res6.body.success, false);
    assert.strictEqual(res6.body.error, 'Invalid email or password');
    console.log('✓ 6. Deactivated user rejected with generic HTTP 401 (no account status leak).\n');

    // TEST 7: Inactive restaurant → Generic HTTP 401 (tenant status not revealed)
    console.log('7. Testing POST /api/auth/login for user in inactive restaurant ...');
    const res7 = await request(app)
      .post('/api/auth/login')
      .send({
        email: userBob.email,
        password: passwordBob,
      });
    assert.strictEqual(res7.status, 401);
    assert.strictEqual(res7.body.success, false);
    assert.strictEqual(res7.body.error, 'Invalid email or password');
    console.log('✓ 7. Inactive restaurant user rejected with generic HTTP 401 (no tenant status leak).\n');

    // TEST 8: Invalid request body (malformed JSON or invalid email format) → HTTP 400
    console.log('8. Testing POST /api/auth/login with invalid email format ...');
    const res8 = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'not-an-email',
        password: 'ValidPassword123!',
      });
    assert.strictEqual(res8.status, 400);
    assert.strictEqual(res8.body.success, false);
    assert(res8.body.error.includes('Validation error'));
    console.log('✓ 8. Invalid email format rejected with HTTP 400.\n');

    // TEST 9: Successful login returns a minimal valid JWT (userId and restaurantId only)
    console.log('9. Verifying returned JWT payload structure and cryptographic signature ...');
    const decodedAlice = verifyToken(aliceToken);
    assert.strictEqual(decodedAlice.userId, userAlice.id);
    assert.strictEqual(decodedAlice.restaurantId, restaurantActive.id);
    assert.strictEqual((decodedAlice as any).roleId, undefined, 'roleId must not be in token');
    assert.strictEqual((decodedAlice as any).roleName, undefined, 'roleName must not be in token');
    assert.strictEqual((decodedAlice as any).email, undefined, 'email must not be in token');
    assert.strictEqual((decodedAlice as any).passwordHash, undefined);
    assert.strictEqual((decodedAlice as any).pinHash, undefined);
    console.log('✓ 9. Returned JWT contains only minimal identity claims (userId, restaurantId).\n');

    // TEST 10: Sensitive hashes never appear in the response
    console.log('10. Verifying sensitive hashes (passwordHash, pinHash) are absent from response ...');
    assert.strictEqual(res1.body.data.user.passwordHash, undefined);
    assert.strictEqual(res1.body.data.user.pinHash, undefined);
    const rawResponseText = JSON.stringify(res1.body);
    assert(!rawResponseText.includes(aliceHash), 'passwordHash leaked in raw response!');
    assert(!rawResponseText.includes('passwordHash'), 'passwordHash key present in response!');
    assert(!rawResponseText.includes('pinHash'), 'pinHash key present in response!');
    console.log('✓ 10. Zero exposure of passwordHash and pinHash verified.\n');

    // ========================================================================
    // CURRENT-USER TESTS: GET /api/auth/me
    // ========================================================================

    // TEST 11: Valid JWT → HTTP 200
    console.log('11. Testing GET /api/auth/me with valid JWT ...');
    const res11 = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${aliceToken}`);
    assert.strictEqual(res11.status, 200);
    assert.strictEqual(res11.body.success, true);
    assert.strictEqual(res11.body.data.user.id, userAlice.id);
    assert.strictEqual(res11.body.data.user.email, userAlice.email);
    assert.strictEqual(res11.body.data.user.name, userAlice.name);
    assert.strictEqual(res11.body.data.user.role.name, 'ADMIN');
    assert.strictEqual(res11.body.data.user.restaurant.id, restaurantActive.id);
    console.log('✓ 11. GET /api/auth/me succeeded with HTTP 200 and verified identity.\n');

    // TEST 12: Missing JWT → HTTP 401
    console.log('12. Testing GET /api/auth/me with missing JWT ...');
    const res12 = await request(app)
      .get('/api/auth/me');
    assert.strictEqual(res12.status, 401);
    assert.strictEqual(res12.body.success, false);
    assert(res12.body.error.includes('token is required'));
    console.log('✓ 12. Missing JWT rejected with HTTP 401.\n');

    // TEST 13: Invalid JWT → HTTP 401
    console.log('13. Testing GET /api/auth/me with tampered JWT ...');
    const tamperedToken = aliceToken.substring(0, aliceToken.length - 8) + 'tampered';
    const res13 = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tamperedToken}`);
    assert.strictEqual(res13.status, 401);
    assert.strictEqual(res13.body.success, false);
    assert(res13.body.error.includes('Invalid authentication token signature'));
    console.log('✓ 13. Tampered JWT rejected with HTTP 401.\n');

    // TEST 14: Expired JWT → HTTP 401
    console.log('14. Testing GET /api/auth/me with expired JWT ...');
    const expiredToken = generateToken(
      {
        userId: userAlice.id,
        restaurantId: restaurantActive.id,
      },
      '-1s'
    );
    const res14 = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);
    assert.strictEqual(res14.status, 401);
    assert.strictEqual(res14.body.success, false);
    assert(res14.body.error.includes('Authentication token has expired'));
    console.log('✓ 14. Expired JWT rejected with HTTP 401.\n');

    // TEST 15: Inactive user with previously issued JWT → HTTP 401
    console.log('15. Testing GET /api/auth/me for user deactivated after token issuance ...');
    const tokenForIan = generateToken({
      userId: userIan.id,
      restaurantId: restaurantActive.id,
    });
    const res15 = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenForIan}`);
    assert.strictEqual(res15.status, 401);
    assert.strictEqual(res15.body.success, false);
    assert.strictEqual(res15.body.error, 'User account is deactivated');
    console.log('✓ 15. Deactivated user with previously issued JWT strictly rejected with HTTP 401.\n');

    // TEST 16: Inactive restaurant with previously issued JWT → HTTP 401
    console.log('16. Testing GET /api/auth/me for restaurant deactivated after token issuance ...');
    const tokenForBob = generateToken({
      userId: userBob.id,
      restaurantId: restaurantInactive.id,
    });
    const res16 = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenForBob}`);
    assert.strictEqual(res16.status, 401);
    assert.strictEqual(res16.body.success, false);
    assert.strictEqual(res16.body.error, 'Restaurant account is deactivated');
    console.log('✓ 16. Inactive restaurant with previously issued JWT strictly rejected with HTTP 401.\n');

    // TEST 17: Current database permissions are returned dynamically
    console.log('17. Testing that GET /api/auth/me returns live database permissions ...');
    assert.deepStrictEqual(
      res11.body.data.user.permissions.sort(),
      ['PAYMENT_CORRECTION', 'TRANSACTION_WRITE_OFF']
    );
    console.log('✓ 17. Live PostgreSQL permissions verified in /me response.\n');

    // TEST 18: Cross-tenant identity cannot be spoofed via client headers
    console.log('18. Testing that client headers (x-restaurant-id, x-user-role) cannot spoof tenant ...');
    const res18 = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${aliceToken}`)
      .set('x-restaurant-id', restaurantOther.id)
      .set('x-user-role', 'SUPER_ROOT');
    assert.strictEqual(res18.status, 200);
    // Tenant identity remains strictly Alpha Bistro from the database
    assert.strictEqual(res18.body.data.user.restaurant.id, restaurantActive.id);
    assert.strictEqual(res18.body.data.user.role.name, 'ADMIN');
    console.log('✓ 18. Cross-tenant header spoofing completely disregarded.\n');

    // TEST 19: PasswordHash and pinHash never appear in GET /api/auth/me
    console.log('19. Verifying passwordHash and pinHash never appear in /me response ...');
    assert.strictEqual(res11.body.data.user.passwordHash, undefined);
    assert.strictEqual(res11.body.data.user.pinHash, undefined);
    const rawMeText = JSON.stringify(res11.body);
    assert(!rawMeText.includes('passwordHash'));
    assert(!rawMeText.includes('pinHash'));
    console.log('✓ 19. Zero exposure of passwordHash and pinHash in /me confirmed.\n');

    // ========================================================================
    // LOGOUT TESTS: POST /api/auth/logout
    // ========================================================================

    // TEST 20: Valid JWT → successful logout response
    console.log('20. Testing POST /api/auth/logout with valid JWT ...');
    const res20 = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${aliceToken}`);
    assert.strictEqual(res20.status, 200);
    assert.strictEqual(res20.body.success, true);
    assert(res20.body.message.includes('Logged out successfully'));
    console.log('✓ 20. Valid JWT logout succeeded with HTTP 200.\n');

    // TEST 21: Missing JWT → HTTP 401
    console.log('21. Testing POST /api/auth/logout with missing JWT ...');
    const res21 = await request(app)
      .post('/api/auth/logout');
    assert.strictEqual(res21.status, 401);
    assert.strictEqual(res21.body.success, false);
    assert(res21.body.error.includes('token is required'));
    console.log('✓ 21. Missing JWT on logout rejected with HTTP 401.\n');

    // TEST 22: Response does not expose the JWT
    console.log('22. Verifying logout response does not expose JWT token ...');
    const rawLogoutText = JSON.stringify(res20.body);
    assert(!rawLogoutText.includes(aliceToken));
    assert.strictEqual((res20.body as any).token, undefined);
    console.log('✓ 22. Logout response does not echo or expose token.\n');

    // TEST 23: Logout does not falsely claim server-side token revocation
    console.log('23. Verifying logout documentation/instruction regarding client-side token removal ...');
    assert(res20.body.message.includes('client must clear'));
    console.log('✓ 23. Stateless logout accurately instructs client to clear token.\n');

    // ========================================================================
    // SECURITY CORRECTION TESTS (FIX 2 & FIX 4)
    // ========================================================================

    // TEST 24: Dummy password verification format, cost, and cryptographic execution
    console.log('24. Verifying dummy password verification format, cost 10, and crypt() execution ...');
    // 24a: Independent format and cost verification
    assert.strictEqual(typeof DUMMY_COST10_HASH, 'string');
    assert.strictEqual(DUMMY_COST10_HASH.length, 60, 'Bcrypt hash must be exactly 60 characters');
    assert(
      /^\$2[ab]\$10\$[A-Za-z0-9./]{53}$/.test(DUMMY_COST10_HASH),
      'DUMMY_COST10_HASH must be a valid Blowfish bcrypt hash format with cost 10'
    );
    assert(DUMMY_COST10_HASH.startsWith('$2a$10$'), 'DUMMY_COST10_HASH must start with $2a$10$');

    // 24b: Independent PostgreSQL crypt() execution check
    const [{ computedByPostgres }] = await prisma.$queryRaw<Array<{ computedByPostgres: string }>>`
      SELECT public.crypt('ArbitraryProbeTest123!', ${DUMMY_COST10_HASH}) AS "computedByPostgres"
    `;
    assert.strictEqual(computedByPostgres.length, 60, 'PostgreSQL crypt() must compute a 60-character bcrypt hash');
    assert(computedByPostgres.startsWith('$2a$10$'), 'PostgreSQL crypt() must process cost 10');
    assert.notStrictEqual(
      computedByPostgres,
      DUMMY_COST10_HASH,
      'Probe password must not match dummy hash'
    );

    // 24c: Dummy verify method behavior check
    const dummyResult = await authRepository.dummyVerifyPassword('SomeRandomPassword123!');
    assert.strictEqual(dummyResult, false, 'Dummy verification must always return false');
    console.log('✓ 24. Dummy bcrypt verification independently confirmed (valid format, cost 10, crypt() execution verified, returns false).\n');

    // TEST 25: Malformed JWT payload without required fields is rejected
    console.log('25. Testing that malformed JWT payload is rejected with HTTP 401 ...');
    const malformedToken = jwt.sign(
      { someIrrelevantField: 'malformed_data' },
      config.jwtSecret,
      { algorithm: 'HS256' }
    );
    const res25 = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${malformedToken}`);
    assert.strictEqual(res25.status, 401);
    assert.strictEqual(res25.body.success, false);
    assert(res25.body.error.includes('Invalid authentication token payload'));
    console.log('✓ 25. Malformed JWT payload strictly rejected with HTTP 401.\n');

    // TEST 26: Non-HS256 token is rejected
    console.log('26. Testing that non-HS256 token is strictly rejected ...');
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({ userId: userAlice.id, restaurantId: restaurantActive.id })
    ).toString('base64url');
    const unsignedToken = `${header}.${payload}.`;

    const res26 = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${unsignedToken}`);
    assert.strictEqual(res26.status, 401);
    assert.strictEqual(res26.body.success, false);
    console.log('✓ 26. Non-HS256 token strictly rejected with HTTP 401.\n');

  } finally {
    // Teardown test fixtures with explicit error handling and assertion enforcement
    console.log('[CLEANUP] Cleaning up test fixtures in PostgreSQL...');
    try {
      const restIds = [
        restaurantActive?.id,
        restaurantInactive?.id,
        restaurantOther?.id,
      ].filter(Boolean);

      if (restIds.length > 0) {
        await prisma.rolePermission.deleteMany({
          where: { restaurantId: { in: restIds } },
        });
        await prisma.user.deleteMany({
          where: { restaurantId: { in: restIds } },
        });
        await prisma.role.deleteMany({
          where: { restaurantId: { in: restIds } },
        });
        await prisma.restaurant.deleteMany({
          where: { id: { in: restIds } },
        });
      }

      // Assert residual counts immediately inside cleanup handler
      const remainingUsers = await prisma.user.count();
      const remainingRestaurants = await prisma.restaurant.count();
      const remainingRoles = await prisma.role.count();
      const remainingRolePerms = await prisma.rolePermission.count();

      assert.strictEqual(remainingUsers, 0, 'Residual user records detected in database after cleanup');
      assert.strictEqual(remainingRestaurants, 0, 'Residual restaurant records detected in database after cleanup');
      assert.strictEqual(remainingRoles, 0, 'Residual role records detected in database after cleanup');
      assert.strictEqual(remainingRolePerms, 0, 'Residual role_permission records detected in database after cleanup');

      console.log('[CLEANUP] Teardown complete. Zero residual test records verified in PostgreSQL.\n');
    } catch (cleanupError) {
      console.error('[CLEANUP FAILED] CRITICAL ERROR: Teardown failed or residual records remain in database:', cleanupError);
      throw cleanupError;
    }
  }

  console.log('====================================================================');
  console.log('✔ ALL 26 AUTHENTICATION & SECURITY TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================================\n');
}

runAuthTests()
  .catch((e) => {
    console.error('AUTHENTICATION TEST SUITE FAILED:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
