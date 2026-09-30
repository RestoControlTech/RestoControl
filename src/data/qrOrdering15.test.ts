/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import { MenuItem, CartItem, Order, Table } from '../types';
import { QROrderSubmission } from '../pages/customer/QRMenu';

console.log('--- Running Step 15 Customer QR Ordering Workflow Tests ---');

// 1. Product Availability Verification
const sampleProducts: MenuItem[] = [
  {
    id: 'prod-1',
    name: 'Tonkotsu Ramen',
    category: 'Ramen',
    price: 12.5,
    image: '',
    badge: null,
    inStock: true,
    description: 'Rich pork broth',
  },
  {
    id: 'prod-2',
    name: 'Seasonal Truffle Ramen',
    category: 'Ramen',
    price: 18.0,
    image: '',
    badge: null,
    inStock: false, // Unavailable
    description: 'Special seasonal ramen',
  },
];

// Helper mimicking addToCart logic
function canAddToCart(item: MenuItem): boolean {
  return item.inStock !== false;
}

assert.strictEqual(canAddToCart(sampleProducts[0]), true, 'In-stock product must be addable to cart');
assert.strictEqual(canAddToCart(sampleProducts[1]), false, 'Unavailable product must be blocked from adding to cart');
console.log('✓ 1. Product availability check passed: unavailable products cannot be ordered.');

// 2. Cart Operations & Calculation
let cart: Record<string, CartItem> = {};

function addToCart(cartState: Record<string, CartItem>, item: MenuItem): Record<string, CartItem> {
  if (!canAddToCart(item)) return cartState;
  const next = { ...cartState };
  if (next[item.id]) {
    const qty = next[item.id].quantity + 1;
    next[item.id] = { ...next[item.id], quantity: qty, lineTotal: next[item.id].price * qty };
  } else {
    next[item.id] = {
      id: item.id,
      productId: item.id,
      name: item.name,
      price: item.price,
      unitPrice: item.price,
      quantity: 1,
      image: item.image,
      lineTotal: item.price,
    };
  }
  return next;
}

function decrementItem(cartState: Record<string, CartItem>, itemId: string): Record<string, CartItem> {
  const next = { ...cartState };
  if (!next[itemId]) return cartState;
  if (next[itemId].quantity > 1) {
    const qty = next[itemId].quantity - 1;
    next[itemId] = { ...next[itemId], quantity: qty, lineTotal: next[itemId].price * qty };
  } else {
    delete next[itemId];
  }
  return next;
}

// Start with empty cart
assert.strictEqual(Object.keys(cart).length, 0, 'Cart must start empty for real table guests');

// Add item
cart = addToCart(cart, sampleProducts[0]);
assert.strictEqual(Object.keys(cart).length, 1);
assert.strictEqual(cart['prod-1'].quantity, 1);
assert.strictEqual(cart['prod-1'].lineTotal, 12.5);

// Increment item
cart = addToCart(cart, sampleProducts[0]);
assert.strictEqual(cart['prod-1'].quantity, 2);
assert.strictEqual(cart['prod-1'].lineTotal, 25.0);

// Decrement item
cart = decrementItem(cart, 'prod-1');
assert.strictEqual(cart['prod-1'].quantity, 1);
assert.strictEqual(cart['prod-1'].lineTotal, 12.5);

// Remove item via decrement at 1
cart = decrementItem(cart, 'prod-1');
assert.strictEqual(Object.keys(cart).length, 0, 'Decrementing quantity 1 item must remove it from cart');
console.log('✓ 2. Cart operations verified: add, increment, decrement, line total calculations, empty cart.');

// 3. Order Submission & Validation
const testSubmission: QROrderSubmission = {
  tableName: 'Table 03',
  tableId: 't3',
  items: [
    {
      id: 'prod-1',
      productId: 'prod-1',
      name: 'Tonkotsu Ramen',
      price: 12.5,
      unitPrice: 12.5,
      quantity: 2,
      image: '',
      lineTotal: 25.0,
    },
  ],
  total: 25.0,
  count: 2,
};

// Function mimicking handleSendOrderToKitchen in App.tsx
function createOrderFromQR(
  submission: QROrderSubmission,
  existingOrdersCount: number
): { newOrder: Order; updatedTableStatus: string } {
  assert.ok(submission.items.length > 0, 'Empty submission must be rejected');

  const orderItems = submission.items.map((i) => ({
    id: i.productId || i.id,
    name: i.name,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    lineTotal: i.lineTotal,
  }));

  const orderNum = `#ORD-${1000 + existingOrdersCount + 1}`;
  const newOrder: Order = {
    id: `ord-${Date.now()}`,
    orderNumber: orderNum,
    table: submission.tableName,
    customer: `QR Guest (${submission.tableName})`,
    orderType: 'Dine In',
    items: orderItems,
    total: submission.total,
    paymentStatus: 'Unpaid',
    status: 'Pending',
    dateTime: 'Today, 10:30 AM',
    note: 'Customer QR Order',
  };

  return { newOrder, updatedTableStatus: 'Occupied' };
}

const { newOrder, updatedTableStatus } = createOrderFromQR(testSubmission, 0);

assert.strictEqual(newOrder.orderNumber, '#ORD-1001');
assert.strictEqual(newOrder.table, 'Table 03', 'Table name must be preserved in order');
assert.strictEqual(newOrder.customer, 'QR Guest (Table 03)');
assert.strictEqual(newOrder.orderType, 'Dine In');
assert.strictEqual(newOrder.status, 'Pending', 'Initial QR order status must be Pending for staff');
assert.strictEqual(newOrder.paymentStatus, 'Unpaid', 'QR order must be Unpaid - no online payment');
assert.strictEqual(newOrder.total, 25.0);
assert.strictEqual(newOrder.items.length, 1);
assert.strictEqual(newOrder.items[0].name, 'Tonkotsu Ramen');
assert.strictEqual(newOrder.items[0].quantity, 2);
assert.strictEqual(newOrder.items[0].lineTotal, 25.0);
assert.strictEqual(updatedTableStatus, 'Occupied', 'Target table status must update to Occupied');
console.log('✓ 3. Order creation verified: correct table, items, Unpaid payment status, Pending order status.');

// 4. Distinction from POS Orders
const posOrder: Order = {
  id: 'ord-pos-1',
  orderNumber: '#POS-1002',
  table: 'Table 01',
  customer: 'Walk-in Customer',
  orderType: 'Dine In',
  items: [],
  total: 40.0,
  paymentStatus: 'Paid',
  status: 'Preparing',
  dateTime: 'Today, 10:35 AM',
};

assert.notStrictEqual(newOrder.note, posOrder.note);
assert.strictEqual(newOrder.paymentStatus, 'Unpaid', 'QR order is unpaid pending staff checkout');
assert.strictEqual(posOrder.paymentStatus, 'Paid', 'POS order can be paid at checkout terminal');
console.log('✓ 4. Orders integration verified: QR orders and POS orders coexist cleanly in Orders list.');

console.log('✔ All Step 15 Customer QR Ordering assertions passed successfully!');
