/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Transaction, SaleItem, RefundRequest, RefundItem } from '../types';
import {
  getRefundableQuantity,
  getRefundableAmount,
  calculatePartialRefundAmount as calcPartialRefundAmount,
  canRefundQuantity,
  validatePartialRefundQuantity,
  getTotalRefundedQuantity,
  calculateRemainingQuantity,
  canApplyAdditionalRefund,
  validateMultiplePartialRefund,
  getFullRefundQuantity,
  getFullRefundAmount,
  canApplyFullRefund,
  calculateItemFullRefundAmount,
  QuantityValidationResult,
  MultipleRefundValidationResult,
} from './refundUtils';

export {
  getRefundableQuantity,
  getRefundableAmount,
  canRefundQuantity,
  validatePartialRefundQuantity,
  getTotalRefundedQuantity,
  calculateRemainingQuantity,
  canApplyAdditionalRefund,
  validateMultiplePartialRefund,
  getFullRefundQuantity,
  getFullRefundAmount,
  canApplyFullRefund,
  calculateItemFullRefundAmount,
};
export type { QuantityValidationResult, MultipleRefundValidationResult };

export interface RefundValidationResult {
  isValid: boolean;
  error?: string;
  refundAmount: number;
  validatedItems: RefundItem[];
  remainingRefundableAmount: number;
}

/**
 * Calculates remaining refundable quantity for an individual sale item.
 */
export function calculateItemRemainingQuantity(item: SaleItem): number {
  if (!item) return 0;
  return getRefundableQuantity(item.quantity, item.refundedQuantity);
}

/**
 * Calculates the maximum remaining refundable monetary balance for a transaction.
 */
export function calculateRemainingRefundableAmount(sale: Transaction): number {
  if (!sale || typeof sale.amount !== 'number') return 0;

  // Fully refunded status records or negative reversal records cannot be refunded
  if (sale.status === 'Refunded' || sale.paymentStatus === 'Refunded' || sale.amount <= 0) {
    return 0;
  }

  return getRefundableAmount(sale.amount, sale.refundedAmount);
}

/**
 * Checks whether a sale transaction is currently eligible for any refund.
 */
export function isSaleEligibleForRefund(
  sale: Transaction | null | undefined
): { eligible: boolean; reason?: string } {
  if (!sale) {
    return { eligible: false, reason: 'Sale record does not exist or is missing.' };
  }

  if (sale.status === 'Refunded' || sale.paymentStatus === 'Refunded') {
    return { eligible: false, reason: 'Sale is already refunded or is a refund transaction.' };
  }

  if (sale.amount <= 0) {
    return { eligible: false, reason: 'Sale amount must be greater than zero to be refunded.' };
  }

  const remaining = calculateRemainingRefundableAmount(sale);
  if (remaining <= 0) {
    return { eligible: false, reason: 'Sale has already been fully refunded.' };
  }

  return { eligible: true };
}

/**
 * Validates a refund request against RestoControl's 10 core refund business rules:
 * 1. A completed sale can be refunded.
 * 2. Refund quantity cannot exceed the quantity originally sold.
 * 3. Refund quantity cannot be zero or negative.
 * 4. Refund amount cannot be negative.
 * 5. A fully refunded item cannot be refunded again.
 * 6. Partial refunds must be supported.
 * 7. Total refunded quantity must never exceed original quantity.
 * 8. Total refunded amount must not exceed the refundable amount.
 * 9. Refund records must reference the original sale/order.
 * 10. Refund records must reference the refunded item where applicable.
 */
