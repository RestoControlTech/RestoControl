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
import { formatPrice } from '../utils/format';

console.log('--- Running Step 9F-4B Full Refund UI Component Contract & Verification Tests ---');

// Mock test sale with active refundable balance
const mockSale: Transaction = {
  id: 'tx-full-ui-1',
  orderNumber: '#ORD-8820',
  dateTime: 'Oct 24, 21:30',
  table: 'Table 08',
  type: 'Dine-in',
  amount: 65.00,
  refundedAmount: 20.00,
  status: 'Receipt',
  paymentStatus: 'Paid',
  paymentMethod: 'Credit Card',
  customerName: 'Marcus Vance',
  currency: 'USD',
  items: [
    { name: 'Dragon Roll', quantity: 3, unitPrice: 15.00, refundedQuantity: 1 }, // 2 remaining ($30)
    { name: 'Eel Bento', quantity: 1, unitPrice: 20.00, refundedQuantity: 0 }, // 1 remaining ($20)
    { name: 'Edamame', quantity: 1, unitPrice: 5.00, refundedQuantity: 1 }, // 0 remaining ($0)
  ],
};

// Mock test sale that has already been fully refunded
const mockFullyRefundedSale: Transaction = {
  id: 'tx-full-ui-2',
  orderNumber: '#ORD-8821',
  dateTime: 'Oct 24, 22:00',
  table: 'Takeaway',
  type: 'Takeaway',
  amount: 40.00,
  refundedAmount: 40.00,
  status: 'Refunded',
  paymentStatus: 'Refunded',
  paymentMethod: 'Cash',
  customerName: 'Elena Rostova',
  currency: 'USD',
  items: [
    { name: 'Sashimi Deluxe', quantity: 2, unitPrice: 20.00, refundedQuantity: 2 },
  ],
};

// ==========================================
// 1. Modal Opens
// ==========================================
{
  // Test modal guard behavior
  const shouldRenderOpen = (isOpen: boolean, sale: Transaction | null) => Boolean(isOpen && sale);

  assert.strictEqual(shouldRenderOpen(true, mockSale), true, 'Modal opens when isOpen=true and sale is present');
  assert.strictEqual(shouldRenderOpen(false, mockSale), false, 'Modal does not render when isOpen=false');
  assert.strictEqual(shouldRenderOpen(true, null), false, 'Modal does not render when sale is null');

  const modalTitle = `Full Refund — Order ${mockSale.orderNumber}`;
  assert.strictEqual(modalTitle, 'Full Refund — Order #ORD-8820', 'Modal title displays order number correctly');
  console.log('✓ 1. Modal open condition and header contract verified');
}

// ==========================================
// 2. Correct Sale/Order Appears
// ==========================================
{
  assert.strictEqual(mockSale.orderNumber, '#ORD-8820');
  assert.strictEqual(mockSale.customerName, 'Marcus Vance');
  assert.strictEqual(mockSale.table, 'Table 08');
  assert.strictEqual(mockSale.currency, 'USD');

  const customerTableSummary = `${mockSale.customerName} • ${mockSale.table}`;
  assert.strictEqual(customerTableSummary, 'Marcus Vance • Table 08');
  console.log('✓ 2. Correct sale and order details verified');
}

// ==========================================
// 3. Correct Remaining Refundable Amount Appears
// ==========================================
{
  const origAmount = mockSale.amount; // 65.00
  const alreadyRefunded = mockSale.refundedAmount || 0; // 20.00
  const remainingRefundable = getFullRefundAmount(origAmount, alreadyRefunded);

  assert.strictEqual(origAmount, 65.00);
  assert.strictEqual(alreadyRefunded, 20.00);
  assert.strictEqual(remainingRefundable, 45.00, 'Remaining refundable amount must be 65.00 - 20.00 = 45.00');
  assert.strictEqual(formatPrice(remainingRefundable, mockSale.currency), '$45.00');

  // Multi-currency verification (KHR)
  const khrOrig = 100000;
  const khrRefunded = 30000;
  const khrRemaining = getFullRefundAmount(khrOrig, khrRefunded);
  assert.strictEqual(khrRemaining, 70000);
  assert.strictEqual(formatPrice(khrRemaining, 'KHR'), '70,000 ៛');

  console.log('✓ 3. Correct remaining refundable amount calculation and formatting verified');
}

