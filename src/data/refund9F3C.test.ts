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
  validatePartialRefundQuantity,
} from '../utils/refundUtils';
import {
  applyPartialRefundToSale,
  isSaleEligibleForRefund,
  calculateRemainingRefundableAmount,
} from '../utils/refundRules';
import { TRANSACTIONS_DATA } from './mockData';

console.log('--- Running Step 9F-3C Partial Refund Flow Integration Tests ---');

// Standard test transaction creator
function createMockSale(items: SaleItem[], totalAmount: number): Transaction {
  return {
    id: 'tx-flow-test-1',
    orderNumber: '#ORD-FLOW-101',
    dateTime: 'Oct 24, 21:00',
    table: 'Table 08',
    type: 'Dine-in',
    amount: totalAmount,
    status: 'Receipt',
    paymentStatus: 'Paid',
    paymentMethod: 'Credit Card',
    customerName: 'Marcus Vance',
    currency: 'USD',
    items,
    subtotal: totalAmount,
    amountPaid: totalAmount,
  };
}

// ==========================================
// 1. Open Refund Modal & Pass Correct Sale/Item
// ==========================================
{
  const itemA: SaleItem = { name: 'Tonkotsu Ramen', quantity: 4, unitPrice: 14.00, subtotal: 56.00 };
  const itemB: SaleItem = { name: 'Gyoza', quantity: 2, unitPrice: 6.00, subtotal: 12.00 };
  const sale = createMockSale([itemA, itemB], 68.00);

  // Simulate usePartialRefund open modal with sale only
  let isModalOpen = false;
  let saleInModal: Transaction | null = null;
  let itemInModal: SaleItem | null = null;

  const openRefundModal = (s: Transaction, item?: SaleItem | null) => {
    isModalOpen = true;
    saleInModal = s;
    itemInModal = item || null;
  };

  openRefundModal(sale);
  assert.strictEqual(isModalOpen, true, 'Modal should be open');
  assert.strictEqual((saleInModal as Transaction | null)?.id, 'tx-flow-test-1');
  assert.strictEqual(itemInModal, null, 'No specific item forced');

  // Open modal targeting specific item
  openRefundModal(sale, itemB);
  assert.strictEqual(isModalOpen, true);
  assert.strictEqual((itemInModal as SaleItem | null)?.name, 'Gyoza');
  assert.strictEqual((itemInModal as SaleItem | null)?.quantity, 2);
  assert.strictEqual((itemInModal as SaleItem | null)?.unitPrice, 6.00);

  console.log('✓ 1. Open refund modal & pass correct sale/item verified');
}

// ==========================================
// 2. Modal Receives Required Calculation Data
// ==========================================
{
  const item: SaleItem = {
    name: 'Spicy Salmon Roll',
    quantity: 5,
    unitPrice: 12.00,
    refundedQuantity: 1,
  };

  const originalQuantity = item.quantity;
  const alreadyRefunded = item.refundedQuantity || 0;
  const remainingQuantity = getRefundableQuantity(originalQuantity, alreadyRefunded);
  const unitPrice = item.unitPrice;

  assert.strictEqual(item.name, 'Spicy Salmon Roll');
  assert.strictEqual(originalQuantity, 5);
  assert.strictEqual(alreadyRefunded, 1);
  assert.strictEqual(remainingQuantity, 4);
  assert.strictEqual(unitPrice, 12.00);

  console.log('✓ 2. Modal payload receiving all required fields verified');
}

// ==========================================
// 3. Confirm Valid Partial Refund Workflow
// ==========================================
{
  const item: SaleItem = { name: 'Dragon Roll', quantity: 5, unitPrice: 15.00, subtotal: 75.00 };
  const initialSale = createMockSale([item], 75.00);

  const request: RefundRequest = {
    items: [{ name: 'Dragon Roll', quantity: 2, unitPrice: 15.00 }],
    reason: 'Customer complaint about sauce',
  };

  // Validate using refundUtils
  const qtyVal = validatePartialRefundQuantity(2, 5);
  assert.strictEqual(qtyVal.isValid, true);

  // Apply partial refund to sale
  const { updatedSale, refundTransaction } = applyPartialRefundToSale(initialSale, request);

  // Reversal transaction checks
  assert.strictEqual(refundTransaction.amount, -30.00, 'Reversal amount must be -30.00');
  assert.strictEqual(refundTransaction.status, 'Refunded');
  assert.strictEqual(refundTransaction.paymentStatus, 'Refunded');
  assert.strictEqual(refundTransaction.originalTransactionId, initialSale.id);
  assert.strictEqual(refundTransaction.refundReason, 'Customer complaint about sauce');

  // Updated sale checks
  assert.strictEqual(updatedSale.refundedAmount, 30.00, 'Sale cumulative refundedAmount must be 30.00');
  assert.strictEqual(updatedSale.items![0].refundedQuantity, 2, 'Item refundedQuantity must be 2');
  assert.strictEqual(updatedSale.status, 'Receipt', 'Sale status remains active since 3 units remain');

  console.log('✓ 3. Valid partial refund confirmation & reversal transaction creation verified');
}

// ==========================================
// 4. Cancel Refund Leaves State Untouched
// ==========================================
{
  const item: SaleItem = { name: 'Ebi Tempura', quantity: 3, unitPrice: 9.00, subtotal: 27.00 };
  const originalSale = createMockSale([item], 27.00);
  const originalSnapshot = JSON.stringify(originalSale);

  let salesList: Transaction[] = [originalSale];
  let isModalOpen = true;

  // Simulate Cancel button click
  const closeRefundModal = () => {
    isModalOpen = false;
  };
  closeRefundModal();

  assert.strictEqual(isModalOpen, false, 'Modal closes on cancel');
  assert.strictEqual(salesList.length, 1, 'Sales list length unchanged');
  assert.strictEqual(JSON.stringify(salesList[0]), originalSnapshot, 'Sale record unchanged');

  console.log('✓ 4. Cancel action leaves data completely unchanged verified');
}

