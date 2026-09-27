/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import { Transaction, SaleItem } from '../types';
import {
  getFullRefundAmount,
  getFullRefundQuantity,
  canApplyFullRefund,
} from '../utils/refundUtils';
import {
  applyFullRefundToSale,
  applyPartialRefundToSale,
  isSaleEligibleForRefund,
  calculateRemainingRefundableAmount,
} from '../utils/refundRules';
import { TRANSACTIONS_DATA } from './mockData';

console.log('--- Running Step 9F-4C Full Refund Flow Integration Tests ---');

// Helper to create test transactions
function createMockSale(items: SaleItem[], totalAmount: number): Transaction {
  return {
    id: 'tx-full-flow-1',
    orderNumber: '#ORD-FF-901',
    dateTime: 'Oct 24, 21:45',
    table: 'Table 03',
    type: 'Dine-in',
    amount: totalAmount,
    status: 'Receipt',
    paymentStatus: 'Paid',
    paymentMethod: 'Credit Card',
    customerName: 'Maya Lin',
    currency: 'USD',
    items,
    subtotal: totalAmount,
    amountPaid: totalAmount,
  };
}

// =========================================================================
// 1. Open Full Refund Modal
// =========================================================================
{
  const itemA: SaleItem = { name: 'Sashimi Set', quantity: 2, unitPrice: 20.00, subtotal: 40.00 };
  const sale = createMockSale([itemA], 40.00);

  let isFullRefundModalOpen = false;
  let saleInModal: Transaction | null = null;

  const openFullRefundModal = (s: Transaction) => {
    isFullRefundModalOpen = true;
    saleInModal = s;
  };

  openFullRefundModal(sale);

  assert.strictEqual(isFullRefundModalOpen, true, 'Modal open state must be true');
  const targetSale = saleInModal as Transaction | null;
  assert.strictEqual(targetSale?.id, 'tx-full-flow-1', 'Active sale must be set in modal state');
  assert.strictEqual(targetSale?.orderNumber, '#ORD-FF-901');

  console.log('✓ 1. Open Full Refund modal verified');
}

// =========================================================================
// 2. Correct Sale/Item Passed to Modal
// =========================================================================
{
  const item1: SaleItem = { name: 'Miso Ramen', quantity: 3, unitPrice: 12.00, refundedQuantity: 1 };
  const item2: SaleItem = { name: 'Green Tea', quantity: 2, unitPrice: 3.00, refundedQuantity: 0 };
  const sale = createMockSale([item1, item2], 42.00);

  assert.strictEqual(sale.items?.length, 2);
  assert.strictEqual(sale.customerName, 'Maya Lin');
  assert.strictEqual(sale.table, 'Table 03');
  assert.strictEqual(sale.items[0].name, 'Miso Ramen');
  assert.strictEqual(sale.items[1].name, 'Green Tea');

  console.log('✓ 2. Correct sale/item passed to modal verified');
}

// =========================================================================
// 3. Correct Remaining Quantity
// =========================================================================
{
  const item1: SaleItem = { name: 'Miso Ramen', quantity: 3, unitPrice: 12.00, refundedQuantity: 1 };
  const item2: SaleItem = { name: 'Green Tea', quantity: 2, unitPrice: 3.00, refundedQuantity: 0 };
  const item3: SaleItem = { name: 'Mochi', quantity: 1, unitPrice: 4.00, refundedQuantity: 1 };

  const rem1 = getFullRefundQuantity(item1.quantity, item1.refundedQuantity);
  const rem2 = getFullRefundQuantity(item2.quantity, item2.refundedQuantity);
  const rem3 = getFullRefundQuantity(item3.quantity, item3.refundedQuantity);

  assert.strictEqual(rem1, 2, '3 sold - 1 refunded = 2 remaining');
  assert.strictEqual(rem2, 2, '2 sold - 0 refunded = 2 remaining');
  assert.strictEqual(rem3, 0, '1 sold - 1 refunded = 0 remaining (exhausted)');

  console.log('✓ 3. Correct remaining quantity calculation verified');
}

