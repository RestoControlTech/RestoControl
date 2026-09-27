/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {
  getRefundableQuantity,
  getRefundableAmount,
  calculatePartialRefundAmount,
  canRefundQuantity,
} from '../utils/refundUtils';

console.log('--- Running Step 9F-3A Partial Refund Data Logic Verification Tests ---');

// ==========================================
// 1. getRefundableQuantity tests
// ==========================================
{
  // 1 of 5 refundable (1 already refunded out of 5)
  const remainingAfter1 = getRefundableQuantity(5, 1);
  assert.strictEqual(remainingAfter1, 4, '5 original with 1 refunded must leave 4 refundable');

  // 2 of 5 refundable (2 already refunded out of 5)
  const remainingAfter2 = getRefundableQuantity(5, 2);
  assert.strictEqual(remainingAfter2, 3, '5 original with 2 refunded must leave 3 refundable');

  // Remaining quantity (3 already refunded out of 5)
  const remainingAfter3 = getRefundableQuantity(5, 3);
  assert.strictEqual(remainingAfter3, 2, '5 original with 3 refunded must leave 2 refundable');

  // Fully refunded quantity (5 of 5)
  const fullyRefunded = getRefundableQuantity(5, 5);
  assert.strictEqual(fullyRefunded, 0, '5 original with 5 refunded must leave 0 refundable');

  // Zero quantity already refunded (initial state)
  const initialQty = getRefundableQuantity(5, 0);
  assert.strictEqual(initialQty, 5, '5 original with 0 refunded must leave 5 refundable');

  // Default parameters (missing refundedQuantity)
  assert.strictEqual(getRefundableQuantity(5), 5, 'Missing refundedQuantity should default to 0');
  assert.strictEqual(getRefundableQuantity(5, undefined), 5, 'Undefined refundedQuantity should default to 0');
  assert.strictEqual(getRefundableQuantity(5, null), 5, 'Null refundedQuantity should default to 0');

  // Refunded quantity exceeds original quantity -> never negative
  const overRefunded = getRefundableQuantity(5, 8);
  assert.strictEqual(overRefunded, 0, 'Refunded exceeding original must clamp to 0 and never be negative');

  // Negative refunded quantity input -> clamped safely
  const negativeRefunded = getRefundableQuantity(5, -2);
  assert.strictEqual(negativeRefunded, 5, 'Negative refunded quantity input should be treated as 0');

  // Invalid or negative original quantity -> 0
  assert.strictEqual(getRefundableQuantity(-5, 0), 0, 'Negative original quantity must return 0');
  assert.strictEqual(getRefundableQuantity(NaN, 0), 0, 'NaN original quantity must return 0');
  console.log('✔ getRefundableQuantity tests passed');
}

// ==========================================
// 2. getRefundableAmount tests
// ==========================================
{
  // Normal deduction
  const amt1 = getRefundableAmount(100.00, 35.50);
  assert.strictEqual(amt1, 64.50, '100.00 - 35.50 should equal 64.50');

  // Decimal precision rounding
  const amt2 = getRefundableAmount(29.99, 9.99);
  assert.strictEqual(amt2, 20.00, '29.99 - 9.99 should equal 20.00 without floating point leak');

  // Zero refunded
  assert.strictEqual(getRefundableAmount(50.00, 0), 50.00, 'Zero refunded should leave full original amount');
  assert.strictEqual(getRefundableAmount(50.00), 50.00, 'Omitted refundedAmount should leave full original amount');

  // Fully refunded amount
  assert.strictEqual(getRefundableAmount(75.25, 75.25), 0.00, 'Fully refunded amount should return 0.00');

  // Refunded amount exceeds original amount -> never negative
  assert.strictEqual(getRefundableAmount(50.00, 60.00), 0.00, 'Refunded amount exceeding original must clamp to 0.00');

  // Negative refunded amount input
  assert.strictEqual(getRefundableAmount(50.00, -10.00), 50.00, 'Negative refunded amount input should be treated as 0');

  // Negative or invalid original amount
  assert.strictEqual(getRefundableAmount(-50.00, 0), 0.00, 'Negative original amount must return 0.00');
  assert.strictEqual(getRefundableAmount(NaN, 0), 0.00, 'NaN original amount must return 0.00');
  console.log('✔ getRefundableAmount tests passed');
}

