/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import { Order, OrderItem } from '../types';

console.log('--- Testing 1-Table 1-Active-Bill & Re-order Merge Workflow ---');

let orders: Order[] = [];

const handleSendOrderToKitchen = (
  tableName: string,
  tableId: string,
  orderItems: OrderItem[]
) => {
  const targetTableId = tableId;
  const timeStr = '12:20 PM';

  const cleanTargetTable = tableName.trim().toLowerCase().replace(/[\s-_]+/g, '');
  const existingIdx = orders.findIndex((o) => {
    const oTableClean = o.table.trim().toLowerCase().replace(/[\s-_]+/g, '');
    const isSameTable =
      oTableClean === cleanTargetTable ||
      (targetTableId && o.tableId && o.tableId.toLowerCase() === targetTableId.toLowerCase());
    const isUnpaid = o.paymentStatus === 'UNPAID' || o.paymentStatus === 'Unpaid' || o.paymentStatus === 'Pending';
    return isSameTable && isUnpaid && o.status !== 'Cancelled';
  });

  if (existingIdx > -1) {
    // Table already has an active unpaid bill: Merge new items
    const existingOrder = orders[existingIdx];
    const mergedItems: OrderItem[] = [...existingOrder.items];

    for (const newItem of orderItems) {
      const itemIdx = mergedItems.findIndex(
        (i) => i.id === newItem.id || i.name.trim().toLowerCase() === newItem.name.trim().toLowerCase()
      );
      if (itemIdx > -1) {
        const currentItem = mergedItems[itemIdx];
        const updatedQty = currentItem.quantity + newItem.quantity;
        mergedItems[itemIdx] = {
          ...currentItem,
          quantity: updatedQty,
          lineTotal: currentItem.unitPrice * updatedQty,
        };
      } else {
        mergedItems.push(newItem);
      }
    }

    const newTotal = mergedItems.reduce((sum, item) => sum + item.lineTotal, 0);

    const updatedOrder: Order = {
      ...existingOrder,
      items: mergedItems,
      total: newTotal,
      status: 'NEW',
      dateTime: `Today, ${timeStr}`,
    };

    orders[existingIdx] = updatedOrder;
    return;
  }

  // No active unpaid order -> create new bill
  const orderNum = `#ORD-${1000 + orders.length + 1}`;
  const total = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const newOrder: Order = {
    id: `ord-${Date.now()}-${Math.random()}`,
    orderNumber: orderNum,
    table: tableName,
    tableId: targetTableId,
    source: 'QR',
    customer: `QR Guest (${tableName})`,
    orderType: 'Dine In',
    items: orderItems,
    total,
    paymentStatus: 'UNPAID',
    status: 'NEW',
    dateTime: `Today, ${timeStr}`,
    note: 'Customer QR Order',
  };

  orders = [newOrder, ...orders];
};

// 1. First order at Table 01 (3 items, total $16.00)
handleSendOrderToKitchen('Table 01', 't1', [
  { id: 'item-1', name: 'ឡាបសាច់មាន់', quantity: 1, unitPrice: 6.00, lineTotal: 6.00 },
  { id: 'item-2', name: 'កង្កែបបំពងម្ទេសប្លោក', quantity: 1, unitPrice: 5.00, lineTotal: 5.00 },
  { id: 'item-3', name: 'ស្ពៃហ្គីថ៍', quantity: 1, unitPrice: 5.00, lineTotal: 5.00 },
]);

assert.strictEqual(orders.length, 1, 'Only 1 order card should exist');
assert.strictEqual(orders[0].orderNumber, '#ORD-1001');
assert.strictEqual(orders[0].total, 16.00);
assert.strictEqual(orders[0].items.length, 3);
assert.strictEqual(orders[0].paymentStatus, 'UNPAID');
console.log('✓ 1. Initial customer order at Table 01 created single bill #ORD-1001 ($16.00).');

// 2. Customer orders again for the same table (Table 01) while unpaid (adds 1 more of item-1 and 1 new drink)
handleSendOrderToKitchen('Table 01', 't1', [
  { id: 'item-1', name: 'ឡាបសាច់មាន់', quantity: 1, unitPrice: 6.00, lineTotal: 6.00 },
  { id: 'item-4', name: 'តែបៃតងទឹកកក', quantity: 2, unitPrice: 2.50, lineTotal: 5.00 },
]);

// Must STILL be 1 order card for Table 01 (merged into #ORD-1001)
assert.strictEqual(orders.length, 1, 'Must still be 1 single active bill for Table 01');
assert.strictEqual(orders[0].orderNumber, '#ORD-1001', 'Must remain #ORD-1001');
assert.strictEqual(orders[0].items.length, 4, 'Must have 4 distinct items total');
const labChicken = orders[0].items.find((i) => i.id === 'item-1');
assert.strictEqual(labChicken?.quantity, 2, 'Item 1 quantity increased from 1 to 2');
assert.strictEqual(labChicken?.lineTotal, 12.00, 'Item 1 line total updated to 12.00');
assert.strictEqual(orders[0].total, 27.00, 'Total updated to $27.00 ($16 + $6 + $5)');
console.log('✓ 2. Second order from same table cleanly merged into #ORD-1001 without creating duplicate cards.');

// 3. Customer pays bill #ORD-1001
orders[0].paymentStatus = 'PAID';
orders[0].status = 'Completed';
console.log('✓ 3. Table 01 order #ORD-1001 is now PAID.');

// 4. New round / customer at Table 01 orders after payment is complete
handleSendOrderToKitchen('Table 01', 't1', [
  { id: 'item-2', name: 'កង្កែបបំពងម្ទេសប្លោក', quantity: 1, unitPrice: 5.00, lineTotal: 5.00 },
]);

assert.strictEqual(orders.length, 2, 'Now 2 bills exist because previous was paid');
assert.strictEqual(orders[0].orderNumber, '#ORD-1002', 'New bill #ORD-1002 created for the new round');
assert.strictEqual(orders[0].total, 5.00);
assert.strictEqual(orders[0].paymentStatus, 'UNPAID');
assert.strictEqual(orders[1].orderNumber, '#ORD-1001');
assert.strictEqual(orders[1].paymentStatus, 'PAID');
console.log('✓ 4. After bill #ORD-1001 is paid, new order at Table 01 correctly creates 2nd bill #ORD-1002.');

console.log('\n✔ ALL 1-Table 1-Bill Workflow Tests Passed Successfully!\n');
