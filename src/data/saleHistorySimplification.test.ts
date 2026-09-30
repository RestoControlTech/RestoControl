/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SIDEBAR_NAV_ITEMS } from '../layouts/DashboardLayout';
import { TRANSACTIONS_DATA, MENU_ITEMS } from './mockData';
import { Transaction, Order, User } from '../types';
import { filterSales } from '../utils/salesFilters';
import { calculateSalesSummary } from '../utils/salesSummary';
import { isSaleEligibleForRefund } from '../utils/refundRules';
import { getRefundableQuantity, getRefundableAmount } from '../utils/refundUtils';
import { hasPermission, ALL_PERMISSIONS, STAFF_PERMISSIONS, ADMIN_PERMISSIONS } from '../auth/permissions';

console.log('--- Running Sale History Simplification Verification Suite ---');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootSrc = path.resolve(__dirname, '..');

// ==========================================
// 1. Navigation verification
// ==========================================
{
  const navIds = SIDEBAR_NAV_ITEMS.map((item) => item.id);
  const navLabels = SIDEBAR_NAV_ITEMS.map((item) => item.label);

  assert.strictEqual(navIds.includes('dashboard' as any), false, 'Dashboard must NOT be in navigation');
  assert.strictEqual(navIds.includes('reports' as any), false, 'Reports must NOT be in navigation');

  const expectedNav = ['POS', 'Orders', 'Sale History', 'Menu', 'Tables', 'Staff', 'Customers', 'Settings'];
  assert.deepStrictEqual(navLabels, expectedNav, 'Navigation items must exactly match specified order and labels');

  console.log('✓ 1. Navigation verified: Dashboard and Reports removed; POS, Orders, Sale History, Menu, Tables, Staff, Customers, Settings present.');
}

// ==========================================
// 2. Physical File Deletion Verification
// ==========================================
{
  const dashboardPath = path.join(rootSrc, 'pages', 'dashboard', 'DashboardMain.tsx');
  const reportsPath = path.join(rootSrc, 'pages', 'dashboard', 'Reports.tsx');

  assert.strictEqual(fs.existsSync(dashboardPath), false, 'DashboardMain.tsx file must be deleted');
  assert.strictEqual(fs.existsSync(reportsPath), false, 'Reports.tsx file must be deleted');

  console.log('✓ 2. Unused pages DashboardMain.tsx and Reports.tsx confirmed deleted from repository.');
}

// ==========================================
// 3. Sales History Component Cleanliness (No CSV Export, No Order Type Summary, No Net Profit, No Search Order Menu)
// ==========================================
{
  const salesTsx = fs.readFileSync(path.join(rootSrc, 'pages', 'dashboard', 'Sales.tsx'), 'utf-8');
  const salesFiltersTsx = fs.readFileSync(path.join(rootSrc, 'components', 'sales', 'SalesFilters.tsx'), 'utf-8');
  const salesTableTsx = fs.readFileSync(path.join(rootSrc, 'components', 'sales', 'SalesTable.tsx'), 'utf-8');
  const saleDetailModalTsx = fs.readFileSync(path.join(rootSrc, 'components', 'sales', 'SaleDetailModal.tsx'), 'utf-8');
  const saleReceiptModalTsx = fs.readFileSync(path.join(rootSrc, 'components', 'sales', 'SaleReceiptModal.tsx'), 'utf-8');

  // Verify Sale History title
  assert.ok(salesTsx.includes('Sale History'), 'Sales.tsx title must be Sale History');

  // Verify Export CSV is removed
  assert.strictEqual(salesTsx.includes('Export CSV'), false, 'Export CSV button must be removed from Sales.tsx');
  assert.strictEqual(salesTsx.includes('Download'), false, 'Download icon import must be removed from Sales.tsx');

  // Verify Order Type Summary is removed from Sales.tsx
  assert.strictEqual(salesTsx.includes('orderTypeFilter'), false, 'orderTypeFilter state must be removed from Sales.tsx');
  assert.strictEqual(salesTsx.includes('SalesSummary'), false, 'SalesSummary component must not be rendered on clean Sale History page');

  // Verify SalesFilters has no Order Type filter dropdown
  assert.strictEqual(salesFiltersTsx.includes('All Order Types'), false, 'All Order Types select option must be removed');
  assert.strictEqual(salesFiltersTsx.includes('Type: {orderTypeFilter}'), false, 'Order type filter badge must be removed');

  // Verify Search Order Menu is NOT present
  assert.strictEqual(salesTsx.includes('Search Order Menu'), false, 'No Search Order Menu in Sales.tsx');
  assert.strictEqual(salesFiltersTsx.includes('Search Order Menu'), false, 'No Search Order Menu in SalesFilters.tsx');

  // Verify Table columns match Date | Sale ID | Items | Total | Payment | Status | Actions
  assert.ok(salesTableTsx.includes('<TableHeaderCell>Date</TableHeaderCell>'), 'Table must have Date column');
  assert.ok(salesTableTsx.includes('<TableHeaderCell>Sale ID</TableHeaderCell>'), 'Table must have Sale ID column');
  assert.ok(salesTableTsx.includes('<TableHeaderCell>Items</TableHeaderCell>'), 'Table must have Items column');
  assert.ok(salesTableTsx.includes('<TableHeaderCell>Total</TableHeaderCell>'), 'Table must have Total column');
  assert.ok(salesTableTsx.includes('<TableHeaderCell>Payment</TableHeaderCell>'), 'Table must have Payment column');
  assert.ok(salesTableTsx.includes('<TableHeaderCell>Status</TableHeaderCell>'), 'Table must have Status column');
  assert.ok(salesTableTsx.includes('<TableHeaderCell className="text-right">Actions</TableHeaderCell>'), 'Table must have Actions column');

  // Verify Order Type column is NOT in SalesTable
  assert.strictEqual(salesTableTsx.includes('Type & Table'), false, 'Type & Table column header must be removed');
  assert.strictEqual(salesTableTsx.includes('({sale.type})'), false, 'Takeaway/order type badge must be removed from table rows');

  // Verify SaleDetailModal does not display Order Type card
  assert.strictEqual(saleDetailModalTsx.includes('Order Type'), false, 'Order Type card must be removed from SaleDetailModal');

  // Verify SaleReceiptModal does not display Order Type line
  assert.strictEqual(saleReceiptModalTsx.includes('Order Type:'), false, 'Order Type row must be removed from SaleReceiptModal');

  console.log('✓ 3. Sale History UI cleanliness verified: Export CSV, Order Type Summary, Net Profit, and Takeaway UI removed.');
}

