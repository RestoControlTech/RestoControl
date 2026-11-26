/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import { apiClient } from './client';
import { API_BASE_URL, buildApiUrl } from './config';
import { ApiError, isApiError } from './errors';
import {
  setToken,
  clearToken,
  getToken,
  apiLogin,
  apiGetMe,
  apiLogout,
} from '../authApi';

function createTextResponse(
  status: number,
  bodyText: string,
  contentType = 'application/json'
): Response {
  const headers = new Headers();
  if (contentType) {
    headers.set('content-type', contentType);
  }
  return {
    ok: status >= 200 && status < 300,
    status,
    headers,
    text: async () => bodyText,
    json: async () => JSON.parse(bodyText),
  } as unknown as Response;
}

const SAMPLE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.testPayload.testSig';

async function runApiClientTests() {
  console.log('====================================================================');
  console.log('STEP 2F: CENTRALIZED API CLIENT & ERROR HANDLING TEST SUITE');
  console.log('====================================================================\n');

  const originalFetch = globalThis.fetch;

  try {
    // -------------------------------------------------------------------------
    // 0. URL Building & Relative Path Normalization
    // -------------------------------------------------------------------------
    console.log('0. Testing Centralized URL Configuration ...');
    assert.strictEqual(API_BASE_URL, '/api');
    assert.strictEqual(buildApiUrl('/auth/me'), '/api/auth/me');
    assert.strictEqual(buildApiUrl('/api/auth/me'), '/api/auth/me');
    assert.strictEqual(
      buildApiUrl('/orders', { status: 'pending', page: 2, ignored: undefined, empty: null }),
      '/api/orders?status=pending&page=2'
    );
    console.log('✓ Test 0 passed: Relative /api URLs and query parameters built cleanly.');

    // -------------------------------------------------------------------------
    // 1. GET, POST, PUT, PATCH, DELETE Requests & JSON Parsing
    // -------------------------------------------------------------------------
    console.log('1. Testing HTTP Methods (GET, POST, PUT, PATCH, DELETE) & JSON Parsing ...');
    clearToken();
    const recordedCalls: Array<{ url: string; method: string; body?: string; headers: Record<string, string> }> = [];

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      const method = (init?.method || 'GET').toUpperCase();
      const headers = (init?.headers || {}) as Record<string, string>;
      recordedCalls.push({
        url,
        method,
        body: init?.body ? String(init.body) : undefined,
        headers,
      });
      return createTextResponse(200, JSON.stringify({ success: true, method, url }));
    };

    const getRes = await apiClient.get<{ success: boolean; method: string; url: string }>('/menu', {
      params: { active: true },
    });
    assert.strictEqual(getRes.method, 'GET');
    assert.strictEqual(getRes.url, '/api/menu?active=true');
    assert.strictEqual(
      recordedCalls[0].headers['Content-Type'],
      undefined,
      'GET without body must NOT include Content-Type header'
    );
    assert.strictEqual(
      recordedCalls[0].headers['content-type'],
      undefined,
      'GET without body must NOT include lowercase content-type header'
    );

    const postRes = await apiClient.post<{ success: boolean; method: string }>('/orders', { tableId: 'T1' });
    assert.strictEqual(postRes.method, 'POST');
    assert.strictEqual(recordedCalls[1].headers['Content-Type'], 'application/json');
    assert.strictEqual(recordedCalls[1].body, JSON.stringify({ tableId: 'T1' }));

    const putRes = await apiClient.put<{ success: boolean; method: string }>('/menu/1', { name: 'Latte' });
    assert.strictEqual(putRes.method, 'PUT');
    assert.strictEqual(recordedCalls[2].body, JSON.stringify({ name: 'Latte' }));

    const patchRes = await apiClient.patch<{ success: boolean; method: string }>('/orders/1', { status: 'paid' });
    assert.strictEqual(patchRes.method, 'PATCH');
    assert.strictEqual(recordedCalls[3].body, JSON.stringify({ status: 'paid' }));

    const delRes = await apiClient.delete<{ success: boolean; method: string }>('/menu/1');
    assert.strictEqual(delRes.method, 'DELETE');
    console.log('✓ Test 1 passed: GET, POST, PUT, PATCH, DELETE and JSON responses work.');

    // -------------------------------------------------------------------------
    // 2. Bearer Token Attachment, No Token, and skipAuth
    // -------------------------------------------------------------------------
    console.log('2. Testing Bearer Token Attachment, No Token, and skipAuth ...');
    // 2A. Without token
    clearToken();
    recordedCalls.length = 0;
    await apiClient.get('/tables');
    assert.strictEqual(
      recordedCalls[0].headers['Authorization'],
      undefined,
      'Must not attach Authorization header when no token exists'
    );

    // 2B. With token stored
    setToken(SAMPLE_TOKEN);
    recordedCalls.length = 0;
    await apiClient.get('/tables');
    assert.strictEqual(
      recordedCalls[0].headers['Authorization'],
      `Bearer ${SAMPLE_TOKEN}`,
      'Must automatically attach Bearer JWT token'
    );

    // 2C. With skipAuth: true even when token is stored
    recordedCalls.length = 0;
    await apiClient.post('/public/ping', { ok: true }, { skipAuth: true });
    assert.strictEqual(
      recordedCalls[0].headers['Authorization'],
      undefined,
      'skipAuth: true must omit Authorization header even when token exists'
    );
    clearToken();
    console.log('✓ Test 2 passed: Bearer token attachment, absent token, and skipAuth verified.');

    // -------------------------------------------------------------------------
    // 3. Empty Responses & HTTP 204 No Content
    // -------------------------------------------------------------------------
    console.log('3. Testing Empty Body and 204 No Content Responses ...');
    globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.includes('/empty')) {
        return createTextResponse(200, '   ', 'application/json');
      }
      return createTextResponse(204, '', '');
    };

    const emptyRes = await apiClient.get('/empty');
    assert.strictEqual(emptyRes, undefined, 'Empty 200 response must resolve to undefined safely');

    const noContentRes = await apiClient.delete('/items/123');
    assert.strictEqual(noContentRes, undefined, '204 No Content must resolve to undefined safely');
    console.log('✓ Test 3 passed: Empty response and 204 No Content handled safely.');

    // -------------------------------------------------------------------------
    // 4. Non-JSON Error Responses & Unexpected Non-JSON 200 Response
    // -------------------------------------------------------------------------
    console.log('4. Testing Non-JSON Error Responses & Unexpected 200 Body ...');
    globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.includes('/bad-gateway')) {
        return createTextResponse(502, '<html><body>502 Bad Gateway</body></html>', 'text/html');
      }
      return createTextResponse(200, 'NOT_VALID_JSON{{{', 'application/json');
    };

    let caughtHtmlErr: unknown;
    try {
      await apiClient.get('/bad-gateway');
    } catch (err) {
      caughtHtmlErr = err;
    }
    assert.ok(isApiError(caughtHtmlErr), '502 HTML error must throw ApiError');
    assert.strictEqual(caughtHtmlErr.status, 502);
    assert.strictEqual(caughtHtmlErr.category, 'SERVER');
    assert.ok(!caughtHtmlErr.message.includes('<html>'), 'Must not expose raw HTML to UI');

    let caughtUnexpectedJsonErr: unknown;
    try {
      await apiClient.get('/corrupt-ok');
    } catch (err) {
      caughtUnexpectedJsonErr = err;
    }
    assert.ok(isApiError(caughtUnexpectedJsonErr), 'Malformed 200 JSON must throw ApiError');
    assert.strictEqual(caughtUnexpectedJsonErr.category, 'UNEXPECTED_RESPONSE');
    assert.strictEqual(caughtUnexpectedJsonErr.code, 'INVALID_RESPONSE');
    console.log('✓ Test 4 passed: Non-JSON error and unexpected response bodies handled safely.');

    // -------------------------------------------------------------------------
    // 5. API Error Classification & Sensitive Field Sanitization
    // -------------------------------------------------------------------------
    console.log('5. Testing API Error Classification & Sanitization ...');
    globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.includes('/validation')) {
        return createTextResponse(
          400,
          JSON.stringify({
            success: false,
            error: 'Validation error: invalid email',
            code: 'ZOD_VALIDATION',
            details: {
              field: 'email',
              stack: 'SECRET_STACK_TRACE',
              passwordHash: '$2a$10$secret',
            },
          })
        );
      }
      if (url.includes('/forbidden')) {
        return createTextResponse(403, JSON.stringify({ success: false, error: 'Access denied' }));
      }
      if (url.includes('/missing')) {
        return createTextResponse(404, JSON.stringify({ success: false, error: 'Order not found' }));
      }
      return createTextResponse(500, JSON.stringify({ success: false, error: 'Internal failure' }));
    };

    try {
      await apiClient.post('/validation', {});
      assert.fail('Expected validation ApiError');
    } catch (err) {
      assert.ok(isApiError(err));
      assert.strictEqual(err.status, 400);
      assert.strictEqual(err.category, 'VALIDATION');
      assert.strictEqual(err.code, 'ZOD_VALIDATION');
      const details = err.details as Record<string, unknown>;
      assert.strictEqual(details.field, 'email');
      assert.strictEqual(details.stack, undefined, 'Sensitive stack trace must be stripped');
      assert.strictEqual(details.passwordHash, undefined, 'Sensitive passwordHash must be stripped');
    }

    try {
      await apiClient.get('/forbidden');
      assert.fail('Expected 403 ApiError');
    } catch (err) {
      assert.ok(isApiError(err));
      assert.strictEqual(err.status, 403);
      assert.strictEqual(err.category, 'FORBIDDEN');
    }

    try {
      await apiClient.get('/missing');
      assert.fail('Expected 404 ApiError');
    } catch (err) {
      assert.ok(isApiError(err));
      assert.strictEqual(err.status, 404);
      assert.strictEqual(err.category, 'NOT_FOUND');
    }
    console.log('✓ Test 5 passed: Error classification and detail sanitization verified.');

    // -------------------------------------------------------------------------
    // 6. Network Error, Timeout Handling, and External AbortController
    // -------------------------------------------------------------------------
    console.log('6. Testing Network Failure, Timeout, and AbortController ...');
    globalThis.fetch = async () => {
      throw new TypeError('Failed to fetch');
    };

    try {
      await apiClient.get('/offline');
      assert.fail('Expected network ApiError');
    } catch (err) {
      assert.ok(isApiError(err));
      assert.strictEqual(err.isNetworkError, true);
      assert.strictEqual(err.category, 'NETWORK');
      assert.strictEqual(err.status, 0);
    }

    // Timeout test using AbortController
    globalThis.fetch = (_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const abortErr = new Error('The operation was aborted');
          abortErr.name = 'AbortError';
          reject(abortErr);
        });
      });
    };

    try {
      await apiClient.get('/slow', { timeoutMs: 25 });
      assert.fail('Expected timeout ApiError');
    } catch (err) {
      assert.ok(isApiError(err));
      assert.strictEqual(err.isTimeout, true);
      assert.strictEqual(err.category, 'TIMEOUT');
      assert.strictEqual(err.code, 'TIMEOUT');
      assert.strictEqual(err.status, 0);
    }

    // External AbortController cancellation
    const externalController = new AbortController();
    setTimeout(() => externalController.abort(), 15);
    try {
      await apiClient.get('/cancelled', { signal: externalController.signal, timeoutMs: 5000 });
      assert.fail('Expected aborted ApiError');
    } catch (err) {
      assert.ok(isApiError(err));
      assert.strictEqual(err.isAborted, true);
      assert.strictEqual(err.isTimeout, false);
      assert.strictEqual(err.category, 'ABORTED');
    }
    console.log('✓ Test 6 passed: Network error, timeout, and AbortController cancellation verified.');

    // -------------------------------------------------------------------------
    // 7. Authentication Regression Checks (401, Login, Logout Deduplication, /me)
    // -------------------------------------------------------------------------
    console.log('7. Testing Auth Regression (Login 401, Auth 401, Logout Deduplication, /me) ...');
    // 7A. Login 401 must NOT trigger logout or clear an existing token
    setToken(SAMPLE_TOKEN);
    const authEndpointHits: string[] = [];
    globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      authEndpointHits.push(url);
      if (url.includes('/api/auth/login')) {
        return createTextResponse(401, JSON.stringify({ success: false, error: 'Invalid email or password.' }));
      }
      return createTextResponse(404, '{}');
    };

    const failedLogin = await apiLogin({ email: 'bad@test.com', password: 'wrong' });
    assert.strictEqual(failedLogin.success, false);
    assert.strictEqual(failedLogin.error, 'Invalid email or password.');
    assert.deepStrictEqual(authEndpointHits, ['/api/auth/login'], 'Login 401 must NOT trigger logout loop');
    assert.strictEqual(getToken(), SAMPLE_TOKEN, 'skipAuth on login must not purge existing token on 401');

    // 7B. Authenticated API 401 clears invalid session token without firing logout
    authEndpointHits.length = 0;
    globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
      authEndpointHits.push(String(input));
      return createTextResponse(401, JSON.stringify({ success: false, error: 'Token expired' }));
    };

    try {
      await apiClient.get('/protected-resource');
      assert.fail('Expected 401 ApiError');
    } catch (err) {
      assert.ok(isApiError(err));
      assert.strictEqual(err.isUnauthorized, true);
      assert.strictEqual(err.status, 401);
    }
    assert.strictEqual(getToken(), null, 'Authenticated 401 must purge invalid token');
    assert.deepStrictEqual(
      authEndpointHits,
      ['/api/protected-resource'],
      'Authenticated 401 must not trigger duplicate logout request'
    );

    // 7C. Concurrent apiLogout() deduplicates into single POST /api/auth/logout
    setToken(SAMPLE_TOKEN);
    let logoutCallCount = 0;
    globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.includes('/api/auth/logout')) {
        logoutCallCount++;
        await new Promise((r) => setTimeout(r, 15));
        return createTextResponse(200, JSON.stringify({ success: true, message: 'Logged out' }));
      }
      return createTextResponse(404, '{}');
    };

    await Promise.all([apiLogout(), apiLogout()]);
    assert.strictEqual(logoutCallCount, 1, 'Concurrent apiLogout calls must execute only 1 POST /api/auth/logout');
    assert.strictEqual(getToken(), null, 'Token must be cleared after logout');

    // 7D. GET /api/auth/me restores user session with cache: 'no-store' and no Content-Type header
    setToken(SAMPLE_TOKEN);
    let meRequestCache: RequestCache | undefined;
    let meContentType: string | undefined;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      const headers = (init?.headers || {}) as Record<string, string>;
      meRequestCache = init?.cache;
      meContentType = headers['Content-Type'] ?? headers['content-type'];
      if (url === '/api/auth/me' && headers['Authorization'] === `Bearer ${SAMPLE_TOKEN}`) {
        return createTextResponse(
          200,
          JSON.stringify({
            success: true,
            data: {
              user: {
                id: 'u1',
                restaurantId: 'r1',
                name: 'Autumn Admin',
                email: 'admin@autumn.test',
                phone: null,
                avatarUrl: null,
                role: { id: 'role-1', name: 'ADMIN', displayName: 'Administrator' },
                restaurant: { id: 'r1', name: 'Autumn', slug: 'autumn' },
                permissions: ['dashboard.view'],
              },
            },
          })
        );
      }
      return createTextResponse(401, JSON.stringify({ success: false, error: 'Unauthorized' }));
    };

    const meRes = await apiGetMe();
    assert.strictEqual(meRes.success, true);
    assert.strictEqual(meRes.data?.user.email, 'admin@autumn.test');
    assert.strictEqual(meRequestCache, 'no-store', 'GET /api/auth/me must request cache: no-store');
    assert.strictEqual(meContentType, undefined, 'GET /api/auth/me without body must not attach Content-Type');
    clearToken();
    console.log('✓ Test 7 passed: Auth integration regression checks passed.');

    console.log('\n====================================================================');
    console.log('✔ ALL STEP 2F API CLIENT TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================================\n');
  } finally {
    globalThis.fetch = originalFetch;
    clearToken();
  }
}

runApiClientTests().catch((err) => {
  console.error('\n❌ API CLIENT TEST SUITE FAILED:', err);
  process.exit(1);
});
