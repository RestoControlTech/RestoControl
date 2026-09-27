/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import { Transaction, SaleItem, RefundRequest } from '../types';
import {
  getRefundableQuantity,
  getRefundableAmount,
  calculatePartialRefundAmount,
  getTotalRefundedQuantity,
  calculateRemainingQuantity,
  canApplyAdditionalRefund,
  validateMultiplePartialRefund,
} from '../utils/refundUtils';
import {
  applyPartialRefundToSale,
  validateRefundRequest,
  isSaleEligibleForRefund,
  calculateRemainingRefundableAmount,
} from '../utils/refundRules';

console.log('--- Running Step 9F-3D Multiple Partial Refunds Verification Tests ---');

// Helper to create test sale
function createTestSale(items: SaleItem[], totalAmount: number): Transaction {
  return {
    id: 'tx-multi-refund-1',
    orderNumber: '#ORD-MULTI-901',
    dateTime: 'Oct 24, 22:00',
    table: 'Table 12',
    type: 'Dine-in',
    amount: totalAmount,
    status: 'Receipt',
    paymentStatus: 'Paid',
    paymentMethod: 'Credit Card',
    customerName: 'Sarah Connor',
    currency: 'USD',
    items,
    subtotal: totalAmount,
    amountPaid: totalAmount,
  };
}

// =========================================================================
// 1. Original quantity 5 → refund 1 → remaining 4
// =========================================================================
const initialItem: SaleItem = { name: 'Pork Ramen', quantity: 5, unitPrice: 10.00, subtotal: 50.00 };
const initialSale = createTestSale([initialItem], 50.00);

const req1: RefundRequest = { items: [{ name: 'Pork Ramen', quantity: 1 }], reason: 'Slightly cold' };
const { updatedSale: saleAfter1, refundTransaction: refTx1 } = applyPartialRefundToSale(initialSale, req1);

assert.strictEqual(refTx1.amount, -10.00, 'Refund #1 amount must be -10.00');
assert.strictEqual(refTx1.orderNumber, '#ORD-MULTI-901-REF', 'Refund #1 order number');
assert.strictEqual(refTx1.refundSequence, 1, 'Refund #1 sequence is 1');
assert.strictEqual(saleAfter1.items![0].refundedQuantity, 1, 'Item refundedQuantity must be 1');
assert.strictEqual(
  calculateRemainingQuantity(saleAfter1.items![0].quantity, saleAfter1.items![0].refundedQuantity),
  4,
  'Remaining quantity must be 4'
);
assert.strictEqual(saleAfter1.refundedAmount, 10.00, 'Sale refundedAmount must be 10.00');
assert.strictEqual(saleAfter1.status, 'Receipt', 'Sale remains active');
console.log('✓ 1. Original quantity 5 → refund 1 → remaining 4 verified');

// =========================================================================
// 2. Refund another 2 → remaining 2
// =========================================================================
const req2: RefundRequest = { items: [{ name: 'Pork Ramen', quantity: 2 }], reason: 'Extra portion left over' };
const { updatedSale: saleAfter2, refundTransaction: refTx2 } = applyPartialRefundToSale(saleAfter1, req2);

assert.strictEqual(refTx2.amount, -20.00, 'Refund #2 amount must be -20.00');
assert.strictEqual(refTx2.orderNumber, '#ORD-MULTI-901-REF-2', 'Refund #2 order number is sequential');
assert.strictEqual(refTx2.refundSequence, 2, 'Refund #2 sequence is 2');
assert.strictEqual(saleAfter2.items![0].refundedQuantity, 3, 'Cumulative item refundedQuantity must be 3');
assert.strictEqual(
  calculateRemainingQuantity(saleAfter2.items![0].quantity, saleAfter2.items![0].refundedQuantity),
  2,
  'Remaining quantity must be 2'
);
assert.strictEqual(saleAfter2.refundedAmount, 30.00, 'Sale refundedAmount must be 30.00');
console.log('✓ 2. Refund another 2 → remaining 2 verified');

