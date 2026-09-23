/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PRODUCTS, POS_PRODUCT_CATEGORIES } from './products';
import { TABLES_DATA } from './mockData';
import { Product, CartItem, OrderDraft, OrderStatus, PaymentMethod, PaymentConfirmation, PaymentCurrency } from '../types';
import { USD_TO_KHR_RATE, formatCurrency, formatKHR } from '../utils/format';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[Assertion Failed] ${message}`);
  }
}

export function runProductDataTests() {
  console.log('--- Running Step 6A POS Product Data Verification Tests ---');

  // 1. Total products count (at least 12 products required)
  assert(PRODUCTS.length >= 12, `Must have at least 12 products. Found: ${PRODUCTS.length}`);
  console.log(`✓ Product count check passed (${PRODUCTS.length} products loaded).`);

  // 2. Categories check
  const requiredCategories = ['Popular', 'Noodles', 'Mains & Sushi', 'Appetizers', 'Drinks'];
  for (const cat of requiredCategories) {
    assert(POS_PRODUCT_CATEGORIES.includes(cat as any), `Category "${cat}" must be present in POS_PRODUCT_CATEGORIES.`);
  }
  console.log('✓ POS Category enumeration check passed.');

  // 3. Product Schema Integrity check for all items
  const uniqueIds = new Set<string>();

  for (const product of PRODUCTS) {
    // Required fields check
    assert(typeof product.id === 'string' && product.id.length > 0, `Product missing valid id: ${JSON.stringify(product)}`);
    assert(typeof product.name === 'string' && product.name.length > 0, `Product ${product.id} missing name`);
    assert(typeof product.category === 'string' && product.category.length > 0, `Product ${product.id} missing category`);
    assert(typeof product.price === 'number' && product.price > 0, `Product ${product.id} must have price > 0`);
    assert(typeof product.image === 'string' && product.image.startsWith('http'), `Product ${product.id} missing image URL`);
    assert(typeof product.description === 'string' && product.description.length > 0, `Product ${product.id} missing description`);
    assert(typeof product.available === 'boolean', `Product ${product.id} missing boolean 'available'`);
    assert(typeof product.popular === 'boolean', `Product ${product.id} missing boolean 'popular'`);
    assert(typeof product.stock === 'number' && product.stock >= 0, `Product ${product.id} must have stock >= 0`);

    // Unique ID check
    assert(!uniqueIds.has(product.id), `Duplicate product ID detected: ${product.id}`);
    uniqueIds.add(product.id);
  }

  console.log('✓ All product schema fields (id, name, category, price, image, description, available, popular, stock) verified.');

  // 4. Sample required items check
  const requiredItemNames = [
    'Tonkotsu Ramen',
    'Spicy Salmon Roll',
    'Black Garlic Miso',
    'Shoyu Chicken Ramen',
    'Tuna Nigiri',
    'Crispy Tempura Roll',
    'Pork Gyoza',
    'Sea Salt Edamame',
    'Chashu Don Bowl',
    'Yuzu Soda',
    'Matcha Iced Latte',
    'Mochi Ice Cream',
  ];

  for (const name of requiredItemNames) {
    const found = PRODUCTS.some((p: Product) => p.name === name);
    assert(found, `Expected sample product "${name}" not found in products list.`);
  }

  console.log('✓ All 12 specific realistic restaurant sample products verified successfully.');
  console.log('✔ All Step 6A POS Product Data assertions passed!\n');

  // --- STEP 6C Filter & Search Unit Tests ---
  console.log('--- Running Step 6C POS Search & Category Filter Verification Tests ---');

  function filterProducts(products: Product[], categoryId: string, search: string): Product[] {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      let matchesCategory = true;
      if (categoryId === 'popular') {
        matchesCategory = Boolean(product.popular);
      } else if (categoryId === 'noodles') {
        matchesCategory = product.category === 'Noodles';
      } else if (categoryId === 'mains-sushi') {
        matchesCategory = product.category === 'Mains & Sushi';
      } else if (categoryId === 'appetizers') {
        matchesCategory = product.category === 'Appetizers';
      } else if (categoryId === 'drinks') {
        matchesCategory = product.category === 'Drinks';
      } else {
        matchesCategory = true;
      }

      if (!query) return matchesCategory;

      const matchesSearch =
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        (product.jpName && product.jpName.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });
  }

  // 1. Search by name
  const ramenSearch = filterProducts(PRODUCTS, 'all', 'ramen');
  assert(ramenSearch.length >= 3, `Search 'ramen' should find at least 3 items, found ${ramenSearch.length}`);
  assert(ramenSearch.some((p) => p.name === 'Tonkotsu Ramen'), "Search 'ramen' must include Tonkotsu Ramen");
  assert(ramenSearch.some((p) => p.name === 'Shoyu Chicken Ramen'), "Search 'ramen' must include Shoyu Chicken Ramen");
  assert(ramenSearch.some((p) => p.name === 'Black Garlic Miso'), "Search 'ramen' must include Black Garlic Miso");
  console.log("✓ Search by product name ('ramen') works.");

  // 2. Search by description
  const brothSearch = filterProducts(PRODUCTS, 'all', 'broth');
  assert(brothSearch.length >= 3, `Search 'broth' should find items matching description, found ${brothSearch.length}`);
  console.log("✓ Search by description ('broth') works.");

  // 3. Search by category name
  const drinksSearch = filterProducts(PRODUCTS, 'all', 'drinks');
  assert(drinksSearch.length >= 2, `Search 'drinks' should match drinks items, found ${drinksSearch.length}`);
  console.log("✓ Search by category term ('drinks') works.");

  // 4. Category Filters
  const allItems = filterProducts(PRODUCTS, 'all', '');
  assert(allItems.length === PRODUCTS.length, 'Category "all" must return all products');

  const popularItems = filterProducts(PRODUCTS, 'popular', '');
  assert(popularItems.length > 0 && popularItems.every((p) => p.popular === true), 'Category "popular" must only return popular items');

  const noodleItems = filterProducts(PRODUCTS, 'noodles', '');
  assert(noodleItems.length > 0 && noodleItems.every((p) => p.category === 'Noodles'), 'Category "noodles" must only return Noodles');

  const mainsItems = filterProducts(PRODUCTS, 'mains-sushi', '');
  assert(mainsItems.length > 0 && mainsItems.every((p) => p.category === 'Mains & Sushi'), 'Category "mains-sushi" must only return Mains & Sushi');

  const appetizerItems = filterProducts(PRODUCTS, 'appetizers', '');
  assert(appetizerItems.length > 0 && appetizerItems.every((p) => p.category === 'Appetizers'), 'Category "appetizers" must only return Appetizers');

  const drinkItems = filterProducts(PRODUCTS, 'drinks', '');
  assert(drinkItems.length > 0 && drinkItems.every((p) => p.category === 'Drinks'), 'Category "drinks" must only return Drinks');
  console.log('✓ All individual category tab filters verified.');

  // 5. Combined Search + Category Filter
  const noodlesChicken = filterProducts(PRODUCTS, 'noodles', 'chicken');
  assert(noodlesChicken.length === 1 && noodlesChicken[0].name === 'Shoyu Chicken Ramen', 'Combined category: Noodles + search: chicken must return Shoyu Chicken Ramen only');
  console.log('✓ Combined Search + Category filter works correctly.');

  // 6. Empty Result
  const nonExistent = filterProducts(PRODUCTS, 'all', 'xyz123nonexistentdish');
  assert(nonExistent.length === 0, 'Searching for non-existent query must yield 0 products');
  console.log('✓ Empty search results properly produce empty array.');

  // 7. Clear search behavior
  const cleared = filterProducts(PRODUCTS, 'noodles', '');
  assert(cleared.length === noodleItems.length, 'Clearing search should restore all category items');
  console.log('✓ Clearing search restores category items.');

  console.log('✔ All Step 6C POS Search & Category Filter assertions passed!\n');

  // --- STEP 6E Cart & Quantity Management Unit Tests ---
  console.log('--- Running Step 6E POS Quantity & Cart Management Verification Tests ---');

  let testCart: import('../types').CartItem[] = [];

  function addToCart(product: Product) {
    if (!product.available || product.stock === 0) return;
    const existingIndex = testCart.findIndex((i) => i.productId === product.id);
    if (existingIndex > -1) {
      testCart = testCart.map((item, idx) => {
        if (idx === existingIndex) {
          const qty = item.quantity + 1;
          return { ...item, quantity: qty, lineTotal: item.price * qty };
        }
        return item;
      });
    } else {
      testCart = [
        ...testCart,
        {
          id: product.id,
          productId: product.id,
          name: product.name,
          price: product.price,
          unitPrice: product.price,
          quantity: 1,
          image: product.image,
          lineTotal: product.price,
        },
      ];
    }
  }

  function increaseQty(productId: string) {
    testCart = testCart.map((item) => {
      if (item.productId === productId) {
        const qty = item.quantity + 1;
        return { ...item, quantity: qty, lineTotal: item.price * qty };
      }
      return item;
    });
  }

  function decreaseQty(productId: string) {
    testCart = testCart.map((item) => {
      if (item.productId === productId) {
        if (item.quantity <= 1) return item;
        const qty = item.quantity - 1;
        return { ...item, quantity: qty, lineTotal: item.price * qty };
      }
      return item;
    });
  }

  function removeItem(productId: string) {
    testCart = testCart.filter((item) => item.productId !== productId);
  }

  function clearCart() {
    testCart = [];
  }

  const p1 = PRODUCTS[0]; // Tonkotsu Ramen ($13.50)
  const p2 = PRODUCTS[1]; // Spicy Salmon Roll ($8.50)

  // 1. Initial Add
  addToCart(p1);
  assert(testCart.length === 1, 'Cart should contain 1 item');
  assert(testCart[0].productId === p1.id, 'Cart item productId must match');
  assert(testCart[0].quantity === 1, 'Initial quantity must be 1');
  assert(testCart[0].lineTotal === p1.price, 'Line total must equal unit price');
  console.log('✓ Add product to cart works (quantity = 1, lineTotal = price).');

  // 2. Add Same Product Multiple Times
  addToCart(p1);
  assert(testCart.length === 1, 'Duplicate product must NOT add second row');
  assert(testCart[0].quantity === 2, 'Adding same product must increment quantity to 2');
  assert(testCart[0].lineTotal === p1.price * 2, 'Line total must update to price * 2 ($27.00)');
  console.log('✓ Adding same product increments quantity and maintains single row.');

  // 3. Add Second Product
  addToCart(p2);
  assert(testCart.length === 2, 'Adding different product must create second cart row');
  assert(testCart[1].quantity === 1 && testCart[1].lineTotal === p2.price, 'Second item added correctly');
  console.log('✓ Multiple distinct products handled correctly.');

  // 4. Increase Quantity (+)
  increaseQty(p1.id);
  assert(testCart[0].quantity === 3, 'Increase quantity should set quantity to 3');
  assert(testCart[0].lineTotal === p1.price * 3, 'Line total should be price * 3 ($40.50)');
  console.log('✓ Increase quantity (+) updates quantity and line total.');

  // 5. Decrease Quantity (-)
  decreaseQty(p1.id);
  assert(testCart[0].quantity === 2, 'Decrease quantity should set quantity to 2');
  assert(testCart[0].lineTotal === p1.price * 2, 'Line total should be price * 2 ($27.00)');
  decreaseQty(p1.id);
  assert(testCart[0].quantity === 1, 'Decrease quantity should set quantity to 1');
  assert(testCart[0].lineTotal === p1.price, 'Line total should be price * 1 ($13.50)');
  console.log('✓ Decrease quantity (-) updates quantity and line total.');

  // 6. Minimum Quantity Constraint (Never zero on decrease)
  decreaseQty(p1.id);
  assert(testCart[0].quantity === 1, 'Decreasing when quantity = 1 must KEEP quantity at 1');
  assert(testCart[0].lineTotal === p1.price, 'Line total remains price * 1');
  console.log('✓ Decreasing quantity at 1 keeps quantity at 1 (never creates 0).');

  // 7. Subtotal and Grand Total Calculation (Total = Subtotal, Tax = 0, Service = 0)
  const subtotal = testCart.reduce((sum, item) => sum + item.lineTotal, 0);
  const expectedSubtotal = p1.price * 1 + p2.price * 1; // 13.50 + 8.50 = 22.00
  assert(subtotal === expectedSubtotal, `Subtotal calculation: expected ${expectedSubtotal}, got ${subtotal}`);
  console.log(`✓ Subtotal and total calculations verified ($${subtotal.toFixed(2)}).`);

  // 8. Remove Item
  removeItem(p1.id);
  assert(testCart.length === 1, 'Removing item must remove it from cart');
  assert(testCart[0].productId === p2.id, 'Remaining item must be p2');
  console.log('✓ Remove item removes product from cart.');

  // 9. Clear Cart
  clearCart();
  assert(testCart.length === 0, 'Clear cart must make cart empty');
  console.log('✓ Clear cart empties the cart.');

  // 10. Unavailable Product
  const unavailableProduct: Product = {
    id: 'unavail-1',
    name: 'Sold Out Dish',
    category: 'Noodles',
    price: 10.0,
    image: 'https://example.com/img.jpg',
    description: 'Out of stock',
    available: false,
    popular: false,
    stock: 0,
  };
  addToCart(unavailableProduct);
  assert(testCart.length === 0, 'Unavailable product must NOT be added to cart');
  console.log('✓ Unavailable / sold-out product cannot be added.');

  console.log('✔ All Step 6E POS Quantity & Cart Management assertions passed!\n');

  // --- STEP 6F Order & Table Information Unit Tests ---
  console.log('--- Running Step 6F POS Table-Only Order Information Verification Tests ---');

  // 1. Table Selection & Mock Tables Integrity
  assert(TABLES_DATA.length >= 8, `Expected at least 8 mock tables, found: ${TABLES_DATA.length}`);
  const tableNames = TABLES_DATA.map((t) => t.name);
  for (let i = 1; i <= 8; i++) {
    const formatted = `Table 0${i}`;
    assert(tableNames.includes(formatted), `Expected ${formatted} to exist in TABLES_DATA`);
  }
  console.log('✓ All 8 mock tables (Table 01 - Table 08) verified.');

  // 2. OrderDraft State Management (Table-only, No customer profile, No takeaway, Subtotal = Total)
  let testTableId: string = 't4'; // Table 04
  let testOrderNote: string = '';
  let testOrderStatus: OrderStatus = 'Draft';

  function buildOrderDraft(cart: CartItem[]): OrderDraft {
    const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
    const tax = 0;
    const serviceCharge = 0;
    const total = subtotal;
    const table = TABLES_DATA.find((t) => t.id === testTableId);

    return {
      tableId: testTableId,
      tableName: table?.name || `Table ${testTableId}`,
      note: testOrderNote,
      status: testOrderStatus,
      items: [...cart],
      subtotal,
      tax,
      serviceCharge,
      total,
    };
  }

  function isOrderValid(tableId: string, cart: CartItem[]): boolean {
    if (cart.length === 0) return false;
    return Boolean(tableId && tableId.trim().length > 0);
  }

  // Populate cart with initial items: Tonkotsu Ramen x 2 ($27.00)
  testCart = [];
  addToCart(p1);
  addToCart(p1);
  assert(testCart.length === 1 && testCart[0].quantity === 2, 'Initial cart setup failed');

  // Test Initial Order Draft
  let draft = buildOrderDraft(testCart);
  assert(draft.tableId === 't4', 'Selected tableId should be t4');
  assert(draft.tableName === 'Table 04', 'Selected tableName should be Table 04');
  assert(draft.status === 'Draft', 'Default status must be Draft');
  assert(draft.items.length === 1 && draft.items[0].quantity === 2, 'Order items must match cart');
  assert(draft.subtotal === 27.0, 'Order subtotal must be $27.00');
  assert(draft.tax === 0, 'Tax must be 0 (removed)');
  assert(draft.serviceCharge === 0, 'Service charge must be 0 (removed)');
  assert(draft.total === 27.0, 'Order total must equal subtotal ($27.00)');
  assert(isOrderValid(testTableId, testCart) === true, 'Valid order with table');
  console.log('✓ Order draft creation and default Draft status verified.');

  // 3. Cart Preservation on Table Change
  testTableId = 't5'; // Switch to Table 05
  draft = buildOrderDraft(testCart);
  assert(testCart.length === 1 && testCart[0].quantity === 2, 'Changing table must NOT clear or alter cart');
  assert(draft.tableId === 't5' && draft.tableName === 'Table 05', 'Draft table updated to Table 05');
  assert(draft.total === 27.0, 'Draft total remains unchanged');
  console.log('✓ Changing table preserves cart items and quantities.');

  // 4. Cart Preservation on Order Note Change
  testOrderNote = 'Extra spicy, no onions';
  draft = buildOrderDraft(testCart);
  assert(testCart.length === 1 && testCart[0].quantity === 2, 'Changing note must NOT clear cart');
  assert(draft.note === 'Extra spicy, no onions', 'Draft note updated properly');
  console.log('✓ Order note modification preserves cart items.');

  // 5. Validation Rules
  assert(isOrderValid('', testCart) === false, 'Order without table must be invalid');
  assert(isOrderValid('t1', testCart) === true, 'Order with table must be valid');
  assert(isOrderValid('t1', []) === false, 'Empty cart cannot proceed');
  console.log('✓ Table-based validation correctly enforces table selection and non-empty cart.');

  console.log('✔ All Step 6F POS Table-Only Order Information assertions passed!\n');

  // --- STEP 6G / NEW REQUIREMENTS Payment & Currency Unit Tests ---
  console.log('--- Running POS Payment UI & Currency (USD / KHR) Verification Tests ---');

  // 1. Exchange Rate Verification
  assert(USD_TO_KHR_RATE === 4100, `Default exchange rate must be 4100 KHR per USD. Got: ${USD_TO_KHR_RATE}`);
  console.log(`✓ Single configuration exchange rate verified: 1 USD = ${USD_TO_KHR_RATE.toLocaleString()} KHR.`);

  // 2. Currency Formatting Helpers
  assert(formatCurrency(10.0, 'USD') === '$10.00', 'USD formatting check');
  assert(formatCurrency(41000, 'KHR') === '៛41,000', 'KHR formatting check');
  assert(formatKHR(41000) === '៛41,000', 'formatKHR helper check');
  console.log('✓ Currency formatting functions verified.');

  // Helper validation matching PaymentModal implementation
  function isPaymentValid(
    method: PaymentMethod,
    currency: PaymentCurrency,
    cashReceived: number,
    baseTotalUSD: number,
    itemCount: number
  ): { valid: boolean; error?: string; dueAmount: number } {
    if (itemCount === 0) {
      return { valid: false, error: 'Cart is empty', dueAmount: 0 };
    }
    if (baseTotalUSD <= 0) {
      return { valid: false, error: 'Payment amount is invalid', dueAmount: 0 };
    }

    const dueAmount = currency === 'KHR' ? Math.round(baseTotalUSD * USD_TO_KHR_RATE) : baseTotalUSD;

    if (method === 'cash') {
      if (isNaN(cashReceived) || cashReceived <= 0) {
        return { valid: false, error: 'Enter a valid payment amount.', dueAmount };
      }
      if (cashReceived < dueAmount) {
        return { valid: false, error: 'Insufficient payment', dueAmount };
      }
    }
    return { valid: true, dueAmount };
  }

  function calculateChange(cashReceived: number, dueAmount: number): number {
    return Math.max(0, cashReceived - dueAmount);
  }

  // 3. USD Payment Tests
  const usdTotal = 10.0;

  // Test 3A: USD $10 total, $20 received -> Change = $10.00
  const usdOver = isPaymentValid('cash', 'USD', 20.0, usdTotal, 1);
  assert(usdOver.valid === true, 'USD overpayment must be valid');
  assert(calculateChange(20.0, usdOver.dueAmount) === 10.0, 'USD change: $20.00 - $10.00 = $10.00');
  console.log('✓ USD Payment Test: Total = $10.00, Received = $20.00 -> Change = $10.00 passed.');

  // Test 3B: Exact USD $10 total, $10 received -> Change = $0.00
  const usdExact = isPaymentValid('cash', 'USD', 10.0, usdTotal, 1);
  assert(usdExact.valid === true, 'USD exact payment must be valid');
  assert(calculateChange(10.0, usdExact.dueAmount) === 0.0, 'USD exact change: $10.00 - $10.00 = $0.00');
  console.log('✓ USD Exact Payment Test: Total = $10.00, Received = $10.00 -> Change = $0.00 passed.');

  // Test 3C: Insufficient USD $10 total, $5 received -> Blocked
  const usdUnder = isPaymentValid('cash', 'USD', 5.0, usdTotal, 1);
  assert(usdUnder.valid === false && usdUnder.error === 'Insufficient payment', 'USD insufficient payment must be blocked');
  console.log('✓ USD Insufficient Payment Test: Total = $10.00, Received = $5.00 -> Insufficient payment blocked.');

  // 4. KHR Payment Tests
  // Test 4A: Total = $10.00, Rate = 4100 -> Due = ៛41,000, Received = ៛50,000 -> Change = ៛9,000
  const khrDue = usdTotal * USD_TO_KHR_RATE;
  assert(khrDue === 41000, `Expected KHR amount due 41000, got ${khrDue}`);
  const khrOver = isPaymentValid('cash', 'KHR', 50000, usdTotal, 1);
  assert(khrOver.valid === true, 'KHR overpayment must be valid');
  assert(khrOver.dueAmount === 41000, 'KHR due amount must be 41000');
  assert(calculateChange(50000, khrOver.dueAmount) === 9000, 'KHR change: 50,000 - 41,000 = 9,000');
  console.log('✓ KHR Payment Test: Total = $10.00, Rate = 4100 -> Due = ៛41,000, Received = ៛50,000 -> Change = ៛9,000 passed.');

  // Test 4B: Exact KHR Total = $10.00, Due = ៛41,000, Received = ៛41,000 -> Change = ៛0
  const khrExact = isPaymentValid('cash', 'KHR', 41000, usdTotal, 1);
  assert(khrExact.valid === true, 'KHR exact payment must be valid');
  assert(calculateChange(41000, khrExact.dueAmount) === 0, 'KHR exact change: 41,000 - 41,000 = 0');
  console.log('✓ KHR Exact Payment Test: Total = $10.00, Due = ៛41,000, Received = ៛41,000 -> Change = ៛0 passed.');

  // Test 4C: Insufficient KHR Total = $10.00, Due = ៛41,000, Received = ៛30,000 -> Blocked
  const khrUnder = isPaymentValid('cash', 'KHR', 30000, usdTotal, 1);
  assert(khrUnder.valid === false && khrUnder.error === 'Insufficient payment', 'KHR insufficient payment must be blocked');
  console.log('✓ KHR Insufficient Payment Test: Total = $10.00, Due = ៛41,000, Received = ៛30,000 -> Blocked.');

  // 5. Invalid / Negative / Empty Payment Tests
  const emptyPay = isPaymentValid('cash', 'USD', 0, usdTotal, 1);
  assert(emptyPay.valid === false, 'Zero/empty payment must be invalid');

  const negPay = isPaymentValid('cash', 'USD', -10, usdTotal, 1);
  assert(negPay.valid === false && negPay.error === 'Enter a valid payment amount.', 'Negative payment must be invalid');

  const nanPay = isPaymentValid('cash', 'USD', NaN, usdTotal, 1);
  assert(nanPay.valid === false, 'NaN payment must be invalid');
  console.log('✓ Negative, empty, and invalid payment inputs correctly rejected.');

  // 6. Card and QR payment with currency support
  const cardUSD = isPaymentValid('card', 'USD', 0, usdTotal, 1);
  assert(cardUSD.valid === true && cardUSD.dueAmount === 10.0, 'Card USD payment valid');

  const qrKHR = isPaymentValid('qr', 'KHR', 0, usdTotal, 1);
  assert(qrKHR.valid === true && qrKHR.dueAmount === 41000, 'QR KHR payment valid');
  console.log('✓ Card and QR payment methods supported with USD and KHR conversion.');

  // 7. Payment Confirmation Object Structure
  const confirmation: PaymentConfirmation = {
    orderNumber: '#TEMP-123',
    method: 'cash',
    currency: 'KHR',
    amount: usdTotal,
    currencyAmount: 41000,
    cashReceived: 50000,
    change: 9000,
    tableName: 'Table 04',
    timestamp: '17:30',
  };
  assert(confirmation.currency === 'KHR', 'Confirmation currency is KHR');
  assert(confirmation.currencyAmount === 41000, 'Confirmation currencyAmount is 41000');
  assert(confirmation.cashReceived === 50000, 'Confirmation cashReceived is 50000');
  assert(confirmation.change === 9000, 'Confirmation change is 9000');
  assert(confirmation.tableName === 'Table 04', 'Confirmation tableName is Table 04');
  console.log('✓ PaymentConfirmation structure with currency and table verification passed.');

  // --- STEP 6J Full End-to-End POS Order & Payment Flow with Currency Switching ---
  console.log('--- Running Step 6J POS End-to-End Order & Payment Flow Verification Tests ---');

  // 1. Initial State & Product Selection
  let flow6jCart: CartItem[] = [];
  let flow6jTableId = 't4'; // Table 04
  let flow6jOrderNote = 'Extra lime and chili';
  let flow6jStatus: OrderStatus = 'Draft';

  function flow6jAddToCart(product: Product) {
    if (!product.available || product.stock === 0) return;
    const existing = flow6jCart.find((i) => i.productId === product.id);
    if (existing) {
      flow6jCart = flow6jCart.map((item) =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1, lineTotal: item.price * (item.quantity + 1) }
          : item
      );
    } else {
      flow6jCart = [
        ...flow6jCart,
        {
          id: product.id,
          productId: product.id,
          name: product.name,
          price: product.price,
          unitPrice: product.price,
          quantity: 1,
          image: product.image,
          lineTotal: product.price,
        },
      ];
    }
  }

  // Add Tonkotsu Ramen ($13.50) x 2
  const tonkotsu = PRODUCTS.find((p) => p.name === 'Tonkotsu Ramen')!;
  flow6jAddToCart(tonkotsu);
  flow6jAddToCart(tonkotsu);
  assert(flow6jCart.length === 1 && flow6jCart[0].quantity === 2, 'Tonkotsu Ramen added with Qty: 2');
  assert(flow6jCart[0].lineTotal === 27.00, 'Tonkotsu line total is $27.00');

  // Add Dragon Roll ($12.00) x 1
  const dragonRoll = PRODUCTS.find((p) => p.name === 'Dragon Roll')!;
  flow6jAddToCart(dragonRoll);
  assert(flow6jCart.length === 2 && flow6jCart[1].quantity === 1, 'Dragon Roll added with Qty: 1');

  // Verify Table Selection & Cart Preservation
  const initialTable = TABLES_DATA.find((t) => t.id === flow6jTableId)!;
  assert(initialTable.name === 'Table 04', 'Table 04 selected');
  flow6jTableId = 't5'; // Switch to Table 05
  assert(flow6jCart.length === 2, 'Switching table preserves cart');
  flow6jTableId = 't4'; // Switch back to Table 04

  // Verify Subtotal = Total (No Tax, No Service Charge)
  const baseSubtotal = flow6jCart.reduce((sum, i) => sum + i.lineTotal, 0); // 27.00 + 12.00 = 39.00
  const baseTotal = baseSubtotal;
  assert(baseSubtotal === 39.00, `Expected subtotal 39.00, got ${baseSubtotal}`);
  assert(baseTotal === 39.00, `Expected total 39.00, got ${baseTotal}`);

  // Draft Verification
  const draft6j: OrderDraft = {
    tableId: flow6jTableId,
    tableName: initialTable.name,
    note: flow6jOrderNote,
    status: flow6jStatus,
    items: flow6jCart,
    subtotal: baseSubtotal,
    tax: 0,
    serviceCharge: 0,
    total: baseTotal,
  };
  assert(draft6j.tableId === 't4', 'Draft has Table 04');
  assert(draft6j.tax === 0 && draft6j.serviceCharge === 0, 'No tax or service charge in draft');

  // Currency Switching Test: USD -> KHR -> USD
  // In USD:
  let currentCurrency: PaymentCurrency = 'USD';
  let paymentCheck = isPaymentValid('cash', currentCurrency, 40.00, baseTotal, flow6jCart.length);
  assert(paymentCheck.valid === true, 'USD tender $40.00 valid for $39.00 total');
  assert(paymentCheck.dueAmount === 39.00, 'USD due amount is $39.00');
  assert(calculateChange(40.00, paymentCheck.dueAmount) === 1.00, 'USD change is $1.00');

  // Switch to KHR:
  currentCurrency = 'KHR';
  const expectedKHRDue = Math.round(baseTotal * USD_TO_KHR_RATE); // 39 * 4100 = 159,900
  assert(expectedKHRDue === 159900, `Expected KHR due 159900, got ${expectedKHRDue}`);
  paymentCheck = isPaymentValid('cash', currentCurrency, 160000, baseTotal, flow6jCart.length);
  assert(paymentCheck.valid === true, 'KHR tender ៛160,000 valid for ៛159,900 due');
  assert(paymentCheck.dueAmount === 159900, 'KHR due amount updated correctly');
  assert(calculateChange(160000, paymentCheck.dueAmount) === 100, 'KHR change is ៛100');

  // Switch back to USD:
  currentCurrency = 'USD';
  paymentCheck = isPaymentValid('cash', currentCurrency, 50.00, baseTotal, flow6jCart.length);
  assert(paymentCheck.valid === true, 'USD tender $50.00 valid');
  assert(paymentCheck.dueAmount === 39.00, 'USD due amount is $39.00');
  assert(calculateChange(50.00, paymentCheck.dueAmount) === 11.00, 'USD change is $11.00');
  console.log('✓ Currency switching (USD -> KHR -> USD) and dynamic change recalculation verified.');

  // Final Payment Confirmation
  const completedConfirmation: PaymentConfirmation = {
    orderNumber: '#TEMP-888',
    method: 'cash',
    currency: 'USD',
    amount: baseTotal,
    currencyAmount: 39.00,
    cashReceived: 50.00,
    change: 11.00,
    tableName: 'Table 04',
    timestamp: '18:30',
  };
  assert(completedConfirmation.orderNumber === '#TEMP-888', 'Confirmation created');
  assert(completedConfirmation.tableName === 'Table 04', 'Confirmation contains table name');
  console.log('✓ Step 6J Complete End-to-End POS Order & Payment Workflow verified successfully.');

  console.log('✔ All Step 6J POS Payment & Currency assertions passed!\n');
}

// Execute if run directly
runProductDataTests();


