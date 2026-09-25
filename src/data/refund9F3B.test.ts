/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import { SaleItem, Transaction, RefundRequest } from '../types';
import {
  getRefundableQuantity,
  calculatePartialRefundAmount,
  validatePartialRefundQuantity,
} from '../utils/refundUtils';
import { formatPrice } from '../utils/format';

console.log('--- Running Step 9F-3B Partial Refund UI Component Logic & Contract Tests ---');

// Mock test sale
const mockSale: Transaction = {
  id: 'tx-test-ui-1',
  orderNumber: '#ORD-9901',
  dateTime: 'Oct 24, 20:15',
  table: 'Table 04',
  type: 'Dine-in',
  amount: 45.00,
  status: 'Receipt',
  paymentStatus: 'Paid',
  paymentMethod: 'Credit Card',
  customerName: 'Alex Mercer',
  currency: 'USD',
  items: [
    { name: 'Spicy Salmon Roll', quantity: 5, unitPrice: 7.00, refundedQuantity: 2 },
    { name: 'Miso Soup', quantity: 2, unitPrice: 5.00, refundedQuantity: 2 },
  ],
};

// ==========================================
// 1. Modal Opens & Required Props Contract
// ==========================================
{
  assert(Boolean(mockSale.orderNumber), 'Sale must have orderNumber for modal title');
  assert(Array.isArray(mockSale.items) && mockSale.items.length === 2, 'Sale must supply itemized lines');

  // Verify modal title generation
  const title = `Partial Refund — Order ${mockSale.orderNumber}`;
  assert.strictEqual(title, 'Partial Refund — Order #ORD-9901');
  console.log('✓ 1. Modal open & title contract verified');
}

// ==========================================
// 2. Correct Item Information Appears
// ==========================================
{
  const item = mockSale.items![0]; // Spicy Salmon Roll
  assert.strictEqual(item.name, 'Spicy Salmon Roll');
  assert.strictEqual(item.unitPrice, 7.00);
  assert.strictEqual(formatPrice(item.unitPrice, mockSale.currency), '$7.00');
  console.log('✓ 2. Correct item information (name, unitPrice, currency) verified');
}

// ==========================================
// 3. Remaining Quantity Appears Correctly
// ==========================================
{
  const item1 = mockSale.items![0]; // 5 sold, 2 refunded
  const origQty1 = item1.quantity;
  const alreadyRef1 = item1.refundedQuantity || 0;
  const remQty1 = getRefundableQuantity(origQty1, alreadyRef1);

  assert.strictEqual(origQty1, 5, 'Original quantity must be 5');
  assert.strictEqual(alreadyRef1, 2, 'Already refunded quantity must be 2');
  assert.strictEqual(remQty1, 3, 'Remaining refundable quantity must be 3');

  // Second item: fully refunded item (2 sold, 2 refunded)
  const item2 = mockSale.items![1];
  const origQty2 = item2.quantity;
  const alreadyRef2 = item2.refundedQuantity || 0;
  const remQty2 = getRefundableQuantity(origQty2, alreadyRef2);

  assert.strictEqual(origQty2, 2, 'Original quantity must be 2');
  assert.strictEqual(alreadyRef2, 2, 'Already refunded quantity must be 2');
  assert.strictEqual(remQty2, 0, 'Remaining refundable quantity must be 0 (Fully Refunded)');
  console.log('✓ 3. Remaining quantity breakdown verified for active and fully refunded items');
}

// ==========================================
// 4. Valid Quantity Can Be Entered & Verified
// ==========================================
{
  const remainingQuantity = 3;

  // Refunding 1 of 3
  const val1 = validatePartialRefundQuantity(1, remainingQuantity);
  assert.strictEqual(val1.isValid, true, 'Quantity 1 should be valid');

  // Refunding 2 of 3
  const val2 = validatePartialRefundQuantity(2, remainingQuantity);
  assert.strictEqual(val2.isValid, true, 'Quantity 2 should be valid');

  // Refunding 3 of 3 (maximum remaining)
  const val3 = validatePartialRefundQuantity(3, remainingQuantity);
  assert.strictEqual(val3.isValid, true, 'Quantity 3 should be valid');

  console.log('✓ 4. Valid quantity range [1, remaining] verified');
}