// =========================================================================
// 3. Refund remaining 2 → remaining 0
// =========================================================================
const req3: RefundRequest = { items: [{ name: 'Pork Ramen', quantity: 2 }], reason: 'Table left early' };
const { updatedSale: saleAfter3, refundTransaction: refTx3 } = applyPartialRefundToSale(saleAfter2, req3);

assert.strictEqual(refTx3.amount, -20.00, 'Refund #3 amount must be -20.00');
assert.strictEqual(refTx3.orderNumber, '#ORD-MULTI-901-REF-3', 'Refund #3 order number is sequential');
assert.strictEqual(refTx3.refundSequence, 3, 'Refund #3 sequence is 3');
assert.strictEqual(saleAfter3.items![0].refundedQuantity, 5, 'Cumulative item refundedQuantity must be 5');
assert.strictEqual(
  calculateRemainingQuantity(saleAfter3.items![0].quantity, saleAfter3.items![0].refundedQuantity),
  0,
  'Remaining quantity must be 0'
);
assert.strictEqual(saleAfter3.refundedAmount, 50.00, 'Sale cumulative refundedAmount must be 50.00');
assert.strictEqual(saleAfter3.status, 'Refunded', 'Sale status transitions to Refunded when exhausted');
assert.strictEqual(saleAfter3.paymentStatus, 'Refunded', 'Payment status transitions to Refunded');
console.log('✓ 3. Refund remaining 2 → remaining 0 and status transition verified');

// =========================================================================
// 4. Attempt another refund → rejected
// =========================================================================
assert.throws(() => {
  applyPartialRefundToSale(saleAfter3, {
    items: [{ name: 'Pork Ramen', quantity: 1 }],
  });
}, /already fully refunded|is already refunded/i);

const postExhaustValidation = validateRefundRequest(saleAfter3, {
  items: [{ name: 'Pork Ramen', quantity: 1 }],
});
assert.strictEqual(postExhaustValidation.isValid, false, 'Validation must reject further refunds');
assert(
  postExhaustValidation.error?.includes('already') ||
  postExhaustValidation.error?.includes('exceeds'),
  'Error indicates item/sale is already refunded'
);
console.log('✓ 4. Attempt another refund on exhausted item correctly rejected');

// =========================================================================
// 5. Refund 3 + refund 3 on quantity 5 → second refund rejected
// =========================================================================
{
  const item: SaleItem = { name: 'California Roll', quantity: 5, unitPrice: 8.00, subtotal: 40.00 };
  const sale = createTestSale([item], 40.00);

  // First refund of 3 is valid
  const { updatedSale: saleAfterFirst } = applyPartialRefundToSale(sale, {
    items: [{ name: 'California Roll', quantity: 3 }],
  });
  assert.strictEqual(saleAfterFirst.items![0].refundedQuantity, 3);
  assert.strictEqual(
    calculateRemainingQuantity(saleAfterFirst.items![0].quantity, saleAfterFirst.items![0].refundedQuantity),
    2
  );

  // Second refund of 3 exceeds remaining 2 -> MUST BE REJECTED
  const overRefundValidation = validateRefundRequest(saleAfterFirst, {
    items: [{ name: 'California Roll', quantity: 3 }],
  });
  assert.strictEqual(overRefundValidation.isValid, false, 'Over-refund must be invalid');
  assert(
    overRefundValidation.error?.includes('exceeds remaining sold quantity (2)'),
    'Validation explicitly mentions remaining quantity of 2'
  );

  assert.throws(() => {
    applyPartialRefundToSale(saleAfterFirst, {
      items: [{ name: 'California Roll', quantity: 3 }],
    });
  }, /exceeds remaining/i);

  console.log('✓ 5. Refund 3 + refund 3 on quantity 5 → second refund cleanly rejected');
}

