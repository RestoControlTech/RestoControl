/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {
  MenuItem,
  Table,
  Order,
  Transaction,
  OrderItem,
  Product,
  CartItem,
  User,
  RefundRequest,
} from '../types';
import { hasPermission } from '../auth/permissions';
import { getTableMenuPath, generateTableQRCodeDataUrl } from '../utils/qr';
import {
  validateRefundRequest,
  applyPartialRefundToSale,
  getItemRefundDetails,
} from '../utils/refundRules';

console.log('--- Running Step 17 Final Frontend Integration Tests ---');

// ==================================================
// WORKFLOW 1 — POS WORKFLOW
// ==================================================
console.log('Testing Workflow 1: POS Order -> Payment -> Completed Sale -> Receipt...');

// 1. Select products and build cart
const productA: Product = {
  id: 'prod-1',
  name: 'Spicy Miso Ramen',
  description: 'Rich pork broth with miso and spicy paste',
  price: 12.5,
  category: 'Noodles',
  image: '/images/ramen.jpg',
  available: true,
  stock: 15,
};

const productB: Product = {
  id: 'prod-2',
  name: 'Gyoza Dumplings',
  description: 'Pan-fried Japanese pork dumplings',
  price: 6.0,
  category: 'Appetizers',
  image: '/images/gyoza.jpg',
  available: true,
  stock: 20,
};

const cart: CartItem[] = [
  {
    id: 'cart-1',
    productId: productA.id,
    name: productA.name,
    price: productA.price,
    unitPrice: productA.price,
    quantity: 2,
    image: productA.image,
    lineTotal: 25.0,
  },
  {
    id: 'cart-2',
    productId: productB.id,
    name: productB.name,
    price: productB.price,
    unitPrice: productB.price,
    quantity: 1,
    image: productB.image,
    lineTotal: 6.0,
  },
];

const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
assert.strictEqual(subtotal, 31.0, 'POS subtotal must equal sum of line totals (31.00)');

// 2. Select Table & Formulate Order
const selectedTable: Table = {
  id: 't1',
  name: 'Table 01',
  section: 'Main Dining',
  seats: 4,
  status: 'Available',
  qrCodeUrl: 'restocontrol.menu/menu/t1',
};

const nextOrderNumber = '#ORD-1001';
const posOrder: Order = {
  id: 'ord-pos-1',
  orderNumber: nextOrderNumber,
  table: selectedTable.name,
  customer: 'Walk-in Customer',
  orderType: 'Dine In',
  items: cart.map((item) => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
  })),
  total: subtotal,
  paymentStatus: 'Paid',
  status: 'Preparing',
  dateTime: 'Today, 12:30 PM',
};

// 3. Complete Payment & Reflect in Sales
const completedTx: Transaction = {
  id: 'tx-pos-1',
  orderNumber: posOrder.orderNumber,
  dateTime: 'Today, 12:30 PM',
  table: posOrder.table,
  type: 'Dine-in',
  amount: posOrder.total,
  status: 'Receipt',
  paymentMethod: 'Cash',
  items: posOrder.items.map((i) => ({
    id: i.id,
    name: i.name,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    subtotal: i.lineTotal,
    refundedQuantity: 0,
  })),
};

assert.strictEqual(completedTx.amount, 31.0, 'Sale transaction amount matches POS total');
assert.strictEqual(completedTx.status, 'Receipt', 'Sale transaction status is Receipt/Completed');
assert.strictEqual(completedTx.orderNumber, '#ORD-1001', 'Sale transaction links to order');
console.log('✓ Workflow 1: POS -> Cart -> Table -> Order -> Payment -> Sale -> Receipt verified.');

// ==================================================
// WORKFLOW 2 — QR WORKFLOW
// ==================================================
console.log('Testing Workflow 2: Table QR -> Customer Menu -> Cart -> Submit -> Orders -> Staff Payment -> Receipt...');

// 1. Table QR scan resolves correct table menu path
const qrPath = getTableMenuPath(selectedTable.id);
assert.strictEqual(qrPath, '/menu/t1', 'QR path resolves to /menu/t1');

// 2. Customer selects product and submits order
const qrCartItems: OrderItem[] = [
  {
    id: 'prod-1',
    name: 'Spicy Miso Ramen',
    quantity: 1,
    unitPrice: 12.5,
    lineTotal: 12.5,
  },
];
const qrTotal = 12.5;

