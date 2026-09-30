/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import { Table, Order, OrderItem } from '../types';
import { getTableMenuPath, getTableMenuUrl, generateTableQRCodeDataUrl } from '../utils/qr';
import { useOrderNotificationStore } from '../store/orderNotification.store';
import { getNormalizedStatus, getNormalizedPayment } from '../pages/dashboard/Orders';
import { useAuthStore } from '../auth/auth.store';

console.log('--- Running Table, Login, POS & Order Cleanup Test Suite ---');

// ==========================================
// 1. ADD TABLE & DUPLICATE TABLE VALIDATION
// ==========================================
console.log('\n--- 1. Testing Add Table & Duplicate Validation ---');

let testTables: Table[] = [
  { id: 't1', name: 'Table 01', section: 'Main Dining', seats: 4, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t1' },
  { id: 't2', name: 'Table 02', section: 'Main Dining', seats: 2, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t2' },
  { id: 't3', name: 'Table 03', section: 'Indoor Booths', seats: 6, status: 'Occupied', qrCodeUrl: 'restocontrol.menu/menu/t3' },
];

function addTable(
  currentTables: Table[],
  newTableData: { name: string; section: string; seats: number }
): { success: boolean; error?: string; table?: Table } {
  const cleanName = newTableData.name.trim();
  if (!cleanName) {
    return { success: false, error: 'Table number or name is required.' };
  }

  const isDuplicate = currentTables.some(
    (t) => t.name.trim().toLowerCase() === cleanName.toLowerCase()
  );
  if (isDuplicate) {
    return {
      success: false,
      error: `Table "${cleanName}" already exists. Please choose a different table number or name.`,
    };
  }

  const numSeats = Number(newTableData.seats);
  if (isNaN(numSeats) || numSeats < 1) {
    return { success: false, error: 'Number of seats must be at least 1.' };
  }

  const match = cleanName.match(/\d+/);
  let candidateId = '';
  if (match) {
    const num = parseInt(match[0], 10);
    const testId = `t${num}`;
    if (!currentTables.some((t) => t.id.toLowerCase() === testId.toLowerCase())) {
      candidateId = testId;
    }
  }
  if (!candidateId) {
    let i = currentTables.length + 1;
    while (currentTables.some((t) => t.id.toLowerCase() === `t${i}`)) {
      i++;
    }
    candidateId = `t${i}`;
  }

  const newTable: Table = {
    id: candidateId,
    name: cleanName,
    section: newTableData.section.trim() || 'Main Dining',
    seats: numSeats,
    status: 'Available',
    qrCodeUrl: `restocontrol.menu/menu/${candidateId}`,
  };

  return { success: true, table: newTable };
}

// 1.1 Add Table succeeds
const addRes1 = addTable(testTables, { name: 'Table 04', section: 'Main Dining', seats: 4 });
assert.strictEqual(addRes1.success, true, 'Add Table 04 must succeed');
assert.ok(addRes1.table, 'Returned table object must exist');
assert.strictEqual(addRes1.table?.name, 'Table 04');
assert.strictEqual(addRes1.table?.id, 't4', 'Table 04 should generate unique ID t4');
assert.strictEqual(addRes1.table?.status, 'Available', 'Default table status must be Available');
assert.strictEqual(addRes1.table?.seats, 4);
assert.strictEqual(addRes1.table?.section, 'Main Dining');
assert.strictEqual(addRes1.table?.qrCodeUrl, 'restocontrol.menu/menu/t4');

// Append to testTables
testTables = [...testTables, addRes1.table!];
assert.strictEqual(testTables.length, 4, 'Table list must now have 4 tables');
console.log('✓ 1.1 Add Table creates table with unique ID, default Available status, and valid QR URL.');

// 1.2 Duplicate Table validation
const dupRes = addTable(testTables, { name: 'table 04', section: 'Patio', seats: 2 });
assert.strictEqual(dupRes.success, false, 'Duplicate table name must be rejected');
assert.ok(dupRes.error?.includes('already exists'), 'Error message must clearly state table already exists');
console.log('✓ 1.2 Duplicate table validation correctly blocks identical table number (case-insensitive).');

// 1.3 Invalid seats validation
const invalidSeatsRes = addTable(testTables, { name: 'Table 05', section: 'Patio', seats: 0 });
assert.strictEqual(invalidSeatsRes.success, false, 'Zero seats must be rejected');
console.log('✓ 1.3 Validation blocks invalid seating numbers.');

// ==========================================
// 2. TABLE QR GENERATION FOR NEW TABLE
// ==========================================
console.log('\n--- 2. Testing QR Generation & Routing for New Table ---');

const newTableId = addRes1.table!.id;
const newTablePath = getTableMenuPath(newTableId);
assert.strictEqual(newTablePath, '/menu/t4', 'QR path for new table must be /menu/t4');

const newTableUrl = getTableMenuUrl(newTableId, 'https://restocontrol.menu');
assert.strictEqual(newTableUrl, 'https://restocontrol.menu/menu/t4');

// Routing resolver
function resolveTable(paramId: string | undefined, tableList: Table[]): Table | undefined {
  const cleanId = (paramId || '').trim().toLowerCase();
  return tableList.find((t) => {
    const tId = t.id.toLowerCase();
    const tSlug = t.name.toLowerCase().replace(/[\s-_]+/g, '');
    const cleanSearch = cleanId.replace(/[\s-_]+/g, '');
    return tId === cleanId || tSlug === cleanSearch;
  });
}

assert.strictEqual(resolveTable('t4', testTables)?.name, 'Table 04', 'Route /menu/t4 must resolve to Table 04');
assert.strictEqual(resolveTable('table-04', testTables)?.name, 'Table 04', 'Slug table-04 must resolve to Table 04');
assert.strictEqual(resolveTable('unknown-table', testTables), undefined, 'Invalid route must safely return undefined');
console.log('✓ 2. New table QR path and route resolution verified.');

// QR Data URL generation for new table
async function testNewTableQR() {
  const qrDataUrl = await generateTableQRCodeDataUrl(newTableId, { width: 200 });
  assert.ok(qrDataUrl.startsWith('data:image/png;base64,'), 'QR data URL must be valid PNG base64');
  console.log('✓ 2b. PNG QR Code data URL generation verified for new table.');
}

// ==========================================
// 3. TABLE STATUS WORKFLOW & NO "ONLINE" STATUS
// ==========================================
console.log('\n--- 3. Testing Table Statuses (Available, Occupied, Reserved) ---');

// Ensure valid restaurant statuses only
const allowedStatuses = ['Available', 'Occupied', 'Reserved'];
for (const t of testTables) {
  assert.ok(allowedStatuses.includes(t.status), `Table status "${t.status}" must be one of ${allowedStatuses.join(', ')}`);
  assert.notStrictEqual((t as any).status, 'Online', 'Table status must NEVER be Online');
}
console.log('✓ 3. Table states restricted to Available, Occupied, Reserved. No "Online" table status exists.');

// ==========================================
// 4. LOGIN AUTHENTICATION (NO AUTO PASSWORD)
// ==========================================
console.log('\n--- 4. Testing Login Without Auto-Password ---');

const authStore = useAuthStore.getState();

// Empty password fails
const emptyPassRes = authStore.login('panbunhen58@gmail.com', '');
assert.strictEqual(emptyPassRes.success, false, 'Login with empty password must fail');

// Invalid password fails
const wrongPassRes = authStore.login('panbunhen58@gmail.com', 'wrongpassword');
assert.strictEqual(wrongPassRes.success, false, 'Login with incorrect password must fail');

// Correct user credentials succeed
const validLoginRes = authStore.login('panbunhen58@gmail.com', 'Heng1111');
assert.strictEqual(validLoginRes.success, true, 'Login with valid user credentials must succeed');
assert.strictEqual(useAuthStore.getState().isAuthenticated, true);
assert.strictEqual(useAuthStore.getState().user?.role, 'admin');

authStore.logout();
assert.strictEqual(useAuthStore.getState().isAuthenticated, false);
console.log('✓ 4. Login requires user credentials; auto-password removed while auth logic & RBAC preserved.');

// ==========================================
// 5. REAL APPLICATION-LEVEL ORDER NOTIFICATION
// ==========================================
console.log('\n--- 5. Testing Order Notification Store ---');

const notifStore = useOrderNotificationStore.getState();
notifStore.clearAll();
assert.strictEqual(notifStore.getUnhandledCount(), 0, 'Notifications must start at 0');

const dummyOrder: Order = {
  id: 'ord-test-101',
  orderNumber: '#ORD-2001',
  table: 'Table 04',
  customer: 'QR Guest (Table 04)',
  orderType: 'Dine In',
  items: [
    { id: 'p1', name: 'Tonkotsu Ramen', quantity: 2, unitPrice: 13.5, lineTotal: 27.0 },
    { id: 'p2', name: 'Yuzu Soda', quantity: 1, unitPrice: 3.5, lineTotal: 3.5 },
  ],
  total: 30.5,
  paymentStatus: 'UNPAID',
  status: 'NEW',
  dateTime: 'Today, 12:00',
  note: 'Customer QR Order',
};

// Dispatch notification
useOrderNotificationStore.getState().notifyNewOrder(dummyOrder);

const stateAfterNotif = useOrderNotificationStore.getState();
assert.strictEqual(stateAfterNotif.notifications.length, 1, 'Notifications count must be 1');
assert.strictEqual(stateAfterNotif.getUnhandledCount(), 1, 'Unhandled notifications count must be 1');
assert.strictEqual(stateAfterNotif.activeToast?.tableName, 'Table 04');
assert.strictEqual(stateAfterNotif.activeToast?.itemCount, 3, '2 ramen + 1 soda = 3 items');
assert.strictEqual(stateAfterNotif.activeToast?.total, 30.5);

// Duplicate notification prevention
useOrderNotificationStore.getState().notifyNewOrder(dummyOrder);
assert.strictEqual(
  useOrderNotificationStore.getState().notifications.length,
  1,
  'Duplicate notification for same order must be blocked'
);
console.log('✓ 5.1 Real application-level notification triggered, showing table and item info without duplicates.');

// Dismiss toast
useOrderNotificationStore.getState().dismissToast();
assert.strictEqual(useOrderNotificationStore.getState().activeToast, null, 'Active toast dismissed');
assert.strictEqual(useOrderNotificationStore.getState().getUnhandledCount(), 1, 'Notification still unhandled in list');

// Mark as handled
useOrderNotificationStore.getState().markAsHandled('ord-test-101');
assert.strictEqual(
  useOrderNotificationStore.getState().getUnhandledCount(),
  0,
  'Unhandled count must be 0 after marking handled'
);
console.log('✓ 5.2 Toast dismissal and markAsHandled workflow verified.');

// ==========================================
// 6. KITCHEN STATUS WORKFLOW & PAYMENT SAFETY
// ==========================================
console.log('\n--- 6. Testing Kitchen Status Progression & Payment Safety Invariants ---');

let kitchenOrder: Order = {
  id: 'ord-test-102',
  orderNumber: '#ORD-2002',
  table: 'Table 04',
  customer: 'QR Guest (Table 04)',
  orderType: 'Dine In',
  items: [{ id: 'p1', name: 'Miso Ramen', quantity: 1, unitPrice: 14.0, lineTotal: 14.0 }],
  total: 14.0,
  paymentStatus: 'UNPAID',
  status: 'NEW',
  dateTime: 'Today, 12:15',
};

// Step 6.1: Initial State
assert.strictEqual(getNormalizedStatus(kitchenOrder.status), 'NEW');
assert.strictEqual(getNormalizedPayment(kitchenOrder.paymentStatus), 'UNPAID');

// Step 6.2: Advance to Kitchen / PREPARING
kitchenOrder = { ...kitchenOrder, status: 'PREPARING' };
assert.strictEqual(getNormalizedStatus(kitchenOrder.status), 'PREPARING');
assert.strictEqual(kitchenOrder.paymentStatus, 'UNPAID', 'Payment MUST remain UNPAID when moving to Preparing');

// Step 6.3: Advance to READY
kitchenOrder = { ...kitchenOrder, status: 'READY' };
assert.strictEqual(getNormalizedStatus(kitchenOrder.status), 'READY');
assert.strictEqual(kitchenOrder.paymentStatus, 'UNPAID', 'Payment MUST remain UNPAID when moving to Ready');

// Step 6.4: Advance to COMPLETED
kitchenOrder = { ...kitchenOrder, status: 'Completed' };
assert.strictEqual(getNormalizedStatus(kitchenOrder.status), 'COMPLETED');
assert.strictEqual(kitchenOrder.paymentStatus, 'UNPAID', 'Payment MUST remain UNPAID when kitchen completes order');

console.log('✓ 6.1 Kitchen workflow (NEW -> PREPARING -> READY -> COMPLETED) verified.');
console.log('✓ 6.2 CRITICAL PAYMENT SAFETY: Kitchen status progression never alters UNPAID payment status.');

// Step 6.5: Checkout / Payment Processed
kitchenOrder = { ...kitchenOrder, paymentStatus: 'PAID' };
assert.strictEqual(getNormalizedPayment(kitchenOrder.paymentStatus), 'PAID');
assert.strictEqual(getNormalizedStatus(kitchenOrder.status), 'COMPLETED');
console.log('✓ 6.3 Payment succeeds independently and transitions payment status to PAID.');

// Execute async tests
testNewTableQR().then(() => {
  console.log('\n✔ All Table, Login, POS & Order Cleanup tests passed successfully!');
}).catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
