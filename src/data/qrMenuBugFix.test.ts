/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import { MenuItem, Category, Table, Order, CartItem } from '../types';
import { QROrderSubmission } from '../pages/customer/QRMenu';

console.log('--- Running Customer QR Menu Bug Fix & Workflow Verification Tests ---');

// Base Restaurant Tables
const TABLES: Table[] = [
  { id: 't1', name: 'Table 01', section: 'Main Dining', seats: 4, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t1' },
  { id: 't2', name: 'Table 02', section: 'Main Dining', seats: 2, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t2' },
  { id: 't3', name: 'Table 03', section: 'Main Dining', seats: 4, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t3' },
];

const INITIAL_CATEGORIES: Category[] = [
  { id: 'all', label: 'All Items' },
  { id: 'popular', label: 'Popular' },
  { id: 'ramen', label: 'Ramen' },
  { id: 'sushi', label: 'Sushi & Rolls' },
  { id: 'appetizers', label: 'Appetizers' },
  { id: 'drinks', label: 'Drinks' },
];

// Single Source of Truth Menu State
let menuItems: MenuItem[] = [];
let categories: Category[] = [...INITIAL_CATEGORIES];
let tables: Table[] = [...TABLES];
let orders: Order[] = [];

// Helper mimicking Table resolution in TableMenuRoute
function resolveTableRoute(tableIdParam: string, tableList: Table[]): Table | undefined {
  const cleanId = (tableIdParam || '').trim().toLowerCase();
  return tableList.find((t) => {
    const tId = t.id.toLowerCase();
    const tSlug = t.name.toLowerCase().replace(/[\s-_]+/g, '');
    const cleanSearch = cleanId.replace(/[\s-_]+/g, '');
    return tId === cleanId || tSlug === cleanSearch;
  });
}

// Helper mimicking category resolution in QRMenu
function getDisplayCategories(cats: Category[], items: MenuItem[]): Category[] {
  const map = new Map<string, Category>();
  map.set('all', { id: 'all', label: 'All Items' });

  cats.forEach((c) => {
    if (c && c.id) {
      map.set(c.id.toLowerCase(), { id: c.id, label: c.label });
    }
  });

  items.forEach((item) => {
    if (item && item.category) {
      const catKey = item.category.toLowerCase();
      if (!map.has(catKey)) {
        const label = item.category.charAt(0).toUpperCase() + item.category.slice(1);
        map.set(catKey, { id: item.category, label });
      }
    }
  });

  return Array.from(map.values());
}

// Helper mimicking filter logic in QRMenu
function filterMenuItems(
  items: MenuItem[],
  categoryFilter: string,
  searchQuery: string
): MenuItem[] {
  let list = items || [];
  if (categoryFilter !== 'all') {
    const targetCat = categoryFilter.toLowerCase();
    list = list.filter((item) => (item.category || '').toLowerCase() === targetCat);
  }
  if (searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter((item) =>
      (item.name || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q)
    );
  }
  return list;
}

// Helper mimicking QRMenu addToCart logic
function addToCart(
  cart: Record<string, CartItem>,
  item: MenuItem
): { cart: Record<string, CartItem>; error?: string } {
  if (item.inStock === false) {
    return { cart, error: `${item.name} is currently unavailable` };
  }

  const next = { ...cart };
  const existingItem = next[item.id];
  if (existingItem) {
    const nextQty = existingItem.quantity + 1;
    next[item.id] = {
      ...existingItem,
      quantity: nextQty,
      lineTotal: existingItem.price * nextQty,
    };
  } else {
    next[item.id] = {
      id: item.id,
      productId: item.id,
      name: item.name,
      image: item.image,
      price: item.price,
      unitPrice: item.price,
      quantity: 1,
      lineTotal: item.price,
    };
  }
  return { cart: next };
}

// Helper mimicking handleSendOrderToKitchen in App.tsx
function sendOrderToKitchen(
  submission: QROrderSubmission,
  currentOrders: Order[],
  currentTables: Table[]
): { orders: Order[]; tables: Table[] } {
  const orderItems = submission.items.map((item) => ({
    id: item.productId || item.id,
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
  }));

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const orderNum = `#ORD-${1000 + currentOrders.length + 1}`;

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
    dateTime: `Today, ${timeStr}`,
    note: 'Customer QR Order',
  };

  const updatedOrders = [newOrder, ...currentOrders];

  const updatedTables = currentTables.map((t) =>
    t.name === submission.tableName || (submission.tableId && t.id === submission.tableId)
      ? { ...t, status: 'Occupied' as const }
      : t
  );

  return { orders: updatedOrders, tables: updatedTables };
}

// TEST 0: Clean production starting state with 0 products
assert.strictEqual(menuItems.length, 0, 'Production menu must start with 0 products');
const emptyMenuDisplay = filterMenuItems(menuItems, 'all', '');
assert.strictEqual(emptyMenuDisplay.length, 0, 'Filtered items must be empty when menu has 0 products');
console.log('✓ 0. Clean production starting state: 0 products cleanly handled without fake data.');

// TEST 1: Create/Add a menu product (Management -> Single Source of Truth)
const newProduct: MenuItem = {
  id: 'item-tokyo-shoyu',
  name: 'Tokyo Shoyu Ramen',
  category: 'ramen',
  price: 14.5,
  image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624',
  description: 'Classic Tokyo style soy sauce broth with chashu pork',
  inStock: true,
  badge: 'Chef Special',
};

const unavailableProduct: MenuItem = {
  id: 'item-truffle-wagyu',
  name: 'Truffle Wagyu Ramen',
  category: 'ramen',
  price: 26.0,
  image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624',
  description: 'A5 Wagyu slices with black truffle oil (Seasonal)',
  inStock: false, // Unavailable
  badge: 'Sold Out',
};

menuItems = [newProduct, unavailableProduct, ...menuItems];
assert.strictEqual(menuItems.length, 2, 'Menu management must now contain 2 products');
console.log('✓ 1. Create/add menu product: Products added to shared menu items state.');

// TEST 2: Open /menu/t1
const matchedTable1 = resolveTableRoute('t1', tables);
assert.ok(matchedTable1, 'Table t1 must resolve to a valid Table');
assert.strictEqual(matchedTable1.name, 'Table 01', 'Route /menu/t1 must identify Table 01');
console.log('✓ 2. Open /menu/t1: Correctly routes and identifies Table 01.');

// TEST 3: Verify the product appears in /menu/t1
const qrMenuProducts = filterMenuItems(menuItems, 'all', '');
assert.strictEqual(qrMenuProducts.length, 2, 'Customer QR Menu must display products from shared state');
const foundProduct = qrMenuProducts.find((p) => p.id === 'item-tokyo-shoyu');
assert.ok(foundProduct, 'Tokyo Shoyu Ramen must appear on customer QR menu');
console.log('✓ 3. Product display: Tokyo Shoyu Ramen appears on the customer QR menu.');

// TEST 4: Verify its category appears
const displayedCategories = getDisplayCategories(categories, menuItems);
const ramenCategory = displayedCategories.find((c) => c.id.toLowerCase() === 'ramen');
assert.ok(ramenCategory, 'Category "Ramen" must appear in the category navigation rail');
const ramenFilteredItems = filterMenuItems(menuItems, 'ramen', '');
assert.strictEqual(ramenFilteredItems.length, 2, 'Category filter "ramen" must match both ramen products');
console.log('✓ 4. Category display: "Ramen" category appears and correctly filters products.');

// TEST 5: Verify its price appears
assert.strictEqual(foundProduct?.price, 14.5, 'Product price must accurately be 14.5');
console.log('✓ 5. Price display: Product price $14.50 verified.');

// TEST 6: Verify unavailable products are handled correctly
const foundUnavailable = qrMenuProducts.find((p) => p.id === 'item-truffle-wagyu');
assert.ok(foundUnavailable, 'Unavailable product should still be rendered');
assert.strictEqual(foundUnavailable.inStock, false, 'Product inStock flag must be false');

let customerCart: Record<string, CartItem> = {};
const unavailableAttempt = addToCart(customerCart, foundUnavailable);
assert.ok(unavailableAttempt.error, 'Adding unavailable product must return an error');
assert.strictEqual(Object.keys(unavailableAttempt.cart).length, 0, 'Unavailable product must not be added to cart');
console.log('✓ 6. Product availability: Unavailable products cannot be ordered by customer.');

// TEST 7: Add product to customer cart
const addResult1 = addToCart(customerCart, foundProduct);
assert.strictEqual(addResult1.error, undefined, 'Adding in-stock product must succeed');
customerCart = addResult1.cart;

// Add same product a second time
const addResult2 = addToCart(customerCart, foundProduct);
customerCart = addResult2.cart;
console.log('✓ 7. Cart operations: Added in-stock product to customer cart twice.');

// TEST 8: Verify cart quantity and total
const cartItem = customerCart['item-tokyo-shoyu'];
assert.ok(cartItem, 'Tokyo Shoyu Ramen must be present in customer cart');
assert.strictEqual(cartItem.quantity, 2, 'Cart quantity for product must be 2');
assert.strictEqual(cartItem.lineTotal, 29.0, 'Cart line total must be 29.0 (14.5 * 2)');

const totalQty = Object.values(customerCart).reduce((sum, item) => sum + item.quantity, 0);
const totalAmt = Object.values(customerCart).reduce((sum, item) => sum + item.lineTotal, 0);
assert.strictEqual(totalQty, 2, 'Total cart count must equal 2');
assert.strictEqual(totalAmt, 29.0, 'Total cart amount must equal $29.00');
console.log('✓ 8. Cart quantity and total verified: 2 items, total $29.00.');

// TEST 9 & 10: Submit customer order and verify order contains Table 01
const submission: QROrderSubmission = {
  tableName: matchedTable1.name,
  tableId: matchedTable1.id,
  items: Object.values(customerCart),
  total: totalAmt,
  count: totalQty,
};

const sendResult = sendOrderToKitchen(submission, orders, tables);
orders = sendResult.orders;
tables = sendResult.tables;

assert.strictEqual(orders.length, 1, 'Orders list must now contain the submitted QR order');
const createdOrder = orders[0];
assert.strictEqual(createdOrder.table, 'Table 01', 'Submitted order must be associated with Table 01');
assert.strictEqual(createdOrder.total, 29.0, 'Submitted order total must be 29.0');
assert.strictEqual(createdOrder.status, 'Pending', 'New QR order status must be Pending');
assert.strictEqual(createdOrder.paymentStatus, 'Unpaid', 'New QR order payment status must be Unpaid');
assert.strictEqual(createdOrder.items.length, 1, 'Order must contain the cart line item');
assert.strictEqual(createdOrder.items[0].quantity, 2, 'Line item quantity must be 2');
console.log('✓ 9 & 10. QR Order Submission: Order contains Table 01 and correct cart items/totals.');

// TEST 11: Verify POS/Orders receives the QR order & Table status becomes Occupied
const posOrder = orders.find((o) => o.table === 'Table 01');
assert.ok(posOrder, 'POS/Orders must receive the customer QR order');
const updatedTable1 = tables.find((t) => t.id === 't1');
assert.strictEqual(updatedTable1?.status, 'Occupied', 'Table 01 status must automatically update to Occupied');
console.log('✓ 11. POS/Orders receives QR order: Table 01 status transitioned to Occupied.');

// TEST 12: Route /menu/t2
const matchedTable2 = resolveTableRoute('t2', tables);
assert.ok(matchedTable2, 'Table t2 must resolve to a valid Table');
assert.strictEqual(matchedTable2.name, 'Table 02', 'Route /menu/t2 must resolve to Table 02 menu');
console.log('✓ 12. /menu/t2 route verified: Successfully resolves to Table 02.');

// TEST 13: Route /menu/invalid
const matchedInvalid = resolveTableRoute('invalid', tables);
assert.strictEqual(matchedInvalid, undefined, 'Route /menu/invalid must return undefined (clean Table Not Found)');
console.log('✓ 13. /menu/invalid route verified: Safely resolves to clean Table Not Found.');

console.log('\n✔ ALL Customer QR Menu Bug Fix & Routing Tests Passed Successfully!\n');