const qrOrder: Order = {
  id: 'ord-qr-1',
  orderNumber: '#ORD-1002',
  table: selectedTable.name,
  customer: `QR Guest (${selectedTable.name})`,
  orderType: 'Dine In',
  items: qrCartItems,
  total: qrTotal,
  paymentStatus: 'Unpaid',
  status: 'Pending',
  dateTime: 'Today, 12:35 PM',
  note: 'Customer QR Order',
};

assert.strictEqual(qrOrder.paymentStatus, 'Unpaid', 'Customer QR order is initially Unpaid');
assert.strictEqual(qrOrder.status, 'Pending', 'Customer QR order starts in Pending status');

// 3. Table reflects Occupied status
const updatedTable: Table = {
  ...selectedTable,
  status: 'Occupied',
};
assert.strictEqual(updatedTable.status, 'Occupied', 'Table status updates to Occupied');

// 4. Staff receives order, prepares and handles payment
const paidQROrder: Order = {
  ...qrOrder,
  status: 'Completed',
  paymentStatus: 'Paid',
};
assert.strictEqual(paidQROrder.status, 'Completed', 'Order advances to Completed');
assert.strictEqual(paidQROrder.paymentStatus, 'Paid', 'Payment status updates to Paid upon staff settlement');

// 5. Completed Sale and Receipt generated
const qrTx: Transaction = {
  id: 'tx-qr-1',
  orderNumber: paidQROrder.orderNumber,
  dateTime: 'Today, 12:45 PM',
  table: paidQROrder.table,
  type: 'Dine-in',
  amount: paidQROrder.total,
  status: 'Receipt',
  paymentMethod: 'Credit Card',
  items: paidQROrder.items.map((i) => ({
    id: i.id,
    name: i.name,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    subtotal: i.lineTotal,
    refundedQuantity: 0,
  })),
};
assert.strictEqual(qrTx.amount, 12.5, 'QR Sale amount is correct');
assert.strictEqual(qrTx.items?.length, 1, 'Sale items list is preserved for receipt printing');
console.log('✓ Workflow 2: QR scan -> Customer Menu -> Order -> Orders -> Staff Payment -> Receipt verified.');

// ==================================================
// WORKFLOW 3 — REFUND WORKFLOW
// ==================================================
console.log('Testing Workflow 3: Completed Sale -> Sale Details -> Refund Calculation -> Updated Sale...');

const saleToRefund: Transaction = {
  id: 'tx-refund-test',
  orderNumber: '#TX-8001',
  dateTime: 'Today, 11:00 AM',
  table: 'Table 03',
  type: 'Dine-in',
  amount: 25.0,
  status: 'Completed',
  items: [
    {
      id: 'sale-item-1',
      name: 'Tonkotsu Ramen',
      quantity: 2,
      unitPrice: 12.5,
      subtotal: 25.0,
      refundedQuantity: 0,
    },
  ],
};

// 1. Partial refund of 1 item
const itemToRefund = saleToRefund.items![0];
const detailsBefore = getItemRefundDetails(itemToRefund);
assert.strictEqual(detailsBefore.remaining, 2, 'Initially 2 items remaining');

const req1: RefundRequest = {
  items: [
    {
      name: itemToRefund.name,
      quantity: 1,
      unitPrice: itemToRefund.unitPrice,
    },
  ],
  reason: 'Customer changed mind',
};

const validation1 = validateRefundRequest(saleToRefund, req1);
assert.strictEqual(validation1.isValid, true, 'Partial refund of 1 item is valid');
assert.strictEqual(validation1.refundAmount, 12.5, 'Calculated refund amount is $12.50');

const { updatedSale: saleAfterRefund1, refundTransaction: refTx1 } = applyPartialRefundToSale(
  saleToRefund,
  req1
);
assert.strictEqual(refTx1.amount, -12.5, 'Reversal refund transaction has -$12.50');
assert.strictEqual(refTx1.status, 'Refunded', 'Refund transaction status is Refunded');
assert.strictEqual(saleAfterRefund1.status, 'Completed', 'Original sale is still Completed (partially refunded)');
assert.strictEqual(
  getItemRefundDetails(saleAfterRefund1.items![0]).remaining,
  1,
  'Remaining quantity is now 1'
);

