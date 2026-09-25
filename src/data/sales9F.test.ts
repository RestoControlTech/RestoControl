/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import { TRANSACTIONS_DATA } from './mockData';
import { Transaction, SaleItem } from '../types';
import {
  validateRefundRequest,
  createRefundTransaction,
  calculateRemainingRefundableAmount,
  calculateItemRemainingQuantity,
  isSaleEligibleForRefund,
  getItemRefundDetails,
  calculatePartialRefundAmount,
  applyPartialRefundToSale,
} from '../utils/refundRules';

console.log('--- Running Step 9F-3 Partial Refund Workflow Verification Tests ---');

// Helper to create a standardized test sale with configurable items
function createTestSale(items: SaleItem[], totalAmount: number): Transaction {
  return {
    id: 'tx-test-sale-1',
    orderNumber: '#TX-TEST-001',
    dateTime: 'Oct 24, 19:00',
    table: 'Table 03',
    type: 'Dine-in',
    amount: totalAmount,
    status: 'Receipt',
    paymentStatus: 'Paid',
    paymentMethod: 'Credit Card',
    customerName: 'Kenji Sato',
    currency: 'USD',
    items,
    subtotal: totalAmount,
    amountPaid: totalAmount,
  };
}

// ==========================================
// 1. Refund 1 of 5 items
// ==========================================
{
  const item: SaleItem = { name: 'Pork Gyoza 5pc', quantity: 5, unitPrice: 7.00, subtotal: 35.00 };
  const sale = createTestSale([item], 35.00);

  const request = { items: [{ name: 'Pork Gyoza 5pc', quantity: 1 }] };
  const validation = validateRefundRequest(sale, request);

  assert.strictEqual(validation.isValid, true, 'Refund of 1 of 5 items should be valid');
  assert.strictEqual(validation.refundAmount, 7.00, 'Refund amount should equal 1 * 7.00 = 7.00');

  const { updatedSale, refundTransaction } = applyPartialRefundToSale(sale, request);
  const updatedItem = updatedSale.items![0];
  const details = getItemRefundDetails(updatedItem);

  assert.strictEqual(details.originalQuantity, 5, 'Original quantity must remain 5');
  assert.strictEqual(details.alreadyRefunded, 1, 'Already refunded quantity must be 1');
  assert.strictEqual(details.remaining, 4, 'Remaining quantity must be 4');
  assert.strictEqual(updatedSale.refundedAmount, 7.00, 'Sale refunded amount should be 7.00');
  assert.strictEqual(refundTransaction.amount, -7.00, 'Refund transaction amount must be -7.00');

  console.log('✓ 1. Refund 1 of 5 items: correctly validated and remaining updated to 4.');
}

// ==========================================
// 2. Refund 2 of 5 items
// ==========================================
{
  const item: SaleItem = { name: 'Pork Gyoza 5pc', quantity: 5, unitPrice: 7.00, subtotal: 35.00 };
  const sale = createTestSale([item], 35.00);

  const request = { items: [{ name: 'Pork Gyoza 5pc', quantity: 2 }] };
  const validation = validateRefundRequest(sale, request);

  assert.strictEqual(validation.isValid, true, 'Refund of 2 of 5 items should be valid');
  assert.strictEqual(validation.refundAmount, 14.00, 'Refund amount should equal 2 * 7.00 = 14.00');

  const { updatedSale } = applyPartialRefundToSale(sale, request);
  const details = getItemRefundDetails(updatedSale.items![0]);

  assert.strictEqual(details.originalQuantity, 5);
  assert.strictEqual(details.alreadyRefunded, 2);
  assert.strictEqual(details.remaining, 3);
  assert.strictEqual(updatedSale.refundedAmount, 14.00);

  console.log('✓ 2. Refund 2 of 5 items: correctly validated and remaining updated to 3.');
}

// ==========================================
// 3. Refund remaining quantity
// ==========================================
{
  // Start with 5 items, where 3 were already refunded -> 2 remaining
  const item: SaleItem = {
    name: 'Pork Gyoza 5pc',
    quantity: 5,
    unitPrice: 7.00,
    subtotal: 35.00,
    refundedQuantity: 3,
  };
  const sale = {
    ...createTestSale([item], 35.00),
    refundedAmount: 21.00, // 3 * 7.00
  };

  const request = { items: [{ name: 'Pork Gyoza 5pc', quantity: 2 }] };
  const validation = validateRefundRequest(sale, request);

  assert.strictEqual(validation.isValid, true, 'Refunding the exact remaining quantity must be valid');
  assert.strictEqual(validation.refundAmount, 14.00, 'Remaining refund amount should equal 2 * 7.00 = 14.00');

  const { updatedSale } = applyPartialRefundToSale(sale, request);
  const details = getItemRefundDetails(updatedSale.items![0]);

  assert.strictEqual(details.alreadyRefunded, 5, 'Already refunded quantity should now equal 5');
  assert.strictEqual(details.remaining, 0, 'Remaining quantity should now be 0');
  assert.strictEqual(updatedSale.status, 'Refunded', 'Sale should transition to Refunded when all items are refunded');
  assert.strictEqual(updatedSale.refundedAmount, 35.00, 'Total refunded amount should equal 35.00');

  console.log('✓ 3. Refund remaining quantity: successfully refunds final 2 items and closes balance to 0.');
}