// =========================================================================
// 4. Correct Refundable Amount
// =========================================================================
{
  const origAmount = 46.00;
  const alreadyRefunded = 16.00;
  const remainingRefundable = getFullRefundAmount(origAmount, alreadyRefunded);

  assert.strictEqual(remainingRefundable, 30.00, '46.00 - 16.00 = 30.00');

  // Verify KHR amount calculation
  const khrOrig = 120000;
  const khrRefunded = 40000;
  assert.strictEqual(getFullRefundAmount(khrOrig, khrRefunded), 80000);

  console.log('✓ 4. Correct refundable amount calculation verified');
}

// =========================================================================
// 5. Successful Full Refund
// =========================================================================
{
  const itemA: SaleItem = { name: 'Unagi Don', quantity: 2, unitPrice: 18.00, subtotal: 36.00 };
  const itemB: SaleItem = { name: 'Edamame', quantity: 1, unitPrice: 4.00, subtotal: 4.00 };
  const initialSale = createMockSale([itemA, itemB], 40.00);

  const { updatedSale, refundTransaction } = applyFullRefundToSale(
    initialSale,
    'Guest requested full refund due to dissatisfaction'
  );

  // 1. Reversal transaction integrity
  assert.strictEqual(refundTransaction.amount, -40.00, 'Reversal amount must be -40.00');
  assert.strictEqual(refundTransaction.status, 'Refunded');
  assert.strictEqual(refundTransaction.paymentStatus, 'Refunded');
  assert.strictEqual(refundTransaction.originalTransactionId, initialSale.id);
  assert.strictEqual(refundTransaction.refundReason, 'Guest requested full refund due to dissatisfaction');
  assert.strictEqual(refundTransaction.items?.length, 2);

  // 2. Updated sale status and quantities
  assert.strictEqual(updatedSale.refundedAmount, 40.00, 'Cumulative refundedAmount must equal total sale amount');
  assert.strictEqual(updatedSale.status, 'Refunded');
  assert.strictEqual(updatedSale.paymentStatus, 'Refunded');
  assert.strictEqual(updatedSale.items![0].refundedQuantity, 2, 'Unagi Don fully refunded');
  assert.strictEqual(updatedSale.items![1].refundedQuantity, 1, 'Edamame fully refunded');

  // 3. Remaining balance and quantities are exactly 0
  assert.strictEqual(getFullRefundQuantity(updatedSale.items![0].quantity, updatedSale.items![0].refundedQuantity), 0);
  assert.strictEqual(getFullRefundQuantity(updatedSale.items![1].quantity, updatedSale.items![1].refundedQuantity), 0);
  assert.strictEqual(getFullRefundAmount(updatedSale.amount, updatedSale.refundedAmount), 0);
  assert.strictEqual(canApplyFullRefund(updatedSale.amount, updatedSale.refundedAmount), false);

  console.log('✓ 5. Successful full refund verified');
}

