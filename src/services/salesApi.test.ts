/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {
  fetchSalesList,
  fetchSaleById,
  mapBackendSaleToTransaction,
  BackendSaleListItemDto,
  BackendSaleDetailDto,
} from './salesApi';
import { isApiError } from './api/errors';
import { setToken, clearToken, getToken } from './authApi';

function createJsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

const SAMPLE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.salesTest.sig';

const SAMPLE_SALE_LIST_ITEM: BackendSaleListItemDto = {
  id: '11111111-1111-4111-8111-111111111111',
  transactionNumber: 'TX-2026-001',
  orderNumber: 'ORD-1001',
  createdAt: '2026-11-25T10:00:00.000Z',
  completedAt: '2026-11-25T10:05:00.000Z',
  tableName: 'Table 05',
  orderType: 'DINE_IN',
  customer: {
    id: 'cust-1',
    name: 'Sokha Chan',
    phone: '+85512000111',
  },
  cashier: {
    id: 'usr-1',
    name: 'Pan Bunheng',
  },
  currency: 'USD',
  subtotal: '20.00',
  taxAmount: '2.00',
  serviceChargeAmount: '1.00',
  discountAmount: '0.00',
  grossAmount: '23.00',
  amountPaid: '23.00',
  paymentStatus: 'PAID',
  status: 'COMPLETED',
  paymentMethod: 'CASH',
  paymentSummary: 'Cash ($23.00)',
  itemSummary: '2x Lok Lak Beef, 1x Iced Latte',
  payments: [
    {
      id: 'pay-1',
      method: 'CASH',
      status: 'SUCCESS',
      currency: 'USD',
      amount: '23.00',
      cashReceived: '25.00',
      changeGiven: '2.00',
      paidAt: '2026-11-25T10:05:00.000Z',
    },
  ],
};

const SAMPLE_SALE_MINIMAL: BackendSaleListItemDto = {
  id: '22222222-2222-4222-8222-222222222222',
  transactionNumber: 'TX-2026-002',
  orderNumber: null,
  createdAt: '2026-11-25T11:00:00.000Z',
  completedAt: null,
  tableName: null,
  orderType: 'TAKEAWAY',
  customer: null,
  cashier: null,
  currency: 'USD',
  subtotal: '8.50',
  taxAmount: '0.00',
  serviceChargeAmount: '0.00',
  discountAmount: '0.00',
  grossAmount: '8.50',
  amountPaid: '8.50',
  paymentStatus: 'PAID',
  status: 'ACTIVE',
  paymentMethod: 'KHQR',
  paymentSummary: 'KHQR ($8.50)',
  itemSummary: null,
  payments: [],
};

const SAMPLE_SALE_DETAIL: BackendSaleDetailDto = {
  ...SAMPLE_SALE_LIST_ITEM,
  notes: 'VIP guest table',
  discountType: null,
  discountRate: null,
  discountReason: null,
  order: {
    id: 'ord-1',
    orderNumber: 'ORD-1001',
    source: 'POS',
    orderType: 'DINE_IN',
  },
  items: [
    {
      id: 'item-1',
      productId: 'prod-1',
      productName: 'Lok Lak Beef',
      quantity: 2,
      unitPrice: '8.00',
      lineTotal: '16.00',
      instructions: 'Medium rare',
    },
    {
      id: 'item-2',
      productId: 'prod-2',
      productName: 'Iced Latte',
      quantity: 1,
      unitPrice: '4.00',
      lineTotal: '4.00',
      instructions: null,
    },
  ],
};