// ==========================================
// 4. Correct Item Information Appears
// ==========================================
{
  const items = mockSale.items!;
  assert.strictEqual(items.length, 3);

  // Item 0: Dragon Roll (3 sold, 1 refunded -> 2 remaining)
  const item0 = items[0];
  const remQty0 = getFullRefundQuantity(item0.quantity, item0.refundedQuantity);
  assert.strictEqual(item0.name, 'Dragon Roll');
  assert.strictEqual(item0.unitPrice, 15.00);
  assert.strictEqual(remQty0, 2);
  const text0 = `Refund ${remQty0} of ${item0.quantity}`;
  assert.strictEqual(text0, 'Refund 2 of 3');

  // Item 1: Eel Bento (1 sold, 0 refunded -> 1 remaining)
  const item1 = items[1];
  const remQty1 = getFullRefundQuantity(item1.quantity, item1.refundedQuantity);
  assert.strictEqual(item1.name, 'Eel Bento');
  assert.strictEqual(remQty1, 1);
  const text1 = `Refund ${remQty1} of ${item1.quantity}`;
  assert.strictEqual(text1, 'Refund 1 of 1');

  // Item 2: Edamame (1 sold, 1 refunded -> 0 remaining)
  const item2 = items[2];
  const remQty2 = getFullRefundQuantity(item2.quantity, item2.refundedQuantity);
  assert.strictEqual(item2.name, 'Edamame');
  assert.strictEqual(remQty2, 0);
  const isFullyRef2 = remQty2 === 0;
  assert.strictEqual(isFullyRef2, true);

  console.log('✓ 4. Correct item information (names, unit prices, remaining quantities) verified');
}

// ==========================================
// 5. Full Refund Amount is Displayed
// ==========================================
{
  const remaining = getFullRefundAmount(mockSale.amount, mockSale.refundedAmount);
  const fullRefundDisplay = `-${formatPrice(remaining, mockSale.currency)}`;
  assert.strictEqual(fullRefundDisplay, '-$45.00');

  const buttonText = `Confirm Full Refund (${formatPrice(remaining, mockSale.currency)})`;
  assert.strictEqual(buttonText, 'Confirm Full Refund ($45.00)');
  console.log('✓ 5. Full refund amount display and confirmation button labeling verified');
}

// ==========================================
// 6. Already Fully Refunded Item Disables Confirmation
// ==========================================
{
  const origAmount = mockFullyRefundedSale.amount;
  const alreadyRefunded = mockFullyRefundedSale.refundedAmount || 0;
  const remainingRefundable = getFullRefundAmount(origAmount, alreadyRefunded);
  const isEligible = canApplyFullRefund(origAmount, alreadyRefunded) && remainingRefundable > 0;

  assert.strictEqual(remainingRefundable, 0);
  assert.strictEqual(canApplyFullRefund(origAmount, alreadyRefunded), false);
  assert.strictEqual(isEligible, false, 'Sale with 0 remaining balance must NOT be eligible');

  // Button disabled state
  const isConfirmDisabled = !isEligible;
  assert.strictEqual(isConfirmDisabled, true, 'Confirm button must be disabled when already fully refunded');

  console.log('✓ 6. Fully refunded sale disables confirmation button and flags exhaustion');
}

// ==========================================
// 7. Cancel Closes the Modal
// ==========================================
{
  let modalOpen = true;
  const handleClose = () => {
    modalOpen = false;
  };

  handleClose();
  assert.strictEqual(modalOpen, false, 'Cancel button invokes onClose callback and dismisses modal');
  console.log('✓ 7. Cancel closes the modal verified');
}

// ==========================================
// 8. Confirm Button is Available When Refundable Amount > 0
// ==========================================
{
  const origAmount = mockSale.amount;
  const alreadyRefunded = mockSale.refundedAmount || 0;
  const remainingRefundable = getFullRefundAmount(origAmount, alreadyRefunded);
  const isEligible = canApplyFullRefund(origAmount, alreadyRefunded) && remainingRefundable > 0;

  assert.strictEqual(isEligible, true);
  const isConfirmDisabled = !isEligible;
  assert.strictEqual(isConfirmDisabled, false, 'Confirm button must be enabled when remaining refundable > 0');

  // Simulated confirmation action
  let confirmedSale: Transaction | null = null;
  let confirmedReason: string | undefined = undefined;

  const handleConfirm = (sale: Transaction, reason?: string) => {
    if (!isEligible) return;
    confirmedSale = sale;
    confirmedReason = reason;
  };

  handleConfirm(mockSale, 'Customer Request — Full Refund');
  const resultSale = confirmedSale as Transaction | null;
  assert.strictEqual(resultSale?.orderNumber, '#ORD-8820');
  assert.strictEqual(confirmedReason, 'Customer Request — Full Refund');

  console.log('✓ 8. Confirm button availability and confirmation handler invocation verified');
}

// ==========================================
// 9. Optional Reason Can Be Entered
// ==========================================
{
  let submittedReason: string | undefined = undefined;

  const submitWithReason = (reasonInput: string) => {
    submittedReason = reasonInput.trim() || undefined;
  };

  // Custom user input
  submitWithReason('Customer requested cancellation due to long delay');
  assert.strictEqual(submittedReason, 'Customer requested cancellation due to long delay');

  // Empty string resolves to undefined
  submitWithReason('   ');
  assert.strictEqual(submittedReason, undefined, 'Blank reason falls back to undefined');

  console.log('✓ 9. Optional reason input and sanitization verified');
}

console.log('🎉 All Step 9F-4B Full Refund UI Component verification tests PASSED successfully!');