export function validateRefundRequest(
  sale: Transaction | null | undefined,
  request: RefundRequest
): RefundValidationResult {
  const zeroResult: RefundValidationResult = {
    isValid: false,
    refundAmount: 0,
    validatedItems: [],
    remainingRefundableAmount: 0,
  };

  // Rule 9 & General check: Sale must exist
  if (!sale) {
    return {
      ...zeroResult,
      error: 'Sale record does not exist or is missing.',
    };
  }

  const remainingRefundableAmount = calculateRemainingRefundableAmount(sale);

  // Rule 1: Sale must be eligible for refund
  const eligibility = isSaleEligibleForRefund(sale);
  if (!eligibility.eligible) {
    return {
      ...zeroResult,
      remainingRefundableAmount,
      error: eligibility.reason,
    };
  }

  // Request must include items
  if (!request || !Array.isArray(request.items) || request.items.length === 0) {
    return {
      ...zeroResult,
      remainingRefundableAmount,
      error: 'Refund request must include at least one item.',
    };
  }

  // Original items must exist on the sale
  if (!Array.isArray(sale.items) || sale.items.length === 0) {
    return {
      ...zeroResult,
      remainingRefundableAmount,
      error: 'Original sale does not contain itemized lines for refund.',
    };
  }

  const validatedItems: RefundItem[] = [];
  let calculatedRefundAmount = 0;

  for (const reqItem of request.items) {
    // Rule 10: Match item in original sale
    const origItem = sale.items.find((i) => {
      if ((reqItem as any).id && i.id) {
        return (reqItem as any).id === i.id;
      }
      return i.name === reqItem.name;
    });
    if (!origItem) {
      return {
        ...zeroResult,
        remainingRefundableAmount,
        error: `Item "${reqItem.name}" does not exist in the original sale.`,
      };
    }

    // Rule 3: Quantity cannot be zero or negative
    if (typeof reqItem.quantity !== 'number' || reqItem.quantity <= 0) {
      return {
        ...zeroResult,
        remainingRefundableAmount,
        error: `Refund quantity must be greater than zero for item "${reqItem.name}".`,
      };
    }

    // Rule 2, 5, 7: Quantity checks
    const remainingQty = calculateItemRemainingQuantity(origItem);
    if (remainingQty <= 0) {
      return {
        ...zeroResult,
        remainingRefundableAmount,
        error: `Item "${reqItem.name}" is already fully refunded.`,
      };
    }

    if (reqItem.quantity > remainingQty) {
      return {
        ...zeroResult,
        remainingRefundableAmount,
        error: `Refund quantity (${reqItem.quantity}) exceeds remaining sold quantity (${remainingQty}) for item "${reqItem.name}".`,
      };
    }

    const unitPrice = typeof origItem.unitPrice === 'number' ? origItem.unitPrice : 0;
    const itemSubtotal = Math.round(unitPrice * reqItem.quantity * 100) / 100;

    calculatedRefundAmount += itemSubtotal;
    validatedItems.push({
      name: origItem.name,
      quantity: reqItem.quantity,
      unitPrice,
      subtotal: itemSubtotal,
      originalItemId: origItem.id,
    });
  }

  // Handle optional customAmount override if specified
  const finalRefundAmount =
    typeof request.customAmount === 'number'
      ? Math.round(request.customAmount * 100) / 100
      : Math.round(calculatedRefundAmount * 100) / 100;

  // Rule 4: Refund amount cannot be negative
  if (finalRefundAmount < 0) {
    return {
      ...zeroResult,
      remainingRefundableAmount,
      error: 'Refund amount cannot be negative.',
    };
  }

  // Rule 8: Total refunded amount must not exceed the refundable amount
  if (finalRefundAmount > remainingRefundableAmount) {
    return {
      ...zeroResult,
      remainingRefundableAmount,
      refundAmount: finalRefundAmount,
      error: `Refund amount (${finalRefundAmount}) exceeds refundable balance (${remainingRefundableAmount}).`,
    };
  }

  return {
    isValid: true,
    refundAmount: finalRefundAmount,
    validatedItems,
    remainingRefundableAmount,
  };
}

/**
 * Creates a backward-compatible reverse refund Transaction record.
 * Formatted identically to the existing refunded transaction standard (e.g. tx4 in mock data).
 */
export function createRefundTransaction(
  sale: Transaction,
  request: RefundRequest,
  options?: {
    id?: string;
    dateTime?: string;
    refundNumber?: string;
  }
): Transaction {
  const validation = validateRefundRequest(sale, request);
  if (!validation.isValid) {
    throw new Error(`Cannot create refund transaction: ${validation.error}`);
  }

  const { refundAmount, validatedItems } = validation;
  const itemSummary = validatedItems
    .map((item) => `${item.name} x${item.quantity}`)
    .join(', ') + ' (Refunded)';

  const refundSeq = typeof sale.refundCount === 'number' ? sale.refundCount + 1 : 1;
  const defaultRefundNumber = `${sale.orderNumber}-REF${refundSeq > 1 ? `-${refundSeq}` : ''}`;

  return {
    id: options?.id || `tx-ref-${sale.id}-${refundSeq}-${Date.now()}`,
    orderNumber: options?.refundNumber || defaultRefundNumber,
    dateTime: options?.dateTime || 'Just Now',
    table: sale.table,
    type: sale.type,
    amount: -refundAmount,
    status: 'Refunded',
    paymentMethod: sale.paymentMethod,
    customerName: sale.customerName,
    currency: sale.currency || 'USD',
    amountPaid: 0,
    paymentStatus: 'Refunded',
    itemSummary,
    items: validatedItems,
    subtotal: -refundAmount,
    tax: 0,
    originalTransactionId: sale.id,
    originalOrderNumber: sale.orderNumber,
    refundReason: request.reason || 'Customer Refund',
    refundSequence: refundSeq,
  };
}

/**
 * Returns original, already refunded, and remaining refundable quantities for a sale item.
 */