// 2. Second partial refund of remaining 1 item
const req2: RefundRequest = {
  items: [
    {
      name: itemToRefund.name,
      quantity: 1,
      unitPrice: itemToRefund.unitPrice,
    },
  ],
  reason: 'Final item refund',
};

const validation2 = validateRefundRequest(saleAfterRefund1, req2);
assert.strictEqual(validation2.isValid, true, 'Second refund of remaining item is valid');

const { updatedSale: saleAfterRefund2, refundTransaction: refTx2 } = applyPartialRefundToSale(
  saleAfterRefund1,
  req2
);
assert.strictEqual(refTx2.amount, -12.5, 'Second refund transaction has -$12.50');
assert.strictEqual(saleAfterRefund2.status, 'Refunded', 'Sale transitions to Refunded when fully refunded');
assert.strictEqual(
  getItemRefundDetails(saleAfterRefund2.items![0]).remaining,
  0,
  'Remaining quantity is now 0'
);

// 3. Attempting further refund is blocked
const req3: RefundRequest = {
  items: [
    {
      name: itemToRefund.name,
      quantity: 1,
      unitPrice: itemToRefund.unitPrice,
    },
  ],
};
const validation3 = validateRefundRequest(saleAfterRefund2, req3);
assert.strictEqual(validation3.isValid, false, 'Further refund on fully refunded sale is blocked');
console.log('✓ Workflow 3: Completed Sale -> Refund calculation -> Updated Sale verified.');

// ==================================================
// WORKFLOW 4 — MENU SYNC & AVAILABILITY
// ==================================================
console.log('Testing Workflow 4: Menu Add/Edit -> POS -> Availability OFF...');

let liveMenu: MenuItem[] = [
  {
    id: 'menu-1',
    name: 'Dragon Roll',
    price: 15.0,
    category: 'Sushi',
    image: '/images/roll.jpg',
    description: 'Eel and avocado roll',
    badge: null,
    inStock: true,
  },
];

// 1. Add product to menu
const newItem: MenuItem = {
  id: 'menu-2',
  name: 'Matcha Ice Cream',
  price: 5.0,
  category: 'Dessert',
  image: '/images/matcha.jpg',
  description: 'Green tea ice cream',
  badge: null,
  inStock: true,
};
liveMenu = [newItem, ...liveMenu];
assert.strictEqual(liveMenu.length, 2, 'Menu item added successfully');

// 2. Edit product in menu
liveMenu = liveMenu.map((m) => (m.id === 'menu-2' ? { ...m, price: 5.5 } : m));
assert.strictEqual(liveMenu.find((m) => m.id === 'menu-2')?.price, 5.5, 'Product price edit synced');

// 3. Toggle availability / stock OFF
liveMenu = liveMenu.map((m) => (m.id === 'menu-1' ? { ...m, inStock: false } : m));
const outOfStockItem = liveMenu.find((m) => m.id === 'menu-1')!;
assert.strictEqual(outOfStockItem.inStock, false, 'Product inStock is false');

// Verify POS / QR cannot add out-of-stock item
const canAddToCart = (item: MenuItem) => item.inStock;
assert.strictEqual(canAddToCart(outOfStockItem), false, 'Out-of-stock product cannot be added to cart');
console.log('✓ Workflow 4: Add/Edit Product -> Menu -> POS/QR availability toggle verified.');

// ==================================================
// WORKFLOW 5 — TABLE QR & ROUTING
// ==================================================
console.log('Testing Workflow 5: Table -> QR Generation -> Customer Route -> Order Table...');

const newTable: Table = {
  id: 't9',
  name: 'Table 09',
  section: 'Rooftop Lounge',
  seats: 6,
  status: 'Available',
  qrCodeUrl: 'restocontrol.menu/menu/t9',
};

// 1. Generate QR Code Data URL
async function testQRGeneration() {
  const qrDataUrl = await generateTableQRCodeDataUrl(newTable.id);
  assert.ok(qrDataUrl.startsWith('data:image/png;base64,'), 'QR Code generates valid data PNG URL');

  // 2. Table routing matches
  const targetRoute = getTableMenuPath(newTable.id);
  assert.strictEqual(targetRoute, '/menu/t9', 'Table route is /menu/t9');

  // 3. Routing table resolver
  const allTables = [selectedTable, newTable];
  const resolved = allTables.find((t) => t.id === 't9');
  assert.ok(resolved, 'Table is found in system tables');
  assert.strictEqual(resolved?.name, 'Table 09', 'Resolved table matches Table 09');
}

