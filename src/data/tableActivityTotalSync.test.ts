/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import { RestoDatabase } from '../server/database';
import { Table, Order } from '../types';

console.log('--- Running Table Activity Detection & Table Total Sync Test Suite ---');

// Use isolated in-memory test database instance with clean scratch file
import path from 'node:path';
import fs from 'node:fs';

const testDbPath = path.resolve(process.cwd(), 'src/data/resto_db.test.json');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const db = new RestoDatabase(testDbPath);
db.resetDefaults();

async function runTestSuite() {
  console.log('1. Verify initial clean database state:');
  const initialTables = db.getTables();
  const table1 = initialTables.find((t) => t.id === 't1');
  assert.ok(table1, 'Table 01 must exist in initial layout');
  assert.strictEqual(table1.status, 'Available', 'Table 01 must start Available');
  assert.strictEqual(table1.isActive, false, 'Table 01 must start inactive');
  assert.strictEqual(table1.totalAmount, 0, 'Table 01 outstanding total must start at 0');
  console.log('✓ 1. Initial State verified: Table 01 is Available, inactive, total $0.00 (White Card)');

  console.log('2. Customer scans Table 01 QR & opens menu:');
  const activityResult = await db.recordTableActivity('t1');
  assert.strictEqual(activityResult.success, true, 'Recording activity must succeed');
  assert.ok(activityResult.table, 'Returned table must exist');
  assert.strictEqual(activityResult.table.status, 'Busy', 'Table status must transition to Busy');
  assert.strictEqual(activityResult.table.isActive, true, 'Table isActive must become true');
  assert.ok(activityResult.table.lastActivity, 'Last activity timestamp must be recorded');
  assert.strictEqual(activityResult.table.totalAmount, 0, 'Total remains 0 before any orders placed');
  console.log('✓ 2. Customer QR scan recorded: Table 01 becomes Busy & Active (Orange Card)');

  console.log('3. Customer A places Order 1 ($16.00):');
  const order1Result = await db.createOrder({
    id: 'ord-test-1',
    table: 'Table 01',
    tableId: 't1',
    total: 16.00,
    items: [{ id: 'item-1', name: 'Tonkotsu Ramen', quantity: 1, unitPrice: 16.00, lineTotal: 16.00 }],
  }, 'customer');

  assert.strictEqual(order1Result.success, true, 'Order 1 creation must succeed');
  assert.ok(order1Result.order, 'Order 1 must be created');
  assert.strictEqual(order1Result.order.paymentStatus, 'UNPAID', 'Customer order must strictly be UNPAID');
  assert.strictEqual(order1Result.table?.totalAmount, 16.00, 'Table total must update to $16.00');
  console.log('✓ 3. Customer A order placed: Separate order created, Table total updates to $16.00');

  console.log('4. Customer B scans same table and places Order 2 ($24.00):');
  const order2Result = await db.createOrder({
    id: 'ord-test-2',
    table: 'Table 01',
    tableId: 't1',
    total: 24.00,
    items: [{ id: 'item-2', name: 'Black Garlic Miso', quantity: 2, unitPrice: 12.00, lineTotal: 24.00 }],
  }, 'customer');

  assert.strictEqual(order2Result.success, true, 'Order 2 creation must succeed');
  assert.ok(order2Result.order, 'Order 2 must be created');
  assert.notStrictEqual(order2Result.order.id, order1Result.order?.id, 'Separate order must be created');
  assert.strictEqual(order2Result.order.paymentStatus, 'UNPAID');

  const updatedTable1 = db.findTable('t1');
  assert.ok(updatedTable1);
  const combinedTotal = db.computeTableTotal('t1');
  assert.strictEqual(combinedTotal, 40.00, 'Combined table amount must update to $40.00 ($16 + $24)');
  assert.strictEqual(updatedTable1.totalAmount, 40.00, 'Table total amount field must reflect combined total');
  console.log('✓ 4. Customer B scans same table: Separate order created, combined table total updates to $40.00');

  console.log('5. Security: Customer cannot mark orders as paid:');
  const customerPayAttempt = await db.payTableOrders('t1', { method: 'Cash' }, 'customer');
  assert.strictEqual(customerPayAttempt.success, false, 'Customer cannot execute payTableOrders');
  assert.ok(customerPayAttempt.error?.includes('Unauthorized'), 'Clear unauthorized error returned');

  const customerPaidOrderAttempt = await db.createOrder({
    table: 'Table 01',
    tableId: 't1',
    total: 10.00,
    paymentStatus: 'PAID' as any,
  }, 'customer');
  assert.strictEqual(customerPaidOrderAttempt.order?.paymentStatus, 'UNPAID', 'Server must force UNPAID for customer orders');
  console.log('✓ 5. Security: Customer payment attempts strictly rejected and prevented');

  console.log('6. Security: Server validates table ID:');
  const invalidTableActivity = await db.recordTableActivity('table-unknown-999');
  assert.strictEqual(invalidTableActivity.success, false, 'Invalid table ID rejected');
  const invalidTableOrder = await db.createOrder({ tableId: 'nonexistent-table', total: 10 }, 'customer');
  assert.strictEqual(invalidTableOrder.success, false, 'Order for invalid table rejected');
  console.log('✓ 6. Security: Server validates table IDs strictly');

  console.log('7. Admin Workflow: Staff receives payment for all outstanding orders:');
  const payResult = await db.payTableOrders('t1', {
    orderNumber: 'TABLE-t1',
    method: 'Cash',
    currency: 'USD',
    amount: 50.00,
    currencyAmount: 50.00,
    cashReceived: 50.00,
    change: 0.00,
    tableName: 'Table 01',
    timestamp: new Date().toISOString(),
  }, 'staff');

  assert.strictEqual(payResult.success, true, 'Staff payment must succeed');
  assert.strictEqual(payResult.totalPaid, 50.00, 'Total paid must equal sum of unpaid orders ($16 + $24 + $10)');
  assert.ok(payResult.paidOrders && payResult.paidOrders.length >= 2, 'All associated orders must be marked paid');

  for (const paidOrder of payResult.paidOrders || []) {
    assert.strictEqual(paidOrder.paymentStatus, 'PAID', `Order ${paidOrder.orderNumber} must be marked PAID`);
  }

  assert.ok(payResult.table, 'Returned table must exist');
  assert.strictEqual(payResult.table.status, 'Available', 'Table status must reset to Available');
  assert.strictEqual(payResult.table.isActive, false, 'Table activity must be cleared (isActive = false)');
  assert.strictEqual(payResult.table.lastActivity, null, 'Last activity must be reset to null');
  assert.strictEqual(payResult.table.totalAmount, 0, 'Outstanding order amount must reset to 0 (White Card)');

  const freshTable1 = db.findTable('t1');
  assert.strictEqual(freshTable1?.status, 'Available');
  assert.strictEqual(freshTable1?.isActive, false);
  assert.strictEqual(freshTable1?.totalAmount, 0);
  console.log('✓ 7. Admin payment: Orders marked paid, table activity cleared, card returns to white ($0.00 total)');

  console.log('8. Idempotency & Concurrency: Duplicate order rejection:');
  const duplicateSubmission = await db.createOrder({
    id: 'ord-test-duplicate',
    tableId: 't2',
    total: 20.00,
  }, 'staff');
  assert.strictEqual(duplicateSubmission.success, true);

  const reSubmission = await db.createOrder({
    id: 'ord-test-duplicate',
    tableId: 't2',
    total: 20.00,
  }, 'staff');
  assert.strictEqual(reSubmission.success, true);
  const table2Total = db.computeTableTotal('t2');
  assert.strictEqual(table2Total, 20.00, 'Duplicate submission with same ID must not inflate table total');
  console.log('✓ 8. Idempotency verified: Duplicate requests do not corrupt totals or create duplicate orders');

  // Clean up test file
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  console.log('======================================================================');
  console.log('✔ ALL Table Activity Detection & Table Total Sync Tests Passed!');
  console.log('======================================================================');
}

runTestSuite().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

