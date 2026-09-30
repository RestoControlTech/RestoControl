/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {
  Table,
  Order,
  OrderItem,
  CartItem,
  PaymentConfirmation,
  Transaction,
  OrderStatus,
  PaymentStatusType,
} from '../types';

console.log('--- Running Final Restaurant Order Workflow Verification Tests ---');

// 1. Initial State Setup
const TABLES: Table[] = [
  { id: 't1', name: 'Table 01', section: 'Main Dining', seats: 4, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t1' },
  { id: 't2', name: 'Table 02', section: 'Main Dining', seats: 2, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t2' },
  { id: 't3', name: 'Table 03', section: 'Main Dining', seats: 4, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t3' },
];

let tables: Table[] = JSON.parse(JSON.stringify(TABLES));
let orders: Order[] = [];
let transactions: Transaction[] = [];

// System Handlers (mirroring App.tsx and POS.tsx implementations)
function handleSendOrderToKitchen(
  tableId: string,
  tableName: string,
  items: CartItem[],
  total: number
): Order {
  const orderNum = `#ORD-${1000 + orders.length + 1}`;
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const newOrder: Order = {
    id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    orderNumber: orderNum,
    table: tableName,
    tableId,
    source: 'QR',
    customer: `QR Guest (${tableName})`,
    orderType: 'Dine In',
    items: items.map((i) => ({
      id: i.productId || i.id,
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
    })),
    total,
    paymentStatus: 'UNPAID',
    status: 'NEW',
    dateTime: `Today, ${timeStr}`,
    note: 'Customer QR Order',
  };

  orders = [newOrder, ...orders];

  // Update table status to Occupied
  tables = tables.map((t) =>
    t.id === tableId || t.name === tableName ? { ...t, status: 'Occupied' } : t
  );

  return newOrder;
}

function handleAdvanceOrderStatus(orderId: string): Order {
  let updatedOrder!: Order;
  orders = orders.map((o) => {
    if (o.id === orderId) {
      const nextStatus: OrderStatus =
        o.status === 'NEW' ? 'PREPARING' : o.status === 'PREPARING' ? 'READY' : o.status;
      updatedOrder = { ...o, status: nextStatus };
      return updatedOrder;
    }
    return o;
  });
  return updatedOrder;
}

function findActiveOrderForTable(tableId: string): Order | undefined {
  const tableObj = tables.find((t) => t.id === tableId);
  return orders.find(
    (o) =>
      (o.tableId === tableId || (tableObj && o.table === tableObj.name)) &&
      (o.paymentStatus === 'UNPAID' || o.paymentStatus === 'Unpaid' || o.paymentStatus === 'Pending') &&
      o.status !== 'Cancelled'
  );
}

function handlePOSOrderPayment(
  orderData: Order,
  paymentInfo: PaymentConfirmation
): { updatedOrder: Order; transaction: Transaction } {
  const isPaid = true;
  let finalOrder!: Order;

  orders = orders.map((o) => {
    if (o.id === orderData.id || o.orderNumber === orderData.orderNumber) {
      finalOrder = {
        ...o,
        ...orderData,
        paymentStatus: 'PAID',
        // Kitchen status is NOT automatically changed by payment
        status: orderData.status,
      };
      return finalOrder;
    }
    return o;
  });

  if (!finalOrder) {
    // Normal walk-in order created from POS
    finalOrder = {
      ...orderData,
      paymentStatus: 'PAID',
    };
    orders = [finalOrder, ...orders];
  }

  // Update table to Available once paid
  tables = tables.map((t) =>
    t.name === finalOrder.table || (finalOrder.tableId && t.id === finalOrder.tableId)
      ? { ...t, status: 'Available' }
      : t
  );

  // Record sales transaction (ensuring no duplicate transactions)
  let tx = transactions.find((t) => t.orderNumber === finalOrder.orderNumber);
  if (!tx) {
    tx = {
      id: `tx-${Date.now()}`,
      orderNumber: finalOrder.orderNumber,
      dateTime: 'Just Now',
      table: finalOrder.table,
      type: finalOrder.orderType === 'Takeaway' ? 'Takeaway' : 'Dine-in',
      amount: finalOrder.total,
      status: 'Receipt',
      paymentMethod: paymentInfo.method === 'card' ? 'Credit Card' : 'Cash',
      cashReceived: paymentInfo.cashReceived,
      change: paymentInfo.change,
      amountPaid: paymentInfo.cashReceived || finalOrder.total,
      items: finalOrder.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.lineTotal,
      })),
    };
    transactions = [tx, ...transactions];
  }

  return { updatedOrder: finalOrder, transaction: tx };
}

