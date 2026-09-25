/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import { Transaction, SaleItem, RefundRequest } from '../types';
import {
  getFullRefundQuantity,
  getFullRefundAmount,
  canApplyFullRefund,
  calculateItemFullRefundAmount,
  getRefundableQuantity,
  getRefundableAmount,
} from '../utils/refundUtils';
import {
  applyPartialRefundToSale,
  validateRefundRequest,
  isSaleEligibleForRefund,
} from '../utils/refundRules';

console.log('--- Running Step 9F-4A Full Refund Business Logic Verification Tests ---');

// Helper to create test transaction
function createTestSale(items: SaleItem[], totalAmount: number): Transaction {
  return {
    id: 'tx-full-refund-test-1',
    orderNumber: '#ORD-FULL-001',
    dateTime: 'Oct 24, 23:00',
    table: 'Table 05',
    type: 'Dine-in',
    amount: totalAmount,
    status: 'Receipt',
    paymentStatus: 'Paid',
    paymentMethod: 'Credit Card',
    customerName: 'Diana Prince',
    currency: 'USD',
    items,
    subtotal: totalAmount,
    amountPaid: totalAmount,
  };
}

// =========================================================================
// 1. Full refund with no previous refund
// =========================================================================
{
  const item: SaleItem = { name: 'Dragon Roll', quantity: 5, unitPrice: 10.00, subtotal: 50.00 };
  const sale = createTestSale([item], 50.00);

  const fullQty = getFullRefundQuantity(item.quantity, item.refundedQuantity);
  const fullAmt = getFullRefundAmount(sale.amount, sale.refundedAmount);
  const canRefund = canApplyFullRefund(item.quantity, item.refundedQuantity);

  assert.strictEqual(fullQty, 5, 'Full refund quantity with 0 previous refunds must be 5');
  assert.strictEqual(fullAmt, 50.00, 'Full refund amount with 0 previous refunds must be 50.00');
  assert.strictEqual(canRefund, true, 'Sale must be eligible for full refund');

  // Apply the full refund
  const request: RefundRequest = {
    items: [{ name: item.name, quantity: fullQty, unitPrice: item.unitPrice }],
    reason: 'Full order return',
  };
  const { updatedSale, refundTransaction } = applyPartialRefundToSale(sale, request);

  assert.strictEqual(refundTransaction.amount, -50.00, 'Reversal transaction must equal -$50.00');
  assert.strictEqual(updatedSale.items![0].refundedQuantity, 5, 'Item refundedQuantity must equal original quantity');
  assert.strictEqual(
    getFullRefundQuantity(updatedSale.items![0].quantity, updatedSale.items![0].refundedQuantity),
    0,
    'Remaining refundable quantity must now be 0'
  );
  assert.strictEqual(updatedSale.refundedAmount, 50.00, 'Cumulative refundedAmount must equal 50.00');
  assert.strictEqual(updatedSale.status, 'Refunded', 'Sale status transitions to Refunded');
  assert.strictEqual(updatedSale.paymentStatus, 'Refunded', 'Payment status transitions to Refunded');

  console.log('✓ 1. Full refund with no previous refund verified');
}

// =========================================================================
// 2. Full refund after a partial refund
// =========================================================================
{
  // Original: 5 items @ $10 = $50
  // Partial refund #1: 2 items @ $10 = $20
  // Remaining: 3 items @ $10 = $30
  const item: SaleItem = { name: 'Tonkotsu Ramen', quantity: 5, unitPrice: 10.00, subtotal: 50.00 };
  const sale = createTestSale([item], 50.00);

  // Partial refund #1
  const { updatedSale: saleAfterPartial } = applyPartialRefundToSale(sale, {
    items: [{ name: item.name, quantity: 2 }],
  });

  const updatedItem = saleAfterPartial.items![0];
  const fullQtyAfterPartial = getFullRefundQuantity(updatedItem.quantity, updatedItem.refundedQuantity);
  const fullAmtAfterPartial = getFullRefundAmount(saleAfterPartial.amount, saleAfterPartial.refundedAmount);

  assert.strictEqual(fullQtyAfterPartial, 3, 'Full refund after partial refund (5 - 2) must be 3, NOT 5');
  assert.strictEqual(fullAmtAfterPartial, 30.00, 'Full refund amount after partial refund ($50 - $20) must be $30');

  // Complete the full refund of remaining 3 items
  const { updatedSale: saleAfterFull, refundTransaction: secondRefundTx } = applyPartialRefundToSale(
    saleAfterPartial,
    {
      items: [{ name: item.name, quantity: fullQtyAfterPartial }],
      reason: 'Remaining items returned',
    }
  );

  assert.strictEqual(secondRefundTx.amount, -30.00, 'Second reversal amount must be -$30.00');
  assert.strictEqual(saleAfterFull.items![0].refundedQuantity, 5, 'Cumulative refunded quantity is 5');
  assert.strictEqual(saleAfterFull.refundedAmount, 50.00, 'Cumulative refunded amount is 50.00');
  assert.strictEqual(
    getFullRefundQuantity(saleAfterFull.items![0].quantity, saleAfterFull.items![0].refundedQuantity),
    0,
    'Remaining quantity must be 0'
  );
  assert.strictEqual(saleAfterFull.status, 'Refunded');

  console.log('✓ 2. Full refund after a partial refund (correctly refunds only remaining balance) verified');
}

