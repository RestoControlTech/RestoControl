/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore, mapBackendUserToFrontend } from './auth.store';
import { User } from '../types';
import {
  getToken,
  setToken,
  clearToken,
  getAuthHeaders,
  apiLogin,
  apiGetMe,
  apiLogout,
  TOKEN_STORAGE_KEY,
  BackendSafeUser,
} from '../services/authApi';
import { hasPermission } from './permissions';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

// Helper mock response builder
function createMockResponse(status: number, body: any, ok: boolean = status >= 200 && status < 300): Response {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: new Headers({ 'content-type': 'application/json' }),
  } as unknown as Response;
}

const SAMPLE_BACKEND_USER: BackendSafeUser = {
  id: 'usr-admin-01',
  restaurantId: 'rest-uuid-alpha',
  name: 'Pan Bunheng',
  email: 'panbunhen58@gmail.com',
  phone: '+85512345678',
  avatarUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790939496/logo.jpg',
  role: {
    id: 'role-admin-id',
    name: 'ADMIN',
    displayName: 'Administrator',
  },
  restaurant: {
    id: 'rest-uuid-alpha',
    name: 'Alpha Bistro',
    slug: 'alpha-bistro',
  },
  permissions: [
    'pos.use',
    'pos.order',
    'orders.view',
    'tables.view',
    'menu.view',
    'sales.view',
    'settings.view',
    'BILLING_SETTLE',
    'BILLING_WRITE_OFF',
  ],
};

const SAMPLE_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3ItYWRtaW4tMDEiLCJpYXQiOjE3MDk0NzIwMDB9.mockSignature';

