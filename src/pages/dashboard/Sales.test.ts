/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { SalesTable } from '../../components/sales/SalesTable';
import { SaleDetailModal } from '../../components/sales/SaleDetailModal';
import { buildBackendSalesQuery } from '../../hooks/useSalesHistory';
import Sales from './Sales';
import { Transaction } from '../../types';
import {
  BackendSaleDetailDto,
  BackendSaleListItemDto,
  mapBackendSaleToTransaction,
} from '../../services/salesApi';

const SAMPLE_RAW_SALE: BackendSaleListItemDto = {
  id: '11111111-1111-4111-8111-111111111111',
  transactionNumber: 'TX-2026-001',
  orderNumber: 'ORD-1001',
  createdAt: '2026-11-26T10:00:00.000Z',
  completedAt: '2026-11-26T10:05:00.000Z',
  tableName: 'Table 05',
  orderType: 'DINE_IN',
  customer: { id: 'c1', name: 'Sokha Chan', phone: '+85512000111' },
  cashier: { id: 'u1', name: 'Pan Bunheng' },
  currency: 'USD',
  subtotal: '20.00',
  taxAmount: '2.00',
  serviceChargeAmount: '1.00',
  discountAmount: '0.50',
  grossAmount: '22.50',
  amountPaid: '15.00',
  paymentStatus: 'PARTIALLY_PAID',
  status: 'ACTIVE',
  paymentMethod: 'CASH',
  paymentSummary: 'Cash ($15.00)',
  itemSummary: '2x Lok Lak Beef',
  payments: [
    {
      id: 'p1',
      method: 'CASH',
      status: 'SUCCESS',
      currency: 'USD',
      amount: '15.00',
      cashReceived: '20.00',
      changeGiven: '5.00',
      paidAt: '2026-11-26T10:05:00.000Z',
    },
  ],
};

const SAMPLE_DETAIL_DTO: BackendSaleDetailDto = {
  ...SAMPLE_RAW_SALE,
  notes: 'Partial deposit',
  discountType: 'FIXED_AMOUNT',
  discountRate: null,
  discountReason: 'Loyalty',
  order: { id: 'o1', orderNumber: 'ORD-1001', source: 'POS', orderType: 'DINE_IN' },
  items: [
    {
      id: 'i1',
      productId: 'prod-1',
      productName: 'Lok Lak Beef',
      quantity: 2,
      unitPrice: '10.00',
      lineTotal: '20.00',
      instructions: null,
    },
  ],
};