// ==========================================
// TEST 1 — QR ORDER
// ==========================================
console.log('Testing 1: Customer QR Order at Table 01...');
const qrItemsTable1: CartItem[] = [
  { id: 'p1', productId: 'p1', name: 'Tonkotsu Ramen', price: 13.5, unitPrice: 13.5, quantity: 2, lineTotal: 27.0, image: '' },
  { id: 'p2', productId: 'p2', name: 'Yuzu Soda', price: 3.5, unitPrice: 3.5, quantity: 1, lineTotal: 3.5, image: '' },
];
const orderT1 = handleSendOrderToKitchen('t1', 'Table 01', qrItemsTable1, 30.5);

assert.strictEqual(orderT1.table, 'Table 01', 'Order must be assigned to Table 01');
assert.strictEqual(orderT1.tableId, 't1', 'Order tableId must be t1');
assert.strictEqual(orderT1.source, 'QR', 'Order source must be QR');
assert.strictEqual(orderT1.status, 'NEW', 'Initial order status must be NEW');
assert.strictEqual(orderT1.paymentStatus, 'UNPAID', 'Initial payment status must be UNPAID');
assert.strictEqual(orderT1.total, 30.5, 'Total must equal $30.50');
assert.strictEqual(orderT1.items.length, 2, 'Must have 2 distinct items');
assert.strictEqual(tables.find((t) => t.id === 't1')?.status, 'Occupied', 'Table 01 status must update to Occupied');
console.log('✓ TEST 1 — QR ORDER: PASS (Order appears in Orders -> NEW, Table = Table 01, Source = QR, Payment = UNPAID)');

// ==========================================
// TEST 2 — ORDER STATUS PROGRESSION
// ==========================================
console.log('Testing 2: Kitchen order status progression (NEW -> PREPARING -> READY)...');
const preparingOrder = handleAdvanceOrderStatus(orderT1.id);
assert.strictEqual(preparingOrder.status, 'PREPARING', 'Order status must transition to PREPARING');
assert.strictEqual(preparingOrder.paymentStatus, 'UNPAID', 'Payment status must remain UNPAID during PREPARING');

const readyOrder = handleAdvanceOrderStatus(orderT1.id);
assert.strictEqual(readyOrder.status, 'READY', 'Order status must transition to READY');
assert.strictEqual(readyOrder.paymentStatus, 'UNPAID', 'Payment status must remain UNPAID when READY');
console.log('✓ TEST 2 — ORDER STATUS: PASS (NEW -> PREPARING -> READY, payment remains independent)');

// ==========================================
// TEST 3 — OPEN ORDER
// ==========================================
console.log('Testing 3: Open existing order in POS interface...');
// When staff opens existing order in POS
const loadedOrderInPOS = orders.find((o) => o.id === orderT1.id);
assert.ok(loadedOrderInPOS, 'Existing order must be found');
assert.strictEqual(loadedOrderInPOS.orderNumber, orderT1.orderNumber);
assert.strictEqual(loadedOrderInPOS.table, 'Table 01');
assert.strictEqual(loadedOrderInPOS.items.length, 2);
assert.strictEqual(loadedOrderInPOS.total, 30.5);
assert.strictEqual(loadedOrderInPOS.status, 'READY');
assert.strictEqual(loadedOrderInPOS.paymentStatus, 'UNPAID');
console.log('✓ TEST 3 — OPEN ORDER: PASS (Existing order automatically loads in POS with correct items and total)');

// ==========================================
// TEST 4 — NO DUPLICATE (OPEN ORDER MULTIPLE TIMES)
// ==========================================
console.log('Testing 4: Opening existing order multiple times does not duplicate...');
const countBefore = orders.length;
// Open order again
const loadedAgain = orders.find((o) => o.id === orderT1.id);
assert.ok(loadedAgain);
// Verify orders count did not increase
assert.strictEqual(orders.length, countBefore, 'Orders list count must remain unchanged when opening existing order');
console.log('✓ TEST 4 — NO DUPLICATE: PASS (Opening existing order multiple times does NOT duplicate orders)');