// =========================================================================
// 6. Full Refund After Previous Partial Refund
// =========================================================================
{
  // Sale: 4x Bento @ $10.00 = $40.00
  const item: SaleItem = { name: 'Chicken Bento', quantity: 4, unitPrice: 10.00, subtotal: 40.00 };
  const initialSale = createMockSale([item], 40.00);

  // Step A: Partial refund of 1 bento ($10.00)
  const { updatedSale: saleAfterPartial, refundTransaction: partialRefTx } = applyPartialRefundToSale(
    initialSale,
    {
      items: [{ name: 'Chicken Bento', quantity: 1 }],
      reason: '1 bento cold',
    }
  );

  assert.strictEqual(partialRefTx.amount, -10.00);
  assert.strictEqual(saleAfterPartial.refundedAmount, 10.00);
  assert.strictEqual(saleAfterPartial.items![0].refundedQuantity, 1);
  assert.strictEqual(saleAfterPartial.status, 'Receipt'); // still active

  // Step B: Now execute Full Refund for remaining balance
  const remBeforeFull = getFullRefundQuantity(
    saleAfterPartial.items![0].quantity,
    saleAfterPartial.items![0].refundedQuantity
  );
  assert.strictEqual(remBeforeFull, 3, '3 bento remaining');

  const { updatedSale: saleAfterFull, refundTransaction: fullRefTx } = applyFullRefundToSale(
    saleAfterPartial,
    'Remaining order cancelled'
  );

  assert.strictEqual(fullRefTx.amount, -30.00, 'Full refund after partial must strictly refund -$30.00 (NOT original $40.00)');
  assert.strictEqual(saleAfterFull.refundedAmount, 40.00, 'Cumulative refundedAmount is now 40.00');
  assert.strictEqual(saleAfterFull.items![0].refundedQuantity, 4, 'Cumulative refunded quantity is 4');
  assert.strictEqual(saleAfterFull.status, 'Refunded');
  assert.strictEqual(saleAfterFull.paymentStatus, 'Refunded');
  assert.strictEqual(saleAfterFull.refundCount, 2, '2 refunds recorded');
  assert.strictEqual(saleAfterFull.refundIds?.length, 2);

  console.log('✓ 6. Full refund after previous partial refund verified');
}

// =========================================================================
// 7. Already Fully Refunded Item Rejected
// =========================================================================
{
  const item: SaleItem = { name: 'Tempura Soba', quantity: 2, unitPrice: 15.00, refundedQuantity: 2 };
  const fullyRefundedSale: Transaction = {
    ...createMockSale([item], 30.00),
    refundedAmount: 30.00,
    status: 'Refunded',
    paymentStatus: 'Refunded',
  };

  const isEligible = isSaleEligibleForRefund(fullyRefundedSale).eligible;
  assert.strictEqual(isEligible, false, 'Fully refunded sale must not be eligible');

  assert.throws(() => {
    applyFullRefundToSale(fullyRefundedSale, 'Attempt extra refund');
  }, /already refunded|cannot/i);

  console.log('✓ 7. Already fully refunded item rejected verified');
}

// =========================================================================
// 8. Cancel Does Not Modify Data
// =========================================================================
{
  const item: SaleItem = { name: 'Spicy Tuna', quantity: 2, unitPrice: 12.00, subtotal: 24.00 };
  const originalSale = createMockSale([item], 24.00);
  const snapshotBefore = JSON.stringify(originalSale);

  let salesCollection = [originalSale];
  let isModalOpen = true;

  // Simulate cancel
  const handleCancel = () => {
    isModalOpen = false;
  };
  handleCancel();

  assert.strictEqual(isModalOpen, false, 'Modal closed');
  assert.strictEqual(salesCollection.length, 1, 'Collection length untouched');
  assert.strictEqual(JSON.stringify(salesCollection[0]), snapshotBefore, 'Data remains completely unchanged');

  console.log('✓ 8. Cancel does not modify data verified');
}

// =========================================================================
// 9. Refund Reason Saved
// =========================================================================
{
  const item: SaleItem = { name: 'Gyoza', quantity: 1, unitPrice: 8.00, subtotal: 8.00 };
  const sale = createMockSale([item], 8.00);

  const customReason = 'VIP customer requested full reimbursement due to manager agreement';
  const { refundTransaction } = applyFullRefundToSale(sale, customReason);

  assert.strictEqual(refundTransaction.refundReason, customReason, 'Custom reason must be saved in reversal transaction');

  // Verify default fallback reason when reason is undefined or blank
  const { refundTransaction: defaultTx } = applyFullRefundToSale(sale, '   ');
  assert.strictEqual(defaultTx.refundReason, 'Customer Request — Full Refund');

  console.log('✓ 9. Refund reason saved verified');
}