// ==========================================
// 4. Two consecutive partial refunds
// ==========================================
{
  const item: SaleItem = { name: 'Tonkotsu Ramen', quantity: 5, unitPrice: 13.50, subtotal: 67.50 };
  const initialSale = createTestSale([item], 67.50);

  // First refund: 2 items
  const firstRequest = { items: [{ name: 'Tonkotsu Ramen', quantity: 2 }] };
  const firstResult = applyPartialRefundToSale(initialSale, firstRequest);
  const saleAfterFirst = firstResult.updatedSale;

  const firstDetails = getItemRefundDetails(saleAfterFirst.items![0]);
  assert.strictEqual(firstDetails.alreadyRefunded, 2, 'After 1st refund: already refunded is 2');
  assert.strictEqual(firstDetails.remaining, 3, 'After 1st refund: remaining is 3');
  assert.strictEqual(saleAfterFirst.refundedAmount, 27.00, 'After 1st refund: refunded amount is 27.00');

  // Second refund: 1 item on the updated sale
  const secondRequest = { items: [{ name: 'Tonkotsu Ramen', quantity: 1 }] };
  const secondResult = applyPartialRefundToSale(saleAfterFirst, secondRequest);
  const saleAfterSecond = secondResult.updatedSale;

  const secondDetails = getItemRefundDetails(saleAfterSecond.items![0]);
  assert.strictEqual(secondDetails.alreadyRefunded, 3, 'After 2nd refund: already refunded is 3');
  assert.strictEqual(secondDetails.remaining, 2, 'After 2nd refund: remaining is 2');
  assert.strictEqual(saleAfterSecond.refundedAmount, 40.50, 'After 2nd refund: refunded amount is 40.50');

  console.log('✓ 4. Two consecutive partial refunds: 5 -> refund 2 (rem 3) -> refund 1 (rem 2) verified.');
}

// ==========================================
// 5. Multiple partial refunds until fully refunded
// ==========================================
{
  const item: SaleItem = { name: 'Matcha Latte', quantity: 5, unitPrice: 5.00, subtotal: 25.00 };
  let currentSale = createTestSale([item], 25.00);

  // Step A: refund 2 (remaining: 3)
  const stepA = applyPartialRefundToSale(currentSale, { items: [{ name: 'Matcha Latte', quantity: 2 }] });
  currentSale = stepA.updatedSale;
  assert.strictEqual(getItemRefundDetails(currentSale.items![0]).remaining, 3);
  assert.strictEqual(currentSale.status, 'Receipt', 'Sale should still be open');

  // Step B: refund 1 (remaining: 2)
  const stepB = applyPartialRefundToSale(currentSale, { items: [{ name: 'Matcha Latte', quantity: 1 }] });
  currentSale = stepB.updatedSale;
  assert.strictEqual(getItemRefundDetails(currentSale.items![0]).remaining, 2);

  // Step C: refund 2 (remaining: 0 -> fully refunded)
  const stepC = applyPartialRefundToSale(currentSale, { items: [{ name: 'Matcha Latte', quantity: 2 }] });
  currentSale = stepC.updatedSale;
  assert.strictEqual(getItemRefundDetails(currentSale.items![0]).remaining, 0);
  assert.strictEqual(currentSale.status, 'Refunded', 'Sale status transitions to Refunded');
  assert.strictEqual(currentSale.refundedAmount, 25.00);

  // Step D: Attempt refunding again on fully refunded sale
  const stepDValidation = validateRefundRequest(currentSale, { items: [{ name: 'Matcha Latte', quantity: 1 }] });
  assert.strictEqual(stepDValidation.isValid, false, 'Further refund on fully refunded sale must be rejected');

  console.log('✓ 5. Multiple partial refunds until fully refunded: transitions status and blocks further refunds.');
}