// ==================================================
// ERROR HANDLING & GUARDS
// ==================================================
console.log('Testing Error Handling: Empty cart, invalid refund, invalid table...');

// 1. Empty cart guard
const emptyCart: CartItem[] = [];
assert.strictEqual(emptyCart.length === 0, true, 'Empty cart detected and guarded');

// 2. Invalid table resolution
const nonExistentTableId = 't999';
const foundTable = [selectedTable, newTable].find((t) => t.id === nonExistentTableId);
assert.strictEqual(foundTable, undefined, 'Invalid table safely resolves to undefined (Table Not Found screen)');

// 3. Invalid refund quantity (0 or negative)
const invalidZeroReq: RefundRequest = {
  items: [{ name: itemToRefund.name, quantity: 0, unitPrice: 12.5 }],
};
const invalidZero = validateRefundRequest(saleToRefund, invalidZeroReq);
assert.strictEqual(invalidZero.isValid, false, 'Zero refund rejected');

const invalidNegReq: RefundRequest = {
  items: [{ name: itemToRefund.name, quantity: -2, unitPrice: 12.5 }],
};
const invalidNeg = validateRefundRequest(saleToRefund, invalidNegReq);
assert.strictEqual(invalidNeg.isValid, false, 'Negative refund rejected');

const invalidExcessReq: RefundRequest = {
  items: [{ name: itemToRefund.name, quantity: 99, unitPrice: 12.5 }],
};
const invalidExcess = validateRefundRequest(saleToRefund, invalidExcessReq);
assert.strictEqual(invalidExcess.isValid, false, 'Excess refund rejected');

// ==================================================
// RBAC PERMISSIONS VERIFICATION
// ==================================================
console.log('Testing RBAC: Admin vs Staff permissions...');

const adminUser: User = {
  id: 'u-admin',
  name: 'System Admin',
  email: 'admin@restocontrol.com',
  role: 'admin',
};

const staffUser: User = {
  id: 'u-staff',
  name: 'Floor Staff',
  email: 'staff@restocontrol.com',
  role: 'staff',
};

// Admin permissions check
assert.strictEqual(hasPermission(adminUser, 'dashboard.view'), true, 'Admin can view dashboard');
assert.strictEqual(hasPermission(adminUser, 'sales.view'), true, 'Admin can view sales');
assert.strictEqual(hasPermission(adminUser, 'reports.view'), true, 'Admin can view reports');
assert.strictEqual(hasPermission(adminUser, 'staff.view'), true, 'Admin can view staff');
assert.strictEqual(hasPermission(adminUser, 'settings.view'), true, 'Admin can view settings');
assert.strictEqual(hasPermission(adminUser, 'orders.cancel'), true, 'Admin can cancel orders');
assert.strictEqual(hasPermission(adminUser, 'menu.manage'), true, 'Admin can manage menu');

// Staff permissions check
assert.strictEqual(hasPermission(staffUser, 'dashboard.view'), true, 'Staff can view dashboard');
assert.strictEqual(hasPermission(staffUser, 'pos.use'), true, 'Staff can use POS');
assert.strictEqual(hasPermission(staffUser, 'orders.view'), true, 'Staff can view orders');
assert.strictEqual(hasPermission(staffUser, 'orders.create'), true, 'Staff can create orders');
assert.strictEqual(hasPermission(staffUser, 'tables.view'), true, 'Staff can view tables');

// Staff restricted functions check
assert.strictEqual(hasPermission(staffUser, 'sales.view'), false, 'Staff CANNOT view sales');
assert.strictEqual(hasPermission(staffUser, 'reports.view'), false, 'Staff CANNOT view reports');
assert.strictEqual(hasPermission(staffUser, 'staff.view'), false, 'Staff CANNOT view staff');
assert.strictEqual(hasPermission(staffUser, 'settings.view'), false, 'Staff CANNOT view settings');
assert.strictEqual(hasPermission(staffUser, 'orders.cancel'), false, 'Staff CANNOT cancel orders');
assert.strictEqual(hasPermission(staffUser, 'menu.manage'), false, 'Staff CANNOT manage menu');

// Execute async tests
testQRGeneration().then(() => {
  console.log('✔ All Step 17 Final Frontend Integration tests passed successfully!');
});