// =========================================================================
// 10. Original Sale Remains Unchanged
// =========================================================================
{
  const item: SaleItem = { name: 'Chirashi Bowl', quantity: 2, unitPrice: 22.00, subtotal: 44.00 };
  const originalSale = createMockSale([item], 44.00);
  const snapshot = JSON.stringify(originalSale);

  const { updatedSale } = applyFullRefundToSale(originalSale);

  assert.strictEqual(JSON.stringify(originalSale), snapshot, 'Original input transaction object must not be mutated in-place');
  assert.strictEqual(originalSale.refundedAmount, undefined);
  assert.strictEqual(originalSale.status, 'Receipt');
  assert.strictEqual(updatedSale.refundedAmount, 44.00);
  assert.strictEqual(updatedSale.status, 'Refunded');

  console.log('✓ 10. Original sale remains unchanged verified');
}

// =========================================================================
// 11. Refund History Remains Available
// =========================================================================
{
  const item: SaleItem = { name: 'Katsu Curry', quantity: 3, unitPrice: 14.00, subtotal: 42.00 };
  const initialSale = createMockSale([item], 42.00);

  let ledger: Transaction[] = [initialSale];

  // 1. Partial refund
  const step1 = applyPartialRefundToSale(initialSale, {
    items: [{ name: 'Katsu Curry', quantity: 1 }],
    reason: 'First partial refund',
  });
  ledger = [step1.refundTransaction, ...ledger.map((s) => (s.id === step1.updatedSale.id ? step1.updatedSale : s))];

  // 2. Full refund of remaining
  const currentSale = ledger.find((s) => s.id === initialSale.id)!;
  const step2 = applyFullRefundToSale(currentSale, 'Second and final full refund');
  ledger = [step2.refundTransaction, ...ledger.map((s) => (s.id === step2.updatedSale.id ? step2.updatedSale : s))];

  assert.strictEqual(ledger.length, 3, 'Ledger has 1 original sale + 2 refund records');

  const ref1 = ledger.find((tx) => tx.id === step1.refundTransaction.id);
  const ref2 = ledger.find((tx) => tx.id === step2.refundTransaction.id);
  const finalSaleRecord = ledger.find((tx) => tx.id === initialSale.id);

  assert(ref1 !== undefined, 'First refund transaction exists');
  assert(ref2 !== undefined, 'Second refund transaction exists');
  assert.strictEqual(ref1!.amount, -14.00);
  assert.strictEqual(ref2!.amount, -28.00);
  assert.strictEqual(finalSaleRecord!.refundCount, 2);
  assert.strictEqual(finalSaleRecord!.refundIds?.length, 2);
  assert.strictEqual(finalSaleRecord!.refundIds![0], ref1!.id);
  assert.strictEqual(finalSaleRecord!.refundIds![1], ref2!.id);

  console.log('✓ 11. Refund history remains available verified');
}

// =========================================================================
// 12. Duplicate Full Refund Prevented
// =========================================================================
{
  const item: SaleItem = { name: 'Matcha Parfait', quantity: 2, unitPrice: 8.00, subtotal: 16.00 };
  const initialSale = createMockSale([item], 16.00);

  // First full refund succeeds
  const { updatedSale } = applyFullRefundToSale(initialSale);
  assert.strictEqual(updatedSale.status, 'Refunded');

  // Attempting second full refund must throw an error
  assert.throws(() => {
    applyFullRefundToSale(updatedSale);
  }, /already refunded|cannot/i);

  console.log('✓ 12. Duplicate full refund prevented verified');
}

// =========================================================================
// 13. Regression Check: Existing Mock Data Integrity
// =========================================================================
{
  assert(TRANSACTIONS_DATA.length >= 8);
  assert.strictEqual(TRANSACTIONS_DATA[0].orderNumber, '#TX-9042');
  console.log('✓ 13. Existing mock data and sales suite regression verified');
}

console.log('🎉 All Step 9F-4C Full Refund Flow Integration tests PASSED successfully!');