// =========================================================================
// 3. Full refund after multiple partial refunds
// =========================================================================
{
  // Original: 6 items @ $8.00 = $48.00
  // Partial refund #1: 1 item ($8.00) -> 5 remaining ($40.00)
  // Partial refund #2: 2 items ($16.00) -> 3 remaining ($24.00)
  // Full refund: remaining 3 items ($24.00) -> 0 remaining ($0.00)
  const item: SaleItem = { name: 'Gyoza', quantity: 6, unitPrice: 8.00, subtotal: 48.00 };
  const initialSale = createTestSale([item], 48.00);

  // Partial #1
  const { updatedSale: afterStep1 } = applyPartialRefundToSale(initialSale, {
    items: [{ name: 'Gyoza', quantity: 1 }],
  });

  // Partial #2
  const { updatedSale: afterStep2 } = applyPartialRefundToSale(afterStep1, {
    items: [{ name: 'Gyoza', quantity: 2 }],
  });

  const step2Item = afterStep2.items![0];
  const fullQty = getFullRefundQuantity(step2Item.quantity, step2Item.refundedQuantity);
  const fullAmt = getFullRefundAmount(afterStep2.amount, afterStep2.refundedAmount);

  assert.strictEqual(fullQty, 3, 'Remaining quantity after 2 partial refunds (6 - 1 - 2) must be 3');
  assert.strictEqual(fullAmt, 24.00, 'Remaining refundable amount after 2 partial refunds must be 24.00');

  // Full refund of remaining 3
  const { updatedSale: finalSale, refundTransaction: finalRefTx } = applyPartialRefundToSale(afterStep2, {
    items: [{ name: 'Gyoza', quantity: fullQty }],
  });

  assert.strictEqual(finalRefTx.amount, -24.00);
  assert.strictEqual(finalSale.items![0].refundedQuantity, 6);
  assert.strictEqual(finalSale.refundedAmount, 48.00);
  assert.strictEqual(
    getFullRefundQuantity(finalSale.items![0].quantity, finalSale.items![0].refundedQuantity),
    0
  );
  assert.strictEqual(finalSale.status, 'Refunded');

  console.log('✓ 3. Full refund after multiple partial refunds verified');
}

// =========================================================================
// 4. Already fully refunded item returns quantity 0
// =========================================================================
{
  const originalQty = 5;
  const alreadyRefunded = 5;

  const remQty = getFullRefundQuantity(originalQty, alreadyRefunded);
  const remAmt = getFullRefundAmount(50.00, 50.00);
  const canRefund = canApplyFullRefund(originalQty, alreadyRefunded);
  const lineAmt = calculateItemFullRefundAmount(10.00, originalQty, alreadyRefunded);

  assert.strictEqual(remQty, 0, 'Fully refunded item must return quantity 0');
  assert.strictEqual(remAmt, 0.00, 'Fully refunded amount must return 0.00');
  assert.strictEqual(canRefund, false, 'canApplyFullRefund must return false when exhausted');
  assert.strictEqual(lineAmt, 0, 'calculateItemFullRefundAmount must return 0 when exhausted');

  console.log('✓ 4. Already fully refunded item returns quantity 0 verified');
}