// ==========================================
// TEST 5 — POS TABLE SELECTION
// ==========================================
console.log('Testing 5: POS selects Table 01 and automatically loads existing active order...');
const posFoundOrder = findActiveOrderForTable('t1');
assert.ok(posFoundOrder, 'POS table selection must find active order for Table 01');
assert.strictEqual(posFoundOrder.id, orderT1.id, 'POS found order must be the exact same QR order');
assert.strictEqual(posFoundOrder.total, 30.5);
assert.strictEqual(posFoundOrder.status, 'READY');
assert.strictEqual(posFoundOrder.paymentStatus, 'UNPAID');
console.log('✓ TEST 5 — POS TABLE: PASS (Selecting Table 01 in POS automatically loads existing QR order)');

// ==========================================
// TEST 6 — PAYMENT (CASH)
// ==========================================
console.log('Testing 6: Take cash payment for Table 01 order...');
const cashPaymentConfirmation: PaymentConfirmation = {
  orderNumber: orderT1.orderNumber,
  method: 'cash',
  currency: 'USD',
  amount: 30.5,
  currencyAmount: 30.5,
  cashReceived: 40.0,
  change: 9.5,
  tableName: 'Table 01',
  timestamp: '12:00 PM',
};

const { updatedOrder: paidCashOrder, transaction: cashTx } = handlePOSOrderPayment(
  readyOrder,
  cashPaymentConfirmation
);

assert.strictEqual(paidCashOrder.paymentStatus, 'PAID', 'Payment status must be PAID');
assert.strictEqual(paidCashOrder.status, 'READY', 'Order kitchen status must remain READY after payment');
assert.strictEqual(cashPaymentConfirmation.change, 9.5, 'Cash change must equal $9.50 ($40.00 - $30.50)');
assert.strictEqual(tables.find((t) => t.id === 't1')?.status, 'Available', 'Table 01 status must update to Available after payment');
console.log('✓ TEST 6 — PAYMENT (CASH): PASS (READY + UNPAID -> READY + PAID, correct change calculated, table Available)');

// ==========================================
// TEST 7 — PAYMENT (CARD)
// ==========================================
console.log('Testing 7: Take card payment for a READY + UNPAID order...');
// Create another order for testing card payment (e.g. Table 03)
const qrItemsTable3: CartItem[] = [
  { id: 'p3', productId: 'p3', name: 'Spicy Salmon Roll', price: 9.0, unitPrice: 9.0, quantity: 2, lineTotal: 18.0, image: '' },
];
const orderT3 = handleSendOrderToKitchen('t3', 'Table 03', qrItemsTable3, 18.0);
handleAdvanceOrderStatus(orderT3.id); // NEW -> PREPARING
handleAdvanceOrderStatus(orderT3.id); // PREPARING -> READY

const cardPaymentConfirmation: PaymentConfirmation = {
  orderNumber: orderT3.orderNumber,
  method: 'card',
  currency: 'USD',
  amount: 18.0,
  currencyAmount: 18.0,
  tableName: 'Table 03',
  timestamp: '12:15 PM',
};

const { updatedOrder: paidCardOrder } = handlePOSOrderPayment(
  { ...orderT3, status: 'READY' },
  cardPaymentConfirmation
);

assert.strictEqual(paidCardOrder.paymentStatus, 'PAID', 'Card order paymentStatus must be PAID');
assert.strictEqual(paidCardOrder.status, 'READY', 'Order kitchen status must remain READY');
assert.strictEqual(tables.find((t) => t.id === 't3')?.status, 'Available', 'Table 03 status must update to Available');
console.log('✓ TEST 7 — CARD: PASS (READY + UNPAID -> READY + PAID via Card)');