export function getItemRefundDetails(item: SaleItem): {
  originalQuantity: number;
  alreadyRefunded: number;
  remaining: number;
} {
  const originalQuantity = typeof item.quantity === 'number' ? item.quantity : 0;
  const alreadyRefunded = typeof item.refundedQuantity === 'number' ? item.refundedQuantity : 0;
  const remaining = Math.max(0, originalQuantity - alreadyRefunded);
  return { originalQuantity, alreadyRefunded, remaining };
}

/**
 * Calculates the exact partial refund amount for a specific item and quantity.
 */
export function calculatePartialRefundAmount(item: SaleItem, quantity: number): number {
  return calcPartialRefundAmount(item, quantity);
}

/**
 * Applies a verified partial refund to an existing sale transaction.
 *
 * Rules:
 * - Keeps the original sale intact without in-place mutation.
 * - Updates item.refundedQuantity and sale.refundedAmount immutably.
 * - Creates a linked reverse refund transaction with negative amount referencing originalTransactionId.
 * - Transitions status to 'Refunded' only if all items or full amount have been refunded.
 */
export function applyPartialRefundToSale(
  sale: Transaction,
  request: RefundRequest,
  options?: {
    refundTxId?: string;
    refundDateTime?: string;
    refundNumber?: string;
  }
): {
  updatedSale: Transaction;
  refundTransaction: Transaction;
} {
  // 1. Strict validation
  const validation = validateRefundRequest(sale, request);
  if (!validation.isValid) {
    throw new Error(`Cannot apply partial refund: ${validation.error}`);
  }

  // 2. Generate the reversal refund transaction (immutably)
  const refundTransaction = createRefundTransaction(sale, request, {
    id: options?.refundTxId,
    dateTime: options?.refundDateTime,
    refundNumber: options?.refundNumber,
  });

  // 3. Update the original sale items with incremental refunded quantities
  const updatedItems: SaleItem[] = (sale.items || []).map((item) => {
    const reqItem = request.items.find((ri) => {
      if ((ri as any).id && item.id) {
        return (ri as any).id === item.id;
      }
      return ri.name === item.name;
    });
    if (!reqItem) {
      return { ...item };
    }
    const currentRefunded = typeof item.refundedQuantity === 'number' ? item.refundedQuantity : 0;
    return {
      ...item,
      refundedQuantity: currentRefunded + reqItem.quantity,
    };
  });

  // 4. Update the original sale's cumulative refunded amount
  const previousRefundedAmount = typeof sale.refundedAmount === 'number' ? sale.refundedAmount : 0;
  const newRefundedAmount = Math.round((previousRefundedAmount + validation.refundAmount) * 100) / 100;

  // 5. Determine if sale is now fully refunded
  const allItemsFullyRefunded =
    updatedItems.length > 0 &&
    updatedItems.every((item) => (item.refundedQuantity || 0) >= item.quantity);
  const isFullyRefunded = allItemsFullyRefunded || newRefundedAmount >= sale.amount;

  const previousRefundCount = typeof sale.refundCount === 'number' ? sale.refundCount : 0;
  const newRefundCount = previousRefundCount + 1;

  const updatedSale: Transaction = {
    ...sale,
    items: updatedItems,
    refundedAmount: newRefundedAmount,
    refundCount: newRefundCount,
    refundIds: [...(sale.refundIds || []), refundTransaction.id],
    status: isFullyRefunded ? 'Refunded' : sale.status,
    paymentStatus: isFullyRefunded ? 'Refunded' : sale.paymentStatus,
  };

  return {
    updatedSale,
    refundTransaction,
  };
}

/**
 * Applies a verified full refund to an existing sale transaction.
 * Automatically refunds all remaining refundable items and remaining balance.
 */
export function applyFullRefundToSale(
  sale: Transaction,
  reason?: string,
  options?: {
    refundTxId?: string;
    refundDateTime?: string;
    refundNumber?: string;
  }
): {
  updatedSale: Transaction;
  refundTransaction: Transaction;
} {
  // 1. Eligibility check
  const eligibility = isSaleEligibleForRefund(sale);
  if (!eligibility.eligible) {
    throw new Error(`Cannot apply full refund: ${eligibility.reason}`);
  }

  // 2. Build items list with remaining quantities
  const refundItems: RefundItem[] = (sale.items || [])
    .map((item) => {
      const remQty = getFullRefundQuantity(item.quantity, item.refundedQuantity);
      const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
      return {
        name: item.name,
        quantity: remQty,
        unitPrice,
        subtotal: Math.round(unitPrice * remQty * 100) / 100,
        originalItemId: item.id,
      };
    })
    .filter((item) => item.quantity > 0);

  if (refundItems.length === 0) {
    throw new Error('Cannot apply full refund: This sale has already been fully refunded.');
  }

  // 3. Delegate to applyPartialRefundToSale with all remaining items and full amount
  return applyPartialRefundToSale(
    sale,
    {
      items: refundItems,
      reason: reason?.trim() || 'Customer Request — Full Refund',
    },
    options
  );
}