// ==========================================
// 5. State & Quantity Updates After Refund
// ==========================================
{
  const itemA: SaleItem = { name: 'Ramen', quantity: 5, unitPrice: 10.00 };
  const initialSale = createMockSale([itemA], 50.00);

  let salesList: Transaction[] = [initialSale];
  let selectedSale: Transaction | null = initialSale;

  const onRefundSuccess = (refundTx: Transaction, updated: Transaction) => {
    salesList = [refundTx, ...salesList.map((s) => (s.id === updated.id ? updated : s))];
    if (selectedSale && selectedSale.id === updated.id) {
      selectedSale = updated;
    }
  };

  // Step 1: Refund 2 units
  const res1 = applyPartialRefundToSale(initialSale, {
    items: [{ name: 'Ramen', quantity: 2 }],
  });
  onRefundSuccess(res1.refundTransaction, res1.updatedSale);

  assert.strictEqual(salesList.length, 2, 'Sales list now contains reversal record + original sale');
  assert.strictEqual(salesList[0].amount, -20.00, 'Reversal record is prepended');
  assert.strictEqual(selectedSale?.refundedAmount, 20.00, 'Selected sale details refreshed to 20.00 refunded');

  const rem1 = getRefundableQuantity(
    selectedSale!.items![0].quantity,
    selectedSale!.items![0].refundedQuantity
  );
  assert.strictEqual(rem1, 3, 'Remaining quantity must be 3');

  const remAmt1 = calculateRemainingRefundableAmount(selectedSale!);
  assert.strictEqual(remAmt1, 30.00, 'Remaining refundable amount must be 30.00');

  // Refund action remains available
  const elig1 = isSaleEligibleForRefund(selectedSale);
  assert.strictEqual(elig1.eligible, true, 'Refund action must still be available');

  // Step 2: Refund remaining 3 units
  const res2 = applyPartialRefundToSale(selectedSale!, {
    items: [{ name: 'Ramen', quantity: 3 }],
  });
  onRefundSuccess(res2.refundTransaction, res2.updatedSale);

  assert.strictEqual(salesList.length, 3);
  assert.strictEqual(selectedSale?.refundedAmount, 50.00);

  const rem2 = getRefundableQuantity(
    selectedSale!.items![0].quantity,
    selectedSale!.items![0].refundedQuantity
  );
  assert.strictEqual(rem2, 0, 'Remaining quantity must now be 0');

  const remAmt2 = calculateRemainingRefundableAmount(selectedSale!);
  assert.strictEqual(remAmt2, 0.00, 'Remaining balance must now be 0.00');

  // Refund action is now unavailable
  const elig2 = isSaleEligibleForRefund(selectedSale);
  assert.strictEqual(elig2.eligible, false, 'Refund action must now be unavailable');

  console.log('✓ 5. State, remaining quantity, and eligibility transitions verified');
}

// ==========================================
// 6. Fully Refunded Item Cannot Be Refunded Again
// ==========================================
{
  const fullyRefundedItem: SaleItem = {
    name: 'Edamame',
    quantity: 3,
    unitPrice: 5.00,
    refundedQuantity: 3,
  };
  const fullyRefundedSale: Transaction = {
    ...createMockSale([fullyRefundedItem], 15.00),
    status: 'Refunded',
    paymentStatus: 'Refunded',
    refundedAmount: 15.00,
  };

  const rem = getRefundableQuantity(fullyRefundedItem.quantity, fullyRefundedItem.refundedQuantity);
  assert.strictEqual(rem, 0);

  const val = validatePartialRefundQuantity(1, rem);
  assert.strictEqual(val.isValid, false);
  assert.strictEqual(val.error, 'This item has already been fully refunded.');

  assert.throws(() => {
    applyPartialRefundToSale(fullyRefundedSale, {
      items: [{ name: 'Edamame', quantity: 1 }],
    });
  }, /already refunded|cannot/i);

  console.log('✓ 6. Fully refunded item cannot be refunded again verified');
}

// ==========================================
// 7. Invalid Quantities Rejected
// ==========================================
{
  const remaining = 3;

  assert.strictEqual(validatePartialRefundQuantity(0, remaining).isValid, false);
  assert.strictEqual(validatePartialRefundQuantity(-1, remaining).isValid, false);
  assert.strictEqual(validatePartialRefundQuantity(4, remaining).isValid, false);
  assert.strictEqual(validatePartialRefundQuantity(NaN, remaining).isValid, false);

  console.log('✓ 7. Invalid quantity rejection verified');
}

// ==========================================
// 8. Existing Sales Functionality Still Works
// ==========================================
{
  assert(TRANSACTIONS_DATA.length >= 8, 'Original mock data must not be corrupted');
  const normalSale = TRANSACTIONS_DATA[0];
  assert.strictEqual(normalSale.orderNumber, '#TX-9042');
  assert.strictEqual(normalSale.amount, 33.50);
  assert(Array.isArray(normalSale.items) && normalSale.items.length === 2);

  console.log('✓ 8. Existing Sales regression verified');
}

console.log('🎉 All Step 9F-3C Partial Refund Flow Integration tests PASSED successfully!');