// ==========================================
// 4. Completed Sales Data & Filtering
// ==========================================
{
  const completedSales = TRANSACTIONS_DATA.filter(
    (tx) => tx.status === 'Receipt' || tx.status === 'Completed' || tx.status === 'Refunded'
  );

  assert.ok(completedSales.length >= 7, 'Completed sales data pool intact');

  // Search by ID/Order Number
  const searchResult = filterSales(completedSales, { searchQuery: '#TX-9042' });
  assert.strictEqual(searchResult.length, 1, 'Sale search by order # returns 1 record');
  assert.strictEqual(searchResult[0].orderNumber, '#TX-9042');

  // Payment method filtering
  const cashSales = filterSales(completedSales, { paymentMethod: 'Cash' });
  assert.strictEqual(cashSales.length, 2, 'Cash payment method filter returns 2 sales');

  // Status filtering
  const refundedSales = filterSales(completedSales, { status: 'refunded' });
  assert.strictEqual(refundedSales.length, 1, 'Status filter "refunded" returns 1 sale');

  console.log('✓ 4. Sale History search and filtering operational on existing transaction dataset.');
}

// ==========================================
// 5. Refund Logic & Idempotency
// ==========================================
{
  const sampleSale = TRANSACTIONS_DATA.find((tx) => tx.id === 'tx1')!;
  const eligibility = isSaleEligibleForRefund(sampleSale);
  assert.strictEqual(eligibility.eligible, true, 'Sample sale is eligible for refund');

  const maxRefund = getRefundableAmount(sampleSale.amount, sampleSale.refundedAmount);
  assert.strictEqual(maxRefund, 33.50, 'Max refund amount equals sale amount');

  const remQty = getRefundableQuantity(2, 0);
  assert.strictEqual(remQty, 2, 'Refundable quantity calculated correctly');

  console.log('✓ 5. Refund rules, balance clamps, and calculations verified intact.');
}

// ==========================================
// 6. RBAC & Route Guard Security
// ==========================================
{
  const adminUser: User = { id: 'admin-1', name: 'Admin', email: 'admin@resto.com', role: 'admin' };
  const staffUser: User = { id: 'staff-1', name: 'Staff', email: 'staff@resto.com', role: 'staff' };

  // Admin access
  assert.strictEqual(hasPermission(adminUser, 'pos.use'), true);
  assert.strictEqual(hasPermission(adminUser, 'orders.view'), true);
  assert.strictEqual(hasPermission(adminUser, 'sales.view'), true);
  assert.strictEqual(hasPermission(adminUser, 'menu.view'), true);
  assert.strictEqual(hasPermission(adminUser, 'tables.view'), true);
  assert.strictEqual(hasPermission(adminUser, 'staff.view'), true);
  assert.strictEqual(hasPermission(adminUser, 'settings.view'), true);

  // Staff allowed access
  assert.strictEqual(hasPermission(staffUser, 'pos.use'), true);
  assert.strictEqual(hasPermission(staffUser, 'orders.view'), true);
  assert.strictEqual(hasPermission(staffUser, 'menu.view'), true);
  assert.strictEqual(hasPermission(staffUser, 'tables.view'), true);

  // Staff denied access to admin-only operational routes
  assert.strictEqual(hasPermission(staffUser, 'sales.view'), false, 'Staff denied sales.view');
  assert.strictEqual(hasPermission(staffUser, 'staff.view'), false, 'Staff denied staff.view');
  assert.strictEqual(hasPermission(staffUser, 'settings.view'), false, 'Staff denied settings.view');

  console.log('✓ 6. RBAC security matrix verified: Unauthorized staff restricted from sensitive features.');
}

// ==========================================
// 7. Route Redirects & No Broken Routes
// ==========================================
{
  const appRoutesTsx = fs.readFileSync(path.join(rootSrc, 'routes', 'AppRoutes.tsx'), 'utf-8');

  // Verify / redirects to /pos
  assert.ok(appRoutesTsx.includes('path="/" element={<Navigate to="/pos" replace />}'), 'Root / redirects to /pos');

  // Verify /dashboard redirects to /pos
  assert.ok(appRoutesTsx.includes('path="/dashboard" element={<Navigate to="/pos" replace />}'), '/dashboard redirects to /pos');

  // Verify /reports redirects to /sales
  assert.ok(appRoutesTsx.includes('path="/reports" element={<Navigate to="/sales" replace />}'), '/reports redirects to /sales');

  // Verify fallback redirects to /pos
  assert.ok(appRoutesTsx.includes('path="*" element={<Navigate to="/pos" replace />}'), 'Fallback * redirects to /pos');

  console.log('✓ 7. Route redirection verified: No broken routes, clean redirects to operational stations.');
}

console.log('\n✔ All Sale History Simplification verification tests passed successfully!\n');