// =========================================================================
// 6. Multiple partial refunds on different items
// =========================================================================
{
  const ramenItem: SaleItem = { name: 'Shoyu Ramen', quantity: 3, unitPrice: 12.00, subtotal: 36.00 };
  const gyozaItem: SaleItem = { name: 'Fried Gyoza', quantity: 4, unitPrice: 6.00, subtotal: 24.00 };
  const multiSale = createTestSale([ramenItem, gyozaItem], 60.00);

  // Step A: Refund 1 Ramen
  const { updatedSale: stepA } = applyPartialRefundToSale(multiSale, {
    items: [{ name: 'Shoyu Ramen', quantity: 1 }],
  });
  const ramenA = stepA.items!.find((i) => i.name === 'Shoyu Ramen')!;
  const gyozaA = stepA.items!.find((i) => i.name === 'Fried Gyoza')!;
  assert.strictEqual(ramenA.refundedQuantity, 1, 'Ramen refunded is 1');
  assert.strictEqual(calculateRemainingQuantity(ramenA.quantity, ramenA.refundedQuantity), 2);
  assert.strictEqual(gyozaA.refundedQuantity || 0, 0, 'Gyoza refunded is 0');
  assert.strictEqual(calculateRemainingQuantity(gyozaA.quantity, gyozaA.refundedQuantity), 4);

  // Step B: Refund 2 Gyoza
  const { updatedSale: stepB } = applyPartialRefundToSale(stepA, {
    items: [{ name: 'Fried Gyoza', quantity: 2 }],
  });
  const ramenB = stepB.items!.find((i) => i.name === 'Shoyu Ramen')!;
  const gyozaB = stepB.items!.find((i) => i.name === 'Fried Gyoza')!;
  assert.strictEqual(ramenB.refundedQuantity, 1, 'Ramen remains 1 refunded');
  assert.strictEqual(calculateRemainingQuantity(ramenB.quantity, ramenB.refundedQuantity), 2);
  assert.strictEqual(gyozaB.refundedQuantity, 2, 'Gyoza now 2 refunded');
  assert.strictEqual(calculateRemainingQuantity(gyozaB.quantity, gyozaB.refundedQuantity), 2);

  // Step C: Refund another 1 Ramen
  const { updatedSale: stepC } = applyPartialRefundToSale(stepB, {
    items: [{ name: 'Shoyu Ramen', quantity: 1 }],
  });
  const ramenC = stepC.items!.find((i) => i.name === 'Shoyu Ramen')!;
  const gyozaC = stepC.items!.find((i) => i.name === 'Fried Gyoza')!;
  assert.strictEqual(ramenC.refundedQuantity, 2, 'Ramen now 2 refunded');
  assert.strictEqual(calculateRemainingQuantity(ramenC.quantity, ramenC.refundedQuantity), 1);
  assert.strictEqual(gyozaC.refundedQuantity, 2, 'Gyoza unchanged at 2 refunded');
  assert.strictEqual(calculateRemainingQuantity(gyozaC.quantity, gyozaC.refundedQuantity), 2);

  console.log('✓ 6. Multiple partial refunds across different items verified without cross-contamination');
}

// =========================================================================
// 7. Correct total refunded quantity
// =========================================================================
{
  assert.strictEqual(getTotalRefundedQuantity(0), 0);
  assert.strictEqual(getTotalRefundedQuantity(3), 3);
  assert.strictEqual(getTotalRefundedQuantity({ refundedQuantity: 4 }), 4);
  assert.strictEqual(getTotalRefundedQuantity(undefined), 0);
  assert.strictEqual(getTotalRefundedQuantity(-2), 0, 'Negative quantity normalized to 0');
  console.log('✓ 7. Correct total refunded quantity helper verified');
}