async function runSalesApiTests() {
  console.log('====================================================================');
  console.log('STEP 2H-B: FRONTEND SALES API SERVICE TEST SUITE');
  console.log('====================================================================\n');

  const originalFetch = globalThis.fetch;

  try {
    // -----------------------------------------------------------------------
    // 1. Successful sales list request + DTO mapping (full & minimal optional)
    // -----------------------------------------------------------------------
    console.log('1. Testing fetchSalesList() & DTO mapping ...');
    setToken(SAMPLE_TOKEN);
    const recordedRequests: Array<{ url: string; headers: Record<string, string> }> = [];

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      recordedRequests.push({
        url: String(input),
        headers: (init?.headers || {}) as Record<string, string>,
      });
      return createJsonResponse(200, {
        success: true,
        data: {
          sales: [SAMPLE_SALE_LIST_ITEM, SAMPLE_SALE_MINIMAL],
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      });
    };

    const listResult = await fetchSalesList();
    assert.strictEqual(recordedRequests[0].url, '/api/sales');
    assert.strictEqual(recordedRequests[0].headers['Authorization'], `Bearer ${SAMPLE_TOKEN}`);
    assert.strictEqual(listResult.sales.length, 2);
    assert.strictEqual(listResult.rawSales.length, 2);

    const tx1 = listResult.sales[0];
    assert.strictEqual(tx1.id, SAMPLE_SALE_LIST_ITEM.id);
    assert.strictEqual(tx1.orderNumber, 'ORD-1001');
    assert.strictEqual(tx1.dateTime, '2026-11-25T10:05:00.000Z');
    assert.strictEqual(tx1.table, 'Table 05');
    assert.strictEqual(tx1.type, 'Dine-in');
    assert.strictEqual(tx1.amount, 23);
    assert.strictEqual(tx1.subtotal, 20);
    assert.strictEqual(tx1.tax, 2);
    assert.strictEqual(tx1.amountPaid, 23);
    assert.strictEqual(tx1.cashReceived, 25);
    assert.strictEqual(tx1.change, 2);
    assert.strictEqual(tx1.status, 'Completed');
    assert.strictEqual(tx1.paymentStatus, 'Paid');
    assert.strictEqual(tx1.paymentMethod, 'Cash');
    assert.strictEqual(tx1.customerName, 'Sokha Chan');

    const tx2 = listResult.sales[1];
    assert.strictEqual(tx2.orderNumber, 'TX-2026-002');
    assert.strictEqual(tx2.dateTime, '2026-11-25T11:00:00.000Z');
    assert.strictEqual(tx2.table, 'Takeaway');
    assert.strictEqual(tx2.type, 'Takeaway');
    assert.strictEqual(tx2.paymentMethod, 'QR Code');
    assert.strictEqual(tx2.customerName, undefined);
    assert.strictEqual(tx2.cashReceived, undefined);
    assert.strictEqual(tx2.change, undefined);
    console.log('✓ Test 1 passed: fetchSalesList() and DTO mapping verified.');

    // -----------------------------------------------------------------------
    // 2. Query parameter serialization & 3. Pagination metadata preservation
    // -----------------------------------------------------------------------
    console.log('2 & 3. Testing query parameter serialization & pagination ...');
    recordedRequests.length = 0;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      recordedRequests.push({
        url: String(input),
        headers: (init?.headers || {}) as Record<string, string>,
      });
      return createJsonResponse(200, {
        success: true,
        data: {
          sales: [SAMPLE_SALE_LIST_ITEM],
          pagination: {
            page: 2,
            limit: 10,
            total: 15,
            totalPages: 2,
            hasNextPage: false,
            hasPreviousPage: true,
          },
        },
      });
    };

    const pagedResult = await fetchSalesList({
      search: '  Sokha  ',
      paymentMethod: 'KHQR',
      status: 'COMPLETED',
      startDate: '2026-11-01',
      endDate: '2026-11-25',
      page: 2,
      limit: 10,
    });

    assert.strictEqual(
      recordedRequests[0].url,
      '/api/sales?search=Sokha&paymentMethod=KHQR&status=COMPLETED&startDate=2026-11-01&endDate=2026-11-25&page=2&limit=10'
    );
    assert.deepStrictEqual(pagedResult.pagination, {
      page: 2,
      limit: 10,
      total: 15,
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true,
    });
    console.log('✓ Tests 2 & 3 passed: Query parameter serialization and pagination preserved.');

    // -----------------------------------------------------------------------
    // 4. Empty sales result
    // -----------------------------------------------------------------------
    console.log('4. Testing empty sales result ...');
    globalThis.fetch = async (): Promise<Response> =>
      createJsonResponse(200, {
        success: true,
        data: {
          sales: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      });

    const emptyResult = await fetchSalesList({ search: '   ' });
    assert.deepStrictEqual(emptyResult.sales, []);
    assert.strictEqual(emptyResult.pagination.total, 0);
    assert.strictEqual(emptyResult.pagination.totalPages, 0);
    console.log('✓ Test 4 passed: Empty sales result handled cleanly.');

    // -----------------------------------------------------------------------
    // 5. Successful sale detail request
    // -----------------------------------------------------------------------
    console.log('5. Testing fetchSaleById() ...');
    recordedRequests.length = 0;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      recordedRequests.push({
        url: String(input),
        headers: (init?.headers || {}) as Record<string, string>,
      });
      return createJsonResponse(200, {
        success: true,
        data: {
          sale: SAMPLE_SALE_DETAIL,
        },
      });
    };

    const detailResult = await fetchSaleById(SAMPLE_SALE_DETAIL.id);
    assert.strictEqual(recordedRequests[0].url, `/api/sales/${SAMPLE_SALE_DETAIL.id}`);
    assert.strictEqual(recordedRequests[0].headers['Authorization'], `Bearer ${SAMPLE_TOKEN}`);
    assert.strictEqual(detailResult.sale.notes, 'VIP guest table');
    assert.strictEqual(detailResult.sale.items?.length, 2);
    assert.strictEqual(detailResult.sale.items?.[0].name, 'Lok Lak Beef');
    assert.strictEqual(detailResult.sale.items?.[0].unitPrice, 8);
    assert.strictEqual(detailResult.sale.items?.[0].subtotal, 16);
    assert.strictEqual(detailResult.rawSale.order?.orderNumber, 'ORD-1001');
    console.log('✓ Test 5 passed: fetchSaleById() returns mapped detail and rawSale.');

    // -----------------------------------------------------------------------
    // 6. API error handling (403, 404, empty ID validation, network failure)
    // -----------------------------------------------------------------------
    console.log('6. Testing API error handling ...');
    let emptyIdErr: unknown;
    try {
      await fetchSaleById('   ');
    } catch (err) {
      emptyIdErr = err;
    }
    assert.ok(isApiError(emptyIdErr));
    assert.strictEqual(emptyIdErr.status, 400);
    assert.strictEqual(emptyIdErr.category, 'VALIDATION');

    globalThis.fetch = async (): Promise<Response> =>
      createJsonResponse(403, { success: false, error: 'Insufficient privileges: missing permission(s) [sales.view]' });

    let forbiddenErr: unknown;
    try {
      await fetchSalesList();
    } catch (err) {
      forbiddenErr = err;
    }
    assert.ok(isApiError(forbiddenErr));
    assert.strictEqual(forbiddenErr.status, 403);
    assert.strictEqual(forbiddenErr.category, 'FORBIDDEN');
    assert.strictEqual(getToken(), SAMPLE_TOKEN, '403 must NOT clear stored JWT');

    globalThis.fetch = async (): Promise<Response> =>
      createJsonResponse(404, { success: false, error: 'Sale transaction not found' });

    let notFoundErr: unknown;
    try {
      await fetchSaleById('99999999-9999-4999-8999-999999999999');
    } catch (err) {
      notFoundErr = err;
    }
    assert.ok(isApiError(notFoundErr));
    assert.strictEqual(notFoundErr.status, 404);
    assert.strictEqual(notFoundErr.category, 'NOT_FOUND');
    console.log('✓ Test 6 passed: API error handling verified.');

    // -----------------------------------------------------------------------
    // 7. Authentication 401 handling through centralized apiClient
    // -----------------------------------------------------------------------
    console.log('7. Testing 401 token purge via centralized apiClient ...');
    setToken(SAMPLE_TOKEN);
    globalThis.fetch = async (): Promise<Response> =>
      createJsonResponse(401, { success: false, error: 'Authentication token has expired' });

    let unauthErr: unknown;
    try {
      await fetchSalesList();
    } catch (err) {
      unauthErr = err;
    }
    assert.ok(isApiError(unauthErr));
    assert.strictEqual(unauthErr.status, 401);
    assert.strictEqual(unauthErr.isUnauthorized, true);
    assert.strictEqual(getToken(), null, '401 via apiClient must clear invalid token');

    // Verify mapBackendSaleToTransaction handles missing paymentMethod safely
    const noPaymentMapped = mapBackendSaleToTransaction({
      ...SAMPLE_SALE_MINIMAL,
      paymentMethod: null,
      orderType: 'DINE_IN',
      tableName: null,
    });
    assert.strictEqual(noPaymentMapped.paymentMethod, undefined);
    assert.strictEqual(noPaymentMapped.table, '');
    console.log('✓ Test 7 passed: Auth 401 purge and safe null mapping verified.');

    console.log('\n====================================================================');
    console.log('✔ ALL STEP 2H-B FRONTEND SALES API TESTS PASSED!');
    console.log('====================================================================\n');
  } finally {
    globalThis.fetch = originalFetch;
    clearToken();
  }
}

runSalesApiTests().catch((err) => {
  console.error('\n❌ FRONTEND SALES API TEST SUITE FAILED:', err);
  process.exit(1);
});