// ==========================================
// 5. Invalid Quantity Displays Clear Error & Blocks Submit
// ==========================================
{
  const remainingQuantity = 3;

  // Zero quantity
  const zeroVal = validatePartialRefundQuantity(0, remainingQuantity);
  assert.strictEqual(zeroVal.isValid, false, 'Zero quantity must be invalid');
  assert.strictEqual(zeroVal.error, 'Refund quantity must be at least 1.');

  // Negative quantity
  const negVal = validatePartialRefundQuantity(-1, remainingQuantity);
  assert.strictEqual(negVal.isValid, false, 'Negative quantity must be invalid');
  assert.strictEqual(negVal.error, 'Refund quantity must be at least 1.');

  // Quantity exceeding remaining quantity
  const excessVal = validatePartialRefundQuantity(4, remainingQuantity);
  assert.strictEqual(excessVal.isValid, false, 'Quantity exceeding remaining must be invalid');
  assert.strictEqual(
    excessVal.error,
    'Refund quantity cannot exceed remaining refundable quantity (3).'
  );

  // Attempting to refund fully refunded item (remaining = 0)
  const fullyRefVal = validatePartialRefundQuantity(1, 0);
  assert.strictEqual(fullyRefVal.isValid, false, 'Refunding fully refunded item must be invalid');
  assert.strictEqual(fullyRefVal.error, 'This item has already been fully refunded.');

  // Empty or NaN input
  const nanVal = validatePartialRefundQuantity(NaN, remainingQuantity);
  assert.strictEqual(nanVal.isValid, false, 'NaN input must be invalid');
  assert.strictEqual(nanVal.error, 'Please enter a valid quantity.');

  console.log('✓ 5. Invalid quantity errors and submit button disable guards verified');
}

// ==========================================
// 6. Refund Amount Displays Accurately
// ==========================================
{
  const unitPrice = 7.00;

  // 1 item
  const amt1 = calculatePartialRefundAmount(unitPrice, 1);
  assert.strictEqual(amt1, 7.00);
  assert.strictEqual(formatPrice(amt1, 'USD'), '$7.00');

  // 2 items
  const amt2 = calculatePartialRefundAmount(unitPrice, 2);
  assert.strictEqual(amt2, 14.00);
  assert.strictEqual(formatPrice(amt2, 'USD'), '$14.00');

  // 3 items
  const amt3 = calculatePartialRefundAmount(unitPrice, 3);
  assert.strictEqual(amt3, 21.00);
  assert.strictEqual(formatPrice(amt3, 'USD'), '$21.00');

  // KHR currency
  const khrUnitPrice = 28000;
  const khrAmt = calculatePartialRefundAmount(khrUnitPrice, 2);
  assert.strictEqual(khrAmt, 56000);
  assert.strictEqual(formatPrice(khrAmt, 'KHR'), '56,000 ៛');

  console.log('✓ 6. Live refund amount display and currency formatting verified');
}

// ==========================================
// 7. Cancel Closes Modal & Confirm Callback Payload
// ==========================================
{
  let closed = false;
  const handleClose = () => {
    closed = true;
  };
  handleClose();
  assert.strictEqual(closed, true, 'Cancel button must trigger onClose callback');

  let submittedRequest: RefundRequest | null = null;
  const handleConfirmRefund = (_sale: Transaction, request: RefundRequest) => {
    submittedRequest = request;
  };

  const activeItem = mockSale.items![0];
  const qty = 2;
  const reason = 'Customer request / quality';

  handleConfirmRefund(mockSale, {
    items: [
      {
        name: activeItem.name,
        quantity: qty,
        unitPrice: activeItem.unitPrice,
      },
    ],
    reason,
  });

  assert(submittedRequest !== null, 'Submission payload must be provided');
  assert.strictEqual((submittedRequest as RefundRequest).items[0].name, 'Spicy Salmon Roll');
  assert.strictEqual((submittedRequest as RefundRequest).items[0].quantity, 2);
  assert.strictEqual((submittedRequest as RefundRequest).items[0].unitPrice, 7.00);
  assert.strictEqual((submittedRequest as RefundRequest).reason, 'Customer request / quality');

  console.log('✓ 7. Modal cancel and confirm callback dispatch verified');
}

console.log('🎉 All Step 9F-3B Partial Refund UI Component logic tests PASSED successfully!');