// =========================================================================
// 8. Correct remaining quantity
// =========================================================================
{
  assert.strictEqual(calculateRemainingQuantity(5, 0), 5);
  assert.strictEqual(calculateRemainingQuantity(5, 1), 4);
  assert.strictEqual(calculateRemainingQuantity(5, 3), 2);
  assert.strictEqual(calculateRemainingQuantity(5, 5), 0);
  assert.strictEqual(calculateRemainingQuantity(5, 8), 0, 'Exceeded refunds clamped to 0');
  console.log('✓ 8. Correct remaining quantity calculation verified');
}

// =========================================================================
// 9. Correct total refunded amount
// =========================================================================
{
  const totalAmt = 100.00;
  const refAmt1 = 25.00;
  const refAmt2 = 35.50;
  const cumulative = refAmt1 + refAmt2; // 60.50

  const remAmt = getRefundableAmount(totalAmt, cumulative);
  assert.strictEqual(remAmt, 39.50, '100.00 - 60.50 should equal 39.50');
  console.log('✓ 9. Correct total refunded amount calculation verified');
}

// =========================================================================
// 10. Original sale remains unchanged
// =========================================================================
{
  const originalItem: SaleItem = { name: 'Matcha Ice Cream', quantity: 4, unitPrice: 4.50, subtotal: 18.00 };
  const originalSale = createTestSale([originalItem], 18.00);
  const snapshotBefore = JSON.stringify(originalSale);

  const { updatedSale } = applyPartialRefundToSale(originalSale, {
    items: [{ name: 'Matcha Ice Cream', quantity: 2 }],
  });

  assert.strictEqual(JSON.stringify(originalSale), snapshotBefore, 'Original sale record must not be mutated');
  assert.strictEqual(originalSale.items![0].quantity, 4, 'Original item quantity remains 4');
  assert.strictEqual(originalSale.items![0].refundedQuantity, undefined, 'Original item has no refundedQuantity');
  assert.strictEqual(updatedSale.items![0].quantity, 4, 'Updated sale original quantity is still 4');
  assert.strictEqual(updatedSale.items![0].refundedQuantity, 2, 'Updated sale tracks refundedQuantity 2');
  console.log('✓ 10. Original sale and original quantity remain completely unmutated');
}

// =========================================================================
// 11. No negative remaining quantity
// =========================================================================
{
  assert.strictEqual(calculateRemainingQuantity(3, 5), 0, 'Must clamp to 0, never negative');
  assert.strictEqual(calculateRemainingQuantity(0, 2), 0, 'Must clamp to 0, never negative');
  assert.strictEqual(getRefundableQuantity(5, 10), 0, 'getRefundableQuantity never negative');
  assert.strictEqual(getRefundableAmount(50.00, 75.00), 0.00, 'getRefundableAmount never negative');
  console.log('✓ 11. Invariant: No negative remaining quantity or amount verified');
}

// =========================================================================
// 12. No duplicate/over-refund
// =========================================================================
{
  // canApplyAdditionalRefund checks
  assert.strictEqual(canApplyAdditionalRefund(1, 5, 0), true, '1 when 5 available is allowed');
  assert.strictEqual(canApplyAdditionalRefund(2, 5, 3), true, '2 when 3 of 5 already refunded is allowed');
  assert.strictEqual(canApplyAdditionalRefund(3, 5, 3), false, '3 when 3 of 5 already refunded exceeds remaining (2)');
  assert.strictEqual(canApplyAdditionalRefund(1, 5, 5), false, '1 when 5 of 5 already refunded is blocked');

  // validateMultiplePartialRefund checks
  const val = validateMultiplePartialRefund(3, 5, 3);
  assert.strictEqual(val.isValid, false);
  assert.strictEqual(val.remainingBefore, 2);
  assert(val.error?.includes('exceeds remaining refundable quantity (2)'));

  console.log('✓ 12. Over-refund and duplicate refund prevention verified');
}

console.log('🎉 All Step 9F-3D Multiple Partial Refunds tests PASSED successfully!');