// ==========================================
// 6. Attempt to refund more than remaining quantity
// ==========================================
{
  const item: SaleItem = { name: 'Mochi Ice Cream', quantity: 5, unitPrice: 4.00, refundedQuantity: 3 };
  const sale = createTestSale([item], 20.00); // 2 remaining

  const excessRequest = { items: [{ name: 'Mochi Ice Cream', quantity: 3 }] };
  const validation = validateRefundRequest(sale, excessRequest);

  assert.strictEqual(validation.isValid, false, 'Request for 3 when 2 remaining must be rejected');
  assert(validation.error?.includes('exceeds remaining sold quantity'));

  console.log('✓ 6. Attempt to refund more than remaining quantity: rejected with clear validation message.');
}

// ==========================================
// 7. Attempt to refund zero
// ==========================================
{
  const item: SaleItem = { name: 'Mochi Ice Cream', quantity: 5, unitPrice: 4.00 };
  const sale = createTestSale([item], 20.00);

  const zeroRequest = { items: [{ name: 'Mochi Ice Cream', quantity: 0 }] };
  const validation = validateRefundRequest(sale, zeroRequest);

  assert.strictEqual(validation.isValid, false, 'Quantity of 0 must be rejected');
  assert(validation.error?.includes('greater than zero'));

  console.log('✓ 7. Attempt to refund zero: correctly rejected.');
}

// ==========================================
// 8. Attempt to refund negative quantity
// ==========================================
{
  const item: SaleItem = { name: 'Mochi Ice Cream', quantity: 5, unitPrice: 4.00 };
  const sale = createTestSale([item], 20.00);

  const negativeRequest = { items: [{ name: 'Mochi Ice Cream', quantity: -3 }] };
  const validation = validateRefundRequest(sale, negativeRequest);

  assert.strictEqual(validation.isValid, false, 'Negative quantity must be rejected');
  assert(validation.error?.includes('greater than zero'));

  console.log('✓ 8. Attempt to refund negative quantity: correctly rejected.');
}

// ==========================================
// 9. Attempt to refund after fully refunded
// ==========================================
{
  const item: SaleItem = { name: 'Yuzu Soda', quantity: 3, unitPrice: 3.50, refundedQuantity: 3 };
  const fullyRefundedSale: Transaction = {
    ...createTestSale([item], 10.50),
    refundedAmount: 10.50,
    status: 'Refunded',
  };

  const request = { items: [{ name: 'Yuzu Soda', quantity: 1 }] };
  const validation = validateRefundRequest(fullyRefundedSale, request);

  assert.strictEqual(validation.isValid, false, 'Attempting refund after fully refunded must be rejected');
  assert(
    validation.error?.includes('already refunded') || validation.error?.includes('already fully refunded')
  );

  console.log('✓ 9. Attempt to refund after fully refunded: correctly rejected.');
}

// ==========================================
// 10. Partial refund amount calculation
// ==========================================
{
  const item: SaleItem = { name: 'Dragon Roll 8pc', quantity: 4, unitPrice: 16.50, subtotal: 66.00 };

  assert.strictEqual(calculatePartialRefundAmount(item, 1), 16.50);
  assert.strictEqual(calculatePartialRefundAmount(item, 2), 33.00);
  assert.strictEqual(calculatePartialRefundAmount(item, 3), 49.50);
  assert.strictEqual(calculatePartialRefundAmount(item, 4), 66.00);
  assert.strictEqual(calculatePartialRefundAmount(item, 0), 0);
  assert.strictEqual(calculatePartialRefundAmount(item, -1), 0);

  // Custom amount validation
  const sale = createTestSale([item], 66.00);
  const customExcessRequest = {
    items: [{ name: 'Dragon Roll 8pc', quantity: 1 }],
    customAmount: 70.00, // exceeds sale balance 66.00
  };
  const excessResult = validateRefundRequest(sale, customExcessRequest);
  assert.strictEqual(excessResult.isValid, false, 'Custom refund amount exceeding balance must be rejected');

  console.log('✓ 10. Partial refund amount calculation: line calculations and balance limits verified.');
}