async function runAuthIntegrationTestSuite() {
  console.log('====================================================================');
  console.log('STEP 2E: FRONTEND AUTHENTICATION INTEGRATION TEST SUITE');
  console.log('====================================================================\n');

  const originalFetch = globalThis.fetch;

  try {
    // -------------------------------------------------------------------------
    // SCENARIO 4: Token storage (getToken, setToken, clearToken)
    // -------------------------------------------------------------------------
    console.log('1. Testing Token Storage & Retrieval (Scenario 4) ...');
    clearToken();
    assert.strictEqual(getToken(), null, 'Token must initially be null');

    setToken(SAMPLE_JWT_TOKEN);
    assert.strictEqual(getToken(), SAMPLE_JWT_TOKEN, 'setToken must persist and getToken return the active token');

    clearToken();
    assert.strictEqual(getToken(), null, 'clearToken must purge the token');
    console.log('✓ Scenario 4 passed: Token storage, retrieval, and purge verified.');

    // -------------------------------------------------------------------------
    // SCENARIO 5: Authorization header construction (getAuthHeaders)
    // -------------------------------------------------------------------------
    console.log('2. Testing Authorization Header Construction (Scenario 5) ...');
    clearToken();
    const unauthHeaders = getAuthHeaders() as Record<string, string>;
    assert.strictEqual(unauthHeaders['Content-Type'], 'application/json');
    assert.strictEqual(unauthHeaders['Authorization'], undefined, 'No Authorization header when unauthenticated');

    setToken(SAMPLE_JWT_TOKEN);
    const authHeaders = getAuthHeaders() as Record<string, string>;
    assert.strictEqual(authHeaders['Content-Type'], 'application/json');
    assert.strictEqual(authHeaders['Authorization'], `Bearer ${SAMPLE_JWT_TOKEN}`, 'Bearer token must be attached');
    clearToken();
    console.log('✓ Scenario 5 passed: Authorization headers correctly attach Bearer token when present.');

    // -------------------------------------------------------------------------
    // SCENARIO 1: Successful login
    // -------------------------------------------------------------------------
    console.log('3. Testing Successful Login Flow (Scenario 1) ...');
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      if (url.includes('/api/auth/login')) {
        const body = JSON.parse(init?.body as string);
        if (body.email === 'panbunhen58@gmail.com' && body.password === 'Heng1111') {
          return createMockResponse(200, {
            success: true,
            data: {
              token: SAMPLE_JWT_TOKEN,
              user: SAMPLE_BACKEND_USER,
            },
          });
        }
      }
      return createMockResponse(401, { success: false, error: 'Invalid email or password.' });
    };

    useAuthStore.setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
    clearToken();

    const loginRes = await useAuthStore.getState().login('panbunhen58@gmail.com', 'Heng1111');
    assert.strictEqual(loginRes.success, true, 'Valid login must return success: true');

    const authState = useAuthStore.getState();
    assert.strictEqual(authState.isAuthenticated, true, 'Store isAuthenticated must be true');
    assert.strictEqual(authState.token, SAMPLE_JWT_TOKEN, 'Store token must match returned JWT');
    assert.strictEqual(getToken(), SAMPLE_JWT_TOKEN, 'Client token storage must match returned JWT');
    assert.strictEqual(authState.isLoading, false, 'isLoading must be false after login');
    assert.ok(authState.user, 'User object must be populated');
    assert.strictEqual(authState.user?.email, 'panbunhen58@gmail.com');
    assert.strictEqual(authState.user?.role, 'admin');
    assert.strictEqual(authState.user?.restaurantId, 'rest-uuid-alpha');
    assert.strictEqual(authState.user?.restaurant?.name, 'Alpha Bistro');
    assert.ok(authState.user?.permissions?.includes('BILLING_SETTLE'));
    console.log('✓ Scenario 1 passed: Successful login updates store, sets token, and maps user data.');

    // -------------------------------------------------------------------------
    // SCENARIO 2: Incorrect credentials handling
    // -------------------------------------------------------------------------
    console.log('4. Testing Incorrect Credentials Handling (Scenario 2) ...');
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
    clearToken();

    const badLoginRes = await useAuthStore.getState().login('panbunhen58@gmail.com', 'wrongpassword');
    assert.strictEqual(badLoginRes.success, false, 'Bad credentials must return success: false');
    assert.strictEqual(badLoginRes.error, 'Invalid email or password.', 'Error message should be generic');
    assert.strictEqual(useAuthStore.getState().isAuthenticated, false, 'Store must remain unauthenticated');
    assert.strictEqual(useAuthStore.getState().user, null, 'User must remain null');
    assert.strictEqual(getToken(), null, 'No token stored on bad login');
    assert.strictEqual(useAuthStore.getState().isLoading, false, 'isLoading must reset to false');
    console.log('✓ Scenario 2 passed: Incorrect credentials rejected with generic error and clean state.');

    // -------------------------------------------------------------------------
    // SCENARIO 3: Network failure handling (simulated fetch reject)
    // -------------------------------------------------------------------------
    console.log('5. Testing Network Failure Handling (Scenario 3) ...');
    globalThis.fetch = async () => {
      throw new Error('Failed to fetch: Connection refused');
    };

    const networkFailRes = await useAuthStore.getState().login('panbunhen58@gmail.com', 'Heng1111');
    assert.strictEqual(networkFailRes.success, false, 'Network failure must return success: false');
    assert.ok(
      networkFailRes.error?.includes('Cannot connect to authentication service'),
      'Must notify user of connection failure'
    );
    assert.strictEqual(useAuthStore.getState().isAuthenticated, false);
    assert.strictEqual(useAuthStore.getState().user, null);
    assert.strictEqual(useAuthStore.getState().isLoading, false);
    console.log('✓ Scenario 3 passed: Network failure cleanly caught, error reported, state unauthenticated.');

    // -------------------------------------------------------------------------
    // SCENARIO 6: Current-user loading (initializeAuth() with valid token & deduplication)
    // -------------------------------------------------------------------------
    console.log('6. Testing Current-User Loading via GET /api/auth/me & Deduplication (Scenario 6) ...');
    setToken(SAMPLE_JWT_TOKEN);
    useAuthStore.setState({ user: null, token: SAMPLE_JWT_TOKEN, isAuthenticated: false, isLoading: true });

    let apiGetMeCallCount = 0;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      const authHeader = (init?.headers as Record<string, string>)?.[ 'Authorization' ];
      if (url.includes('/api/auth/me')) {
        apiGetMeCallCount++;
        // Small delay to simulate in-flight network operation
        await new Promise((r) => setTimeout(r, 10));
        if (authHeader === `Bearer ${SAMPLE_JWT_TOKEN}`) {
          return createMockResponse(200, {
            success: true,
            data: {
              user: {
                ...SAMPLE_BACKEND_USER,
                name: 'Pan Bunheng (Refreshed)',
              },
            },
          });
        }
      }
      return createMockResponse(401, { success: false, error: 'Unauthorized' });
    };

    // Trigger concurrent initializeAuth calls (simulating React StrictMode double mount)
    await Promise.all([
      useAuthStore.getState().initializeAuth(),
      useAuthStore.getState().initializeAuth(),
    ]);

    assert.strictEqual(apiGetMeCallCount, 1, 'Concurrent initializeAuth calls must share single in-flight operation (deduplication)');
    assert.strictEqual(useAuthStore.getState().isAuthenticated, true, 'User authenticated after initializeAuth');
    assert.strictEqual(useAuthStore.getState().user?.name, 'Pan Bunheng (Refreshed)');
    assert.strictEqual(useAuthStore.getState().user?.authSource, 'database', 'Restored user must retain authSource: database');
    assert.strictEqual(useAuthStore.getState().isLoading, false, 'isLoading false after verification');
    console.log('✓ Scenario 6 passed: initializeAuth restores user profile, live permissions, and deduplicates concurrent calls.');

    // -------------------------------------------------------------------------
    // SCENARIO 7: Session restoration after page reload
    // -------------------------------------------------------------------------
    console.log('7. Testing Session Restoration after Simulated Page Reload (Scenario 7) ...');
    // Simulate stored token in localStorage
    setToken(SAMPLE_JWT_TOKEN);
    // Fresh store instance simulation
    useAuthStore.setState({
      user: null,
      token: getToken(),
      isAuthenticated: false,
      isLoading: Boolean(getToken()),
    });
    assert.strictEqual(useAuthStore.getState().isLoading, true, 'Starts in loading state when token exists');

    await useAuthStore.getState().initializeAuth();
    assert.strictEqual(useAuthStore.getState().isAuthenticated, true, 'Session restored successfully');
    assert.strictEqual(useAuthStore.getState().isLoading, false, 'Loading concluded');
    console.log('✓ Scenario 7 passed: Stored token restores session on app reload without password entry.');

    // -------------------------------------------------------------------------
    // SCENARIO 8: Expired/invalid token handling (401 response triggers token purge)
    // -------------------------------------------------------------------------
    console.log('8. Testing Expired/Invalid Token Handling (Scenario 8) ...');
    setToken('expired-or-tampered-token');
    useAuthStore.setState({ user: null, token: 'expired-or-tampered-token', isAuthenticated: true, isLoading: true });

    globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.includes('/api/auth/me')) {
        return createMockResponse(401, { success: false, error: 'Session is invalid or has expired.' });
      }
      return createMockResponse(404, {});
    };

    await useAuthStore.getState().initializeAuth();
    assert.strictEqual(getToken(), null, 'Expired token must be purged from storage');
    assert.strictEqual(useAuthStore.getState().token, null, 'Store token must be cleared');
    assert.strictEqual(useAuthStore.getState().isAuthenticated, false, 'User marked unauthenticated');
    assert.strictEqual(useAuthStore.getState().user, null, 'User state cleared');
    assert.strictEqual(useAuthStore.getState().isLoading, false, 'isLoading reset to false');
    console.log('✓ Scenario 8 passed: 401 response purges token from storage and clears store.');

    // -------------------------------------------------------------------------
    // SCENARIO 9: Logout (logout() clears token and user state)
    // -------------------------------------------------------------------------
    console.log('9. Testing Logout Flow (Scenario 9) ...');
    setToken(SAMPLE_JWT_TOKEN);
    useAuthStore.setState({
      user: mapBackendUserToFrontend(SAMPLE_BACKEND_USER),
      token: SAMPLE_JWT_TOKEN,
      isAuthenticated: true,
      isLoading: false,
    });

    let logoutEndpointCalled = false;
    globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.includes('/api/auth/logout')) {
        logoutEndpointCalled = true;
        return createMockResponse(200, { success: true, message: 'Logged out successfully.' });
      }
      return createMockResponse(404, {});
    };

    await useAuthStore.getState().logout();
    assert.strictEqual(logoutEndpointCalled, true, 'POST /api/auth/logout was called');
    assert.strictEqual(getToken(), null, 'Token cleared from storage');
    assert.strictEqual(useAuthStore.getState().token, null, 'Store token reset to null');
    assert.strictEqual(useAuthStore.getState().user, null, 'Store user reset to null');
    assert.strictEqual(useAuthStore.getState().isAuthenticated, false, 'Store isAuthenticated is false');
    assert.strictEqual(useAuthStore.getState().isLoading, false, 'isLoading is false');
    console.log('✓ Scenario 9 passed: Logout notifies server, clears storage and client state.');

    // -------------------------------------------------------------------------
    // SCENARIO 10: Permission loading & evaluation (backend exclusive vs. legacy role fallback)
    // -------------------------------------------------------------------------
    console.log('10. Testing Permission Loading & Strict Database Authorization (Scenario 10) ...');
    const dbStaffUser = mapBackendUserToFrontend({
      ...SAMPLE_BACKEND_USER,
      role: { id: 'r2', name: 'STAFF', displayName: 'Staff' },
      permissions: ['settings.view', 'CUSTOM_OVERRIDE'],
    });

    // 1. Directly granted backend permission
    assert.strictEqual(
      hasPermission(dbStaffUser, 'settings.view' as any),
      true,
      'Backend user with explicit database permission has access'
    );

    // 2. Ungranted permission: Backend user MUST NOT fall back to staff role permissions
    assert.strictEqual(
      hasPermission(dbStaffUser, 'orders.create'),
      false,
      'Backend user lacking orders.create is strictly DENIED (no role fallback bypass)'
    );

    // 3. Non-granted permission
    assert.strictEqual(
      hasPermission(dbStaffUser, 'sales.view'),
      false,
      'Backend user without sales.view is denied'
    );

    // 4. Backend admin with permissions: [] receives NO permissions
    const dbAdminEmpty = mapBackendUserToFrontend({
      ...SAMPLE_BACKEND_USER,
      permissions: [],
    });
    assert.strictEqual(
      hasPermission(dbAdminEmpty, 'sales.view'),
      false,
      'Backend admin with empty permissions receives NO permissions'
    );

    // 5. Legacy staff user retains role permissions
    const legacyStaffUser: User = {
      id: 'legacy-staff-1',
      name: 'Legacy Staff',
      email: 'staff@test.com',
      role: 'staff',
      authSource: 'legacy_mock',
    };
    assert.strictEqual(
      hasPermission(legacyStaffUser, 'orders.create'),
      true,
      'Legacy staff user retains role-based permission fallback'
    );
    console.log('✓ Scenario 10 passed: Backend users strictly enforce database permissions; legacy users retain role fallback.');

    // -------------------------------------------------------------------------
    // SCENARIO 11: Protected route behavior
    // -------------------------------------------------------------------------
    console.log('11. Testing Protected Route Guard Behavior (Scenario 11) ...');
    // 11A. Unauthenticated user is redirected to /login
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
    const unauthHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/pos'] },
        React.createElement(
          Routes,
          null,
          React.createElement(
            Route,
            { element: React.createElement(ProtectedRoute, null) },
            React.createElement(Route, { path: '/pos', element: React.createElement('div', null, 'POS Page') })
          )
        )
      )
    );
    assert.strictEqual(unauthHtml, '', 'Unauthenticated access triggers Navigate redirect (empty SSR payload)');
    assert.ok(!unauthHtml.includes('POS Page'), 'Protected POS Page must not be rendered');

    // 11B. Authenticated user with permission renders content
    const adminUser = mapBackendUserToFrontend(SAMPLE_BACKEND_USER);
    useAuthStore.setState({
      user: adminUser,
      token: SAMPLE_JWT_TOKEN,
      isAuthenticated: true,
      isLoading: false,
    });
    const authHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/pos'] },
        React.createElement(
          Routes,
          null,
          React.createElement(
            Route,
            { element: React.createElement(ProtectedRoute, { permission: 'pos.use' }) },
            React.createElement(Route, { path: '/pos', element: React.createElement('div', null, 'POS Active Screen') })
          )
        )
      )
    );
    assert.ok(authHtml.includes('POS Active Screen'), 'Authorized user sees protected content');

    // 11C. Authenticated user lacking permission is denied (AccessDenied)
    const staffUserNoSales = mapBackendUserToFrontend({
      ...SAMPLE_BACKEND_USER,
      role: { id: 'r2', name: 'STAFF', displayName: 'Staff' },
      permissions: ['pos.use'],
    });
    useAuthStore.setState({
      user: staffUserNoSales,
      token: SAMPLE_JWT_TOKEN,
      isAuthenticated: true,
      isLoading: false,
    });
    const deniedHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/sales'] },
        React.createElement(
          Routes,
          null,
          React.createElement(
            Route,
            { element: React.createElement(ProtectedRoute, { permission: 'sales.view' }) },
            React.createElement(Route, { path: '/sales', element: React.createElement('div', null, 'Sales Analytics') })
          )
        )
      )
    );
    assert.ok(!deniedHtml.includes('Sales Analytics'), 'Unauthorized content must not be rendered');
    assert.ok(deniedHtml.includes('Access Denied') || deniedHtml.includes('permissions'), 'AccessDenied component rendered');
    console.log('✓ Scenario 11 passed: ProtectedRoute enforces authentication & granular permission guards.');

    // -------------------------------------------------------------------------
    // SCENARIO 12: No premature redirect during initialization (isLoading: true holds route)
    // -------------------------------------------------------------------------
    console.log('12. Testing No Premature Redirect During Session Initialization (Scenario 12) ...');
    // Store is loading (verifying JWT with backend)
    useAuthStore.setState({
      user: null,
      token: SAMPLE_JWT_TOKEN,
      isAuthenticated: false,
      isLoading: true,
    });

    const loadingHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/pos'] },
        React.createElement(
          Routes,
          null,
          React.createElement(
            Route,
            { element: React.createElement(ProtectedRoute, null) },
            React.createElement(Route, { path: '/pos', element: React.createElement('div', null, 'POS Page') })
          ),
          React.createElement(Route, { path: '/login', element: React.createElement('div', null, 'Login Page') })
        )
      )
    );

    // CRITICAL: Must show loading screen, MUST NOT redirect to /login
    assert.ok(loadingHtml.includes('Verifying session...'), 'Loading fallback screen rendered');
    assert.ok(!loadingHtml.includes('Login Page'), 'Must NOT prematurely redirect to Login Page');
    assert.ok(!loadingHtml.includes('POS Page'), 'Must not render unverified content');
    console.log('✓ Scenario 12 passed: isLoading=true holds the route and displays loading fallback without premature redirect.');

    console.log('\n====================================================================');
    console.log('✔ ALL 12 FRONTEND AUTHENTICATION INTEGRATION SCENARIOS PASSED!');
    console.log('====================================================================\n');
  } finally {
    globalThis.fetch = originalFetch;
    clearToken();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
  }
}

runAuthIntegrationTestSuite().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