// =========================================================================
// 5. Full refund amount is correct
// =========================================================================
{
  // Test calculateItemFullRefundAmount: unitPrice * remainingQuantity
  const itemPrice = 14.50;
  const originalQty = 4;
  const refundedQty = 1; // 3 remaining

  const lineAmt = calculateItemFullRefundAmount(itemPrice, originalQty, refundedQty);
  assert.strictEqual(lineAmt, 43.50, '14.50 * 3 must equal 43.50');

  // Multi-item transaction full refund amount calculation
  const totalAmount = 95.00;
  const cumulativeRefunded = 35.00;
  const expectedRemaining = 60.00;

  assert.strictEqual(
    getFullRefundAmount(totalAmount, cumulativeRefunded),
    expectedRemaining,
    '95.00 - 35.00 must equal 60.00'
  );

  // KHR currency rounding
  const khrTotal = 120000;
  const khrRefunded = 40000;
  assert.strictEqual(getFullRefundAmount(khrTotal, khrRefunded), 80000);

  console.log('✓ 5. Full refund amount calculation verified');
}

// =========================================================================
// 6. No negative quantity
// =========================================================================
{
  assert.strictEqual(getFullRefundQuantity(5, 8), 0, 'Refunded > original must clamp to 0');
  assert.strictEqual(getFullRefundQuantity(-5, 0), 0, 'Negative original quantity must return 0');
  assert.strictEqual(getFullRefundQuantity(5, -2), 5, 'Negative refunded quantity input clamped safely');
  assert.strictEqual(getFullRefundAmount(50.00, 75.00), 0.00, 'Refunded > total amount must clamp to 0.00');
  assert.strictEqual(getFullRefundAmount(-50.00, 0), 0.00, 'Negative total amount must return 0.00');

  console.log('✓ 6. No negative quantity or amount invariant verified');
}

// =========================================================================
// 7. No over-refund
// =========================================================================
{
  const item: SaleItem = { name: 'Sashimi Combo', quantity: 3, unitPrice: 20.00, subtotal: 60.00 };
  const sale = createTestSale([item], 60.00);

  // 1. Partial refund 2
  const { updatedSale: sale1 } = applyPartialRefundToSale(sale, {
    items: [{ name: item.name, quantity: 2 }],
  });

  const remaining = getFullRefundQuantity(sale1.items![0].quantity, sale1.items![0].refundedQuantity);
  assert.strictEqual(remaining, 1);

  // 2. Attempting to refund full original quantity (3) instead of remaining (1) must be REJECTED
  const invalidRequest: RefundRequest = {
    items: [{ name: item.name, quantity: 3 }],
  };
  const val = validateRefundRequest(sale1, invalidRequest);
  assert.strictEqual(val.isValid, false, 'Refund of original quantity after partial refund must be rejected');
  assert(
    val.error?.includes('exceeds remaining sold quantity (1)'),
    'Validation error states excess quantity'
  );

  assert.throws(() => {
    applyPartialRefundToSale(sale1, invalidRequest);
  }, /exceeds remaining/i);

  console.log('✓ 7. Over-refund strictly prevented across multiple refund actions');
}

// =========================================================================
// 8. Original sale data is not mutated
// =========================================================================
{
  const originalItem: SaleItem = { name: 'Matcha Cheesecake', quantity: 5, unitPrice: 6.00, subtotal: 30.00 };
  const originalSale = createTestSale([originalItem], 30.00);
  const snapshotBefore = JSON.stringify(originalSale);

  const fullQty = getFullRefundQuantity(originalItem.quantity, originalItem.refundedQuantity);
  const fullAmt = getFullRefundAmount(originalSale.amount, originalSale.refundedAmount);

  assert.strictEqual(fullQty, 5);
  assert.strictEqual(fullAmt, 30.00);

  const { updatedSale } = applyPartialRefundToSale(originalSale, {
    items: [{ name: originalItem.name, quantity: fullQty }],
  });

  assert.strictEqual(JSON.stringify(originalSale), snapshotBefore, 'Original sale record must not be mutated');
  assert.strictEqual(originalSale.items![0].quantity, 5, 'Original quantity remains 5');
  assert.strictEqual(originalSale.items![0].refundedQuantity, undefined, 'Original item has no refundedQuantity');
  assert.strictEqual(updatedSale.items![0].quantity, 5, 'Updated sale original quantity is still 5');
  assert.strictEqual(updatedSale.items![0].refundedQuantity, 5, 'Updated sale records refundedQuantity 5');

  console.log('✓ 8. Original sale and item data remain completely unmutated');
}

console.log('🎉 All Step 9F-4A Full Refund Business Logic tests PASSED successfully!');