// ==========================================
// 11. Multiple items in the same sale
// ==========================================
{
  const itemA: SaleItem = { name: 'Salmon Roll', quantity: 4, unitPrice: 8.50, subtotal: 34.00 };
  const itemB: SaleItem = { name: 'Miso Soup', quantity: 3, unitPrice: 4.00, subtotal: 12.00 };
  const multiItemSale = createTestSale([itemA, itemB], 46.00);

  // Refund 2 of Item A
  const refundA = applyPartialRefundToSale(multiItemSale, {
    items: [{ name: 'Salmon Roll', quantity: 2 }],
  });
  const saleAfterA = refundA.updatedSale;

  const itemADetails = getItemRefundDetails(saleAfterA.items![0]);
  const itemBDetails = getItemRefundDetails(saleAfterA.items![1]);

  assert.strictEqual(itemADetails.remaining, 2, 'Item A remaining should be 4 - 2 = 2');
  assert.strictEqual(itemBDetails.remaining, 3, 'Item B remaining must remain untouched at 3');
  assert.strictEqual(itemBDetails.alreadyRefunded, 0, 'Item B alreadyRefunded must remain 0');

  // Next, refund 1 of Item B
  const refundB = applyPartialRefundToSale(saleAfterA, {
    items: [{ name: 'Miso Soup', quantity: 1 }],
  });
  const saleAfterB = refundB.updatedSale;

  const itemADetails2 = getItemRefundDetails(saleAfterB.items![0]);
  const itemBDetails2 = getItemRefundDetails(saleAfterB.items![1]);

  assert.strictEqual(itemADetails2.remaining, 2, 'Item A remaining still 2');
  assert.strictEqual(itemBDetails2.remaining, 2, 'Item B remaining is 3 - 1 = 2');
  assert.strictEqual(saleAfterB.refundedAmount, 2 * 8.50 + 1 * 4.00, 'Cumulative refunded amount is 21.00');

  console.log('✓ 11. Multiple items in same sale: each item refunded independently without cross-item contamination.');
}

// ==========================================
// 12. Original sale remains unchanged (Immutability)
// ==========================================
{
  const originalItem: SaleItem = { name: 'Edamame', quantity: 3, unitPrice: 4.50 };
  const sale = createTestSale([originalItem], 13.50);

  const snapshotBefore = JSON.stringify(sale);

  // Execute partial refund application
  const result = applyPartialRefundToSale(sale, {
    items: [{ name: 'Edamame', quantity: 1 }],
  });

  const snapshotAfter = JSON.stringify(sale);

  assert.strictEqual(snapshotAfter, snapshotBefore, 'Original sale record must not be mutated in-place');
  assert.notStrictEqual(result.updatedSale, sale, 'updatedSale must be a distinct object copy');

  console.log('✓ 12. Original sale remains unchanged: complete object immutability confirmed.');
}

// ==========================================
// 13. Duplicate refund prevention
// ==========================================
{
  const item: SaleItem = { name: 'Gyoza', quantity: 1, unitPrice: 6.50 };
  const sale = createTestSale([item], 6.50);

  // 1st refund of the 1 item
  const { updatedSale } = applyPartialRefundToSale(sale, { items: [{ name: 'Gyoza', quantity: 1 }] });

  // Immediate second attempt with same quantity
  assert.throws(
    () => {
      applyPartialRefundToSale(updatedSale, { items: [{ name: 'Gyoza', quantity: 1 }] });
    },
    /already fully refunded|already refunded/,
    'Applying duplicate refund on exhausted item must throw an error'
  );

  console.log('✓ 13. Duplicate refund prevention: second identical refund attempt blocked.');
}

// ==========================================
// 14. Existing Sales Regression
// ==========================================
{
  // Take actual tx1 from mock data
  const realSale = TRANSACTIONS_DATA[0]; // #TX-9042, Tonkotsu Ramen x2, Yuzu Soda x1
  const remainingInitial = calculateRemainingRefundableAmount(realSale);
  assert(remainingInitial > 0, 'Real sale should have positive refundable balance');

  // Perform partial refund of 1 Yuzu Soda
  const { updatedSale, refundTransaction } = applyPartialRefundToSale(realSale, {
    items: [{ name: 'Yuzu Soda', quantity: 1 }],
  });

  assert.strictEqual(refundTransaction.amount, -4.50, 'Refund transaction amount is -4.50');
  assert.strictEqual(refundTransaction.originalTransactionId, realSale.id);
  assert.strictEqual(refundTransaction.originalOrderNumber, realSale.orderNumber);

  const yuzuDetails = getItemRefundDetails(updatedSale.items!.find((i) => i.name === 'Yuzu Soda')!);
  assert.strictEqual(yuzuDetails.remaining, 0, 'Yuzu Soda now has 0 remaining');

  const ramenDetails = getItemRefundDetails(updatedSale.items!.find((i) => i.name === 'Tonkotsu Ramen')!);
  assert.strictEqual(ramenDetails.remaining, 2, 'Tonkotsu Ramen still has 2 remaining');

  console.log('✓ 14. Existing Sales regression: verified real mock transaction partial refund execution.');
}

console.log('\n✔ All 14 Step 9F-3 Partial Refund tests passed successfully!\n');