function runSalesUiTests() {
  console.log('====================================================================');
  console.log('STEP 2H-C: SALES HISTORY UI INTEGRATION TEST SUITE');
  console.log('====================================================================\n');

  // 1. Filter query mapping & pagination reset logic
  console.log('1. Testing filter-to-backend query mapping ...');
  const qBasic = buildBackendSalesQuery({
    search: '  Sokha ',
    datePreset: 'today',
    customStartDate: '',
    customEndDate: '',
    paymentMethod: 'QR Code',
    status: 'paid',
    page: 2,
    limit: 20,
  });
  assert.ok(qBasic);
  assert.strictEqual(qBasic.search, 'Sokha');
  assert.strictEqual(qBasic.paymentMethod, 'KHQR');
  assert.strictEqual(qBasic.status, 'PAID');
  assert.strictEqual(qBasic.page, 2);
  assert.ok(qBasic.startDate && qBasic.endDate);

  const qCustom = buildBackendSalesQuery({
    search: '',
    datePreset: 'custom',
    customStartDate: '2026-11-01',
    customEndDate: '2026-11-10',
    paymentMethod: 'Credit Card',
    status: 'all',
    page: 1,
  });
  assert.ok(qCustom);
  assert.strictEqual(qCustom.paymentMethod, 'CREDIT_CARD');
  assert.ok(qCustom.startDate && qCustom.endDate);

  const qInverted = buildBackendSalesQuery({
    search: '',
    datePreset: 'custom',
    customStartDate: '2026-11-20',
    customEndDate: '2026-11-05',
    paymentMethod: 'all',
    status: 'all',
    page: 1,
  });
  assert.strictEqual(qInverted, null, 'Inverted custom date range must return null without invalid API call');

  const qRefunded = buildBackendSalesQuery({
    search: '',
    datePreset: 'all',
    customStartDate: '',
    customEndDate: '',
    paymentMethod: 'all',
    status: 'refunded',
    page: 1,
  });
  assert.strictEqual(qRefunded, null, 'Refunded status filter under NO-REFUND schema returns null cleanly');
  console.log('✓ 1. Filter-to-backend query mapping verified.');

  // 2. Loading state (no misleading empty state)
  console.log('2. Testing SalesTable loading state ...');
  const loadingHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SalesTable, {
      sales: [],
      totalCompletedCount: 0,
      hasActiveFilters: false,
      isLoading: true,
      onSelectSale: () => {},
      onViewReceipt: () => {},
    })
  );
  assert.ok(loadingHtml.includes('Loading sales history...'), 'Loading spinner message must render');
  assert.ok(!loadingHtml.includes('No sales records found'), 'Must NOT show empty state while loading');
  console.log('✓ 2. Loading state verified.');

  // 3. Empty result state
  console.log('3. Testing SalesTable empty state ...');
  const emptyHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SalesTable, {
      sales: [],
      totalCompletedCount: 0,
      hasActiveFilters: false,
      isLoading: false,
      onSelectSale: () => {},
      onViewReceipt: () => {},
    })
  );
  assert.ok(emptyHtml.includes('No sales records found'));
  console.log('✓ 3. Empty state verified.');

  // 4. Error banner + Retry without wiping existing valid rows
  console.log('4. Testing SalesTable error + Retry + preserved rows ...');
  const mappedTx: Transaction = mapBackendSaleToTransaction(SAMPLE_RAW_SALE);
  const errorWithRowsHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SalesTable, {
      sales: [mappedTx],
      rawSalesById: { [mappedTx.id]: SAMPLE_RAW_SALE },
      totalCompletedCount: 25,
      hasActiveFilters: false,
      isLoading: false,
      error: 'Temporary server error (503)',
      onRetry: () => {},
      pagination: {
        page: 2,
        limit: 20,
        total: 25,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      },
      onSelectSale: () => {},
      onViewReceipt: () => {},
    })
  );
  assert.ok(errorWithRowsHtml.includes('Temporary server error (503)'));
  assert.ok(errorWithRowsHtml.includes('Retry'));
  assert.ok(errorWithRowsHtml.includes('ORD-1001'), 'Existing valid rows must remain visible on transient error');
  assert.ok(errorWithRowsHtml.includes('TX-2026-001'));
  assert.ok(errorWithRowsHtml.includes('Sokha Chan'));
  assert.ok(errorWithRowsHtml.includes('Partially Paid'), 'Must accurately display Partially Paid status');
  assert.ok(errorWithRowsHtml.includes('Showing 1 of 25 completed transactions'));
  assert.ok(errorWithRowsHtml.includes('Page 2 of 2'));
  console.log('✓ 4. Error banner, Retry, preserved rows, and pagination verified.');

  // 5. Missing paymentMethod does not fabricate 'Credit Card'
  console.log('5. Testing missing optional paymentMethod renders "—" ...');
  const noPayTx = mapBackendSaleToTransaction({ ...SAMPLE_RAW_SALE, paymentMethod: null, payments: [] });
  const noPayHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SalesTable, {
      sales: [noPayTx],
      totalCompletedCount: 1,
      hasActiveFilters: false,
      isLoading: false,
      onSelectSale: () => {},
      onViewReceipt: () => {},
    })
  );
  assert.ok(!noPayHtml.includes('Credit Card'), 'Must NOT fabricate Credit Card when paymentMethod is null');
  console.log('✓ 5. Missing optional fields handled without fabrication.');

  // 6. SaleDetailModal loading, error, and full backend detail rendering
  console.log('6. Testing SaleDetailModal loading, error, and detail view ...');
  const detailLoadingHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SaleDetailModal, {
      isOpen: true,
      onClose: () => {},
      sale: mappedTx,
      rawDetail: SAMPLE_RAW_SALE,
      isLoading: true,
    })
  );
  assert.ok(detailLoadingHtml.includes('Loading sale details...'));

  const detailLoadedHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SaleDetailModal, {
      isOpen: true,
      onClose: () => {},
      sale: mapBackendSaleToTransaction(SAMPLE_DETAIL_DTO),
      rawDetail: SAMPLE_DETAIL_DTO,
      isLoading: false,
      error: 'Could not refresh detail',
      onRetryDetail: () => {},
    })
  );
  assert.ok(detailLoadedHtml.includes('Could not refresh detail'));
  assert.ok(detailLoadedHtml.includes('Lok Lak Beef'));
  assert.ok(detailLoadedHtml.includes('Pan Bunheng'));
  assert.ok(detailLoadedHtml.includes('Service Charge'));
  assert.ok(detailLoadedHtml.includes('Discount'));
  assert.ok(detailLoadedHtml.includes('Partially Paid'));
  assert.ok(!detailLoadedHtml.includes('Order Type'), 'Must preserve simplified modal without Order Type');
  console.log('✓ 6. SaleDetailModal states and accurate breakdown verified.');

  // 7. Sales page initial render (starts in loading state, preserves page title)
  console.log('7. Testing Sales page initial SSR render ...');
  const salesPageHtml = ReactDOMServer.renderToStaticMarkup(React.createElement(Sales, {}));
  assert.ok(salesPageHtml.includes('Sale History'));
  assert.ok(salesPageHtml.includes('Loading sales history...'));
  console.log('✓ 7. Sales page initial render verified.');

  console.log('\n====================================================================');
  console.log('✔ ALL STEP 2H-C SALES HISTORY UI TESTS PASSED!');
  console.log('====================================================================\n');
}

runSalesUiTests();