// ==========================================
// 3. calculatePartialRefundAmount tests
// ==========================================
{
  // Standard calculation: unitPrice * quantity
  const refAmt1 = calculatePartialRefundAmount(12.50, 1);
  assert.strictEqual(refAmt1, 12.50, '12.50 * 1 should be 12.50');

  const refAmt2 = calculatePartialRefundAmount(12.50, 2);
  assert.strictEqual(refAmt2, 25.00, '12.50 * 2 should be 25.00');

  const refAmt3 = calculatePartialRefundAmount(7.33, 3);
  assert.strictEqual(refAmt3, 21.99, '7.33 * 3 should round correctly to 21.99');

  // Calculation with item object
  const refAmtItem = calculatePartialRefundAmount({ unitPrice: 15.00 }, 3);
  assert.strictEqual(refAmtItem, 45.00, 'Object with unitPrice should calculate correctly');

  // Zero quantity -> 0
  assert.strictEqual(calculatePartialRefundAmount(12.50, 0), 0, 'Zero quantity must yield 0 refund amount');

  // Negative quantity -> 0
  assert.strictEqual(calculatePartialRefundAmount(12.50, -1), 0, 'Negative quantity must yield 0 refund amount');
  assert.strictEqual(calculatePartialRefundAmount(12.50, -5), 0, 'Negative quantity must yield 0 refund amount');

  // Negative or zero unit price -> 0
  assert.strictEqual(calculatePartialRefundAmount(-10.00, 2), 0, 'Negative unit price must yield 0 refund amount');
  assert.strictEqual(calculatePartialRefundAmount(0, 3), 0, 'Zero unit price must yield 0 refund amount');

  // Missing or NaN arguments -> 0
  assert.strictEqual(calculatePartialRefundAmount(NaN, 2), 0, 'NaN unit price must yield 0');
  assert.strictEqual(calculatePartialRefundAmount(10, NaN), 0, 'NaN quantity must yield 0');
  console.log('✔ calculatePartialRefundAmount tests passed');
}

// ==========================================
// 4. canRefundQuantity validation tests
// ==========================================
{
  // Valid partial refunds
  assert.strictEqual(canRefundQuantity(1, 5), true, 'Refunding 1 when 5 remaining is valid');
  assert.strictEqual(canRefundQuantity(2, 5), true, 'Refunding 2 when 5 remaining is valid');
  assert.strictEqual(canRefundQuantity(4, 5), true, 'Refunding 4 when 5 remaining is valid');
  assert.strictEqual(canRefundQuantity(5, 5), true, 'Refunding remaining 5 of 5 is valid');

  // Attempt to refund zero
  assert.strictEqual(canRefundQuantity(0, 5), false, 'Attempting to refund 0 quantity must be rejected');

  // Attempt to refund negative quantity
  assert.strictEqual(canRefundQuantity(-1, 5), false, 'Attempting to refund negative quantity (-1) must be rejected');
  assert.strictEqual(canRefundQuantity(-10, 5), false, 'Attempting to refund negative quantity (-10) must be rejected');

  // Attempt to refund more than remaining quantity
  assert.strictEqual(canRefundQuantity(6, 5), false, 'Attempting to refund 6 when only 5 remaining must be rejected');
  assert.strictEqual(canRefundQuantity(100, 5), false, 'Attempting to refund 100 when only 5 remaining must be rejected');

  // Attempt to refund when already fully refunded (remaining = 0)
  assert.strictEqual(canRefundQuantity(1, 0), false, 'Attempting to refund when 0 remaining must be rejected');
  assert.strictEqual(canRefundQuantity(0, 0), false, 'Attempting to refund 0 when 0 remaining must be rejected');

  // Attempt to refund when remaining is negative (corrupt state prevention)
  assert.strictEqual(canRefundQuantity(1, -1), false, 'Negative remaining refundable quantity must be rejected');

  // Invalid non-number/NaN inputs
  assert.strictEqual(canRefundQuantity(NaN, 5), false, 'NaN quantity must be rejected');
  assert.strictEqual(canRefundQuantity(2, NaN), false, 'NaN refundableQuantity must be rejected');
  assert.strictEqual(canRefundQuantity(undefined, 5), false, 'Undefined quantity must be rejected');
  assert.strictEqual(canRefundQuantity(2, null), false, 'Null refundableQuantity must be rejected');
  console.log('✔ canRefundQuantity tests passed');
}

