/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app.js';

async function runTests() {
  console.log('--- Running Standalone Backend Health & Core Middleware Tests ---');

  // Test 1: GET /api/health returns HTTP 200 and expected payload structure
  {
    console.log('1. Testing GET /api/health ...');
    const res = await request(app).get('/api/health');

    assert.strictEqual(res.status, 200, `Expected status 200, got ${res.status}`);
    assert.strictEqual(res.body.success, true, 'Expected success to be true');
    assert.strictEqual(res.body.message, 'RestoControl API is running', 'Expected proper health message');
    assert(Boolean(res.body.timestamp), 'Expected timestamp in response');
    const parsedDate = new Date(res.body.timestamp);
    assert(!isNaN(parsedDate.getTime()), 'Expected valid ISO timestamp');
    console.log('✓ 1. GET /api/health passed with status 200 and valid JSON payload.');
  }

  // Test 2: Top-level alias GET /health returns HTTP 200
  {
    console.log('2. Testing GET /health alias ...');
    const res = await request(app).get('/health');

    assert.strictEqual(res.status, 200, `Expected status 200, got ${res.status}`);
    assert.strictEqual(res.body.success, true);
    console.log('✓ 2. GET /health alias passed with status 200.');
  }

  // Test 3: Invalid route returns HTTP 404
  {
    console.log('3. Testing 404 on invalid route ...');
    const res = await request(app).get('/api/invalid-nonexistent-endpoint');

    assert.strictEqual(res.status, 404, `Expected status 404, got ${res.status}`);
    assert.strictEqual(res.body.success, false, 'Expected success to be false');
    assert(res.body.error.includes('Route not found'), 'Expected Route not found error message');
    console.log('✓ 3. Invalid route returned 404 with structured JSON error.');
  }

  // Test 4: Malformed JSON payload returns HTTP 400
  {
    console.log('4. Testing malformed JSON body handling ...');
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"broken_json": true,'); // intentional syntax error

    assert.strictEqual(res.status, 400, `Expected status 400 for malformed JSON, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert(res.body.error.includes('Invalid JSON payload'), 'Expected Invalid JSON payload error message');
    console.log('✓ 4. Malformed JSON body was cleanly caught and returned HTTP 400.');
  }

  // Test 5: CORS Headers verification
  {
    console.log('5. Testing CORS headers ...');
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:3000');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(
      res.headers['access-control-allow-origin'],
      'http://localhost:3000',
      'Expected Access-Control-Allow-Origin header to match frontend'
    );
    assert.strictEqual(
      res.headers['access-control-allow-credentials'],
      'true',
      'Expected Access-Control-Allow-Credentials header to be true'
    );
    console.log('✓ 5. CORS correctly allowed request from http://localhost:3000.');
  }

  // Test 6: Security Headers (Helmet) verification
  {
    console.log('6. Testing Helmet security headers ...');
    const res = await request(app).get('/api/health');

    assert(Boolean(res.headers['x-content-type-options']), 'Expected X-Content-Type-Options');
    assert(Boolean(res.headers['x-dns-prefetch-control']), 'Expected X-DNS-Prefetch-Control');
    console.log('✓ 6. Helmet security headers verified.');
  }

  console.log('=======================================================');
  console.log('✔ ALL Standalone Backend Tests Passed Successfully!');
  console.log('=======================================================');
}

runTests().catch((err) => {
  console.error('❌ Backend test failure:', err);
  process.exit(1);
});