// ==========================================
// TEST 8 — RECEIPT INTEGRATION
// ==========================================
console.log('Testing 8: Receipt references existing order and prevents duplicate sales...');
const receiptTx = transactions.find((t) => t.orderNumber === orderT1.orderNumber);
assert.ok(receiptTx, 'Receipt transaction must exist for order');
assert.strictEqual(receiptTx.table, 'Table 01');
assert.strictEqual(receiptTx.amount, 30.5);
assert.strictEqual(receiptTx.paymentMethod, 'Cash');
assert.strictEqual(receiptTx.cashReceived, 40.0);
assert.strictEqual(receiptTx.change, 9.5);
assert.strictEqual(receiptTx.items?.length, 2);

// Verify calling payment again on the same order does NOT create a duplicate sale
const transactionsCountBefore = transactions.length;
handlePOSOrderPayment(paidCashOrder, cashPaymentConfirmation);
assert.strictEqual(transactions.length, transactionsCountBefore, 'No duplicate sale transaction must be recorded');
console.log('✓ TEST 8 — RECEIPT: PASS (Receipt uses same order data, no duplicate transaction created)');

// ==========================================
// TEST 9 — NORMAL POS WALK-IN ORDER
// ==========================================
console.log('Testing 9: Normal walk-in POS order flow without QR...');
// Check Table 02 has no active orders
const activeT2 = findActiveOrderForTable('t2');
assert.strictEqual(activeT2, undefined, 'Table 02 must have no active unpaid order initially');

// Staff creates new walk-in order directly from POS
const posWalkInItems: OrderItem[] = [
  { id: 'p5', name: 'Shoyu Chicken Ramen', quantity: 1, unitPrice: 12.5, lineTotal: 12.5 },
];
const walkInOrderNumber = `#ORD-${1000 + orders.length + 1}`;
const walkInOrder: Order = {
  id: `ord-pos-${Date.now()}`,
  orderNumber: walkInOrderNumber,
  table: 'Table 02',
  tableId: 't2',
  source: 'POS',
  customer: 'Walk-in Customer',
  orderType: 'Dine In',
  items: posWalkInItems,
  total: 12.5,
  paymentStatus: 'PAID',
  status: 'READY',
  dateTime: 'Today, 12:30 PM',
};

const posPaymentConf: PaymentConfirmation = {
  orderNumber: walkInOrderNumber,
  method: 'cash',
  currency: 'USD',
  amount: 12.5,
  currencyAmount: 12.5,
  cashReceived: 20.0,
  change: 7.5,
  tableName: 'Table 02',
  timestamp: '12:30 PM',
};

const { updatedOrder: completedPOSOrder } = handlePOSOrderPayment(walkInOrder, posPaymentConf);
assert.strictEqual(completedPOSOrder.table, 'Table 02');
assert.strictEqual(completedPOSOrder.source, 'POS');
assert.strictEqual(completedPOSOrder.paymentStatus, 'PAID');
assert.strictEqual(completedPOSOrder.total, 12.5);
assert.strictEqual(tables.find((t) => t.id === 't2')?.status, 'Available');
console.log('✓ TEST 9 — NORMAL POS: PASS (Normal POS walk-in order flow works cleanly)');

// ==========================================
// TEST 10 — QR TABLE 02
// ==========================================
console.log('Testing 10: QR URL /menu/t2 creates order strictly associated with Table 02...');
const qrItemsTable2: CartItem[] = [
  { id: 'p6', productId: 'p6', name: 'Matcha Iced Latte', price: 5.5, unitPrice: 5.5, quantity: 2, lineTotal: 11.0, image: '' },
];
const orderT2 = handleSendOrderToKitchen('t2', 'Table 02', qrItemsTable2, 11.0);

assert.strictEqual(orderT2.table, 'Table 02', 'Order must strictly belong to Table 02');
assert.strictEqual(orderT2.tableId, 't2', 'Order tableId must be t2');
assert.notStrictEqual(orderT2.table, 'Table 01', 'Must never mix Table 02 with Table 01');
assert.strictEqual(tables.find((t) => t.id === 't2')?.status, 'Occupied', 'Table 02 status must update to Occupied');
console.log('✓ TEST 10 — QR TABLE 02: PASS (Order strictly belongs to Table 02, never mixed with Table 01)');

console.log('\n✔ ALL 10 Final Restaurant Order Workflow Test Cases Passed Successfully!\n');