// ==========================================
// 5. Multiple partial refunds scenario
// ==========================================
{
  // Scenario:
  // Original sale line: 5x Spicy Tuna Roll @ $12.00 = $60.00
  const originalQuantity = 5;
  const unitPrice = 12.00;
  const originalAmount = 60.00;

  let currentRefundedQty = 0;
  let currentRefundedAmount = 0.00;

  // Initial State:
  let remQty = getRefundableQuantity(originalQuantity, currentRefundedQty);
  let remAmt = getRefundableAmount(originalAmount, currentRefundedAmount);
  assert.strictEqual(remQty, 5, 'Initial refundable quantity must be 5');
  assert.strictEqual(remAmt, 60.00, 'Initial refundable amount must be 60.00');

  // Partial Refund #1: Refund 2 items
  const refundQty1 = 2;
  assert.strictEqual(canRefundQuantity(refundQty1, remQty), true, 'Refund 2 of 5 must be allowed');
  const refundAmt1 = calculatePartialRefundAmount(unitPrice, refundQty1);
  assert.strictEqual(refundAmt1, 24.00, 'Refund 2 @ 12.00 must equal 24.00');

  // State update after #1
  currentRefundedQty += refundQty1; // 2
  currentRefundedAmount += refundAmt1; // 24.00
  remQty = getRefundableQuantity(originalQuantity, currentRefundedQty);
  remAmt = getRefundableAmount(originalAmount, currentRefundedAmount);
  assert.strictEqual(remQty, 3, 'After refunding 2, remaining quantity must be 3');
  assert.strictEqual(remAmt, 36.00, 'After refunding 24.00, remaining amount must be 36.00');

  // Invalid intermediate attempt: Attempting to refund 4 when only 3 remaining
  assert.strictEqual(canRefundQuantity(4, remQty), false, 'Attempting to refund 4 when 3 remaining must be rejected');

  // Partial Refund #2: Refund 1 item
  const refundQty2 = 1;
  assert.strictEqual(canRefundQuantity(refundQty2, remQty), true, 'Refund 1 of 3 must be allowed');
  const refundAmt2 = calculatePartialRefundAmount(unitPrice, refundQty2);
  assert.strictEqual(refundAmt2, 12.00, 'Refund 1 @ 12.00 must equal 12.00');

  // State update after #2
  currentRefundedQty += refundQty2; // 3
  currentRefundedAmount += refundAmt2; // 36.00
  remQty = getRefundableQuantity(originalQuantity, currentRefundedQty);
  remAmt = getRefundableAmount(originalAmount, currentRefundedAmount);
  assert.strictEqual(remQty, 2, 'After refunding 1 more, remaining quantity must be 2');
  assert.strictEqual(remAmt, 24.00, 'After refunding 12.00 more, remaining amount must be 24.00');

  // Partial Refund #3: Refund remaining 2 items (finalizing refund)
  const refundQty3 = 2;
  assert.strictEqual(canRefundQuantity(refundQty3, remQty), true, 'Refund final 2 of 2 must be allowed');
  const refundAmt3 = calculatePartialRefundAmount(unitPrice, refundQty3);
  assert.strictEqual(refundAmt3, 24.00, 'Refund 2 @ 12.00 must equal 24.00');

  // State update after #3
  currentRefundedQty += refundQty3; // 5
  currentRefundedAmount += refundAmt3; // 60.00
  remQty = getRefundableQuantity(originalQuantity, currentRefundedQty);
  remAmt = getRefundableAmount(originalAmount, currentRefundedAmount);
  assert.strictEqual(remQty, 0, 'Item must now have 0 refundable quantity left');
  assert.strictEqual(remAmt, 0.00, 'Item must now have 0.00 refundable amount left');

  // Post-refund attempt: Trying to refund any quantity after fully refunded
  assert.strictEqual(canRefundQuantity(1, remQty), false, 'Refunding after fully refunded must be rejected');
  assert.strictEqual(canRefundQuantity(0, remQty), false, 'Refunding 0 after fully refunded must be rejected');
  console.log('✔ Multiple partial refunds scenario passed');
}

// ==========================================
// 6. Immutability verification
// ==========================================
{
  const testItem = { name: 'Gyoza', quantity: 5, unitPrice: 8.50, refundedQuantity: 2 };
  const originalSnapshot = JSON.stringify(testItem);

  const rem = getRefundableQuantity(testItem.quantity, testItem.refundedQuantity);
  const amt = calculatePartialRefundAmount(testItem, 2);
  const can = canRefundQuantity(2, rem);

  assert.strictEqual(rem, 3);
  assert.strictEqual(amt, 17.00);
  assert.strictEqual(can, true);
  assert.strictEqual(JSON.stringify(testItem), originalSnapshot, 'Input data must remain strictly unmutated');
  console.log('✔ Immutability verification passed');
}

console.log('🎉 All Step 9F-3A Partial Refund Data Logic tests PASSED successfully!');
