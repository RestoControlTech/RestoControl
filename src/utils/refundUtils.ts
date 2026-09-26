/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  getRefundableQuantity,
  getRefundableAmount,
  calculatePartialRefundAmount,
  getTotalRefundedQuantity,
  calculateRemainingQuantity,
  getFullRefundQuantity,
  getFullRefundAmount,
  calculateItemFullRefundAmount,
} from './refundCalculations';

// Re-export calculation functions for backward compatibility
export {
  getRefundableQuantity,
  getRefundableAmount,
  calculatePartialRefundAmount,
  getTotalRefundedQuantity,
  calculateRemainingQuantity,
  getFullRefundQuantity,
  getFullRefundAmount,
  calculateItemFullRefundAmount,
};

/**
 * Validates whether a requested quantity can be refunded given the remaining refundable quantity.
 *
 * Rules:
 * - Quantity must be > 0 (strictly positive).
 * - Quantity cannot exceed refundable quantity.
 * - Refundable quantity must be > 0.
 * - Rejects non-numbers, NaN, zero, and negative values.
 *
 * @param quantity - The requested quantity to refund
 * @param refundableQuantity - The remaining quantity that is refundable
 * @returns true if valid, false otherwise
 */
export function canRefundQuantity(
  quantity?: number | null,
  refundableQuantity?: number | null
): boolean {
  if (typeof quantity !== 'number' || Number.isNaN(quantity) || quantity <= 0) {
    return false;
  }
  if (typeof refundableQuantity !== 'number' || Number.isNaN(refundableQuantity) || refundableQuantity <= 0) {
    return false;
  }
  return quantity <= refundableQuantity;
}

export interface QuantityValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a user-entered partial refund quantity against remaining limits.
 *
 * Rules:
 * - Quantity cannot be NaN or empty.
 * - Quantity cannot be below 1.
 * - Quantity cannot exceed remaining quantity.
 * - Rejects refund if item is already fully refunded (remaining <= 0).
 */
export function validatePartialRefundQuantity(
  quantity?: number | null,
  remainingQuantity?: number | null
): QuantityValidationResult {
  if (typeof quantity !== 'number' || Number.isNaN(quantity)) {
    return { isValid: false, error: 'Please enter a valid quantity.' };
  }
  if (typeof remainingQuantity !== 'number' || Number.isNaN(remainingQuantity) || remainingQuantity <= 0) {
    return { isValid: false, error: 'This item has already been fully refunded.' };
  }
  if (quantity < 1) {
    return { isValid: false, error: 'Refund quantity must be at least 1.' };
  }
  if (quantity > remainingQuantity) {
    return {
      isValid: false,
      error: `Refund quantity cannot exceed remaining refundable quantity (${remainingQuantity}).`,
    };
  }
  return { isValid: true };
}

/**
 * Determines if an additional refund quantity is valid without over-refunding.
 *
 * @param requestedQuantity - Additional quantity to refund
 * @param originalQuantity - Original quantity sold
 * @param currentRefundedQuantity - Cumulative refunded quantity so far
 */
export function canApplyAdditionalRefund(
  requestedQuantity: number,
  originalQuantity: number,
  currentRefundedQuantity: number = 0
): boolean {
  if (typeof requestedQuantity !== 'number' || Number.isNaN(requestedQuantity) || requestedQuantity <= 0) {
    return false;
  }
  const remaining = calculateRemainingQuantity(originalQuantity, currentRefundedQuantity);
  return remaining > 0 && requestedQuantity <= remaining;
}

export interface MultipleRefundValidationResult {
  isValid: boolean;
  error?: string;
  totalRefundedBefore: number;
  remainingBefore: number;
  totalRefundedAfter: number;
  remainingAfter: number;
}

/**
 * Validates a new partial refund action in a multi-refund lifecycle.
 * Ensures the new refund strictly uses the latest remaining quantity and prevents over-refunding.
 */
export function validateMultiplePartialRefund(
  requestedQuantity: number,
  originalQuantity: number,
  currentRefundedQuantity: number = 0
): MultipleRefundValidationResult {
  const totalBefore = getTotalRefundedQuantity(currentRefundedQuantity);
  const remBefore = calculateRemainingQuantity(originalQuantity, totalBefore);

  if (typeof requestedQuantity !== 'number' || Number.isNaN(requestedQuantity)) {
    return {
      isValid: false,
      error: 'Please enter a valid refund quantity.',
      totalRefundedBefore: totalBefore,
      remainingBefore: remBefore,
      totalRefundedAfter: totalBefore,
      remainingAfter: remBefore,
    };
  }

  if (remBefore <= 0) {
    return {
      isValid: false,
      error: 'This item has already been fully refunded.',
      totalRefundedBefore: totalBefore,
      remainingBefore: 0,
      totalRefundedAfter: totalBefore,
      remainingAfter: 0,
    };
  }

  if (requestedQuantity < 1) {
    return {
      isValid: false,
      error: 'Refund quantity must be at least 1.',
      totalRefundedBefore: totalBefore,
      remainingBefore: remBefore,
      totalRefundedAfter: totalBefore,
      remainingAfter: remBefore,
    };
  }

  if (requestedQuantity > remBefore) {
    return {
      isValid: false,
      error: `Refund quantity (${requestedQuantity}) exceeds remaining refundable quantity (${remBefore}).`,
      totalRefundedBefore: totalBefore,
      remainingBefore: remBefore,
      totalRefundedAfter: totalBefore,
      remainingAfter: remBefore,
    };
  }

  const totalAfter = totalBefore + requestedQuantity;
  const remAfter = calculateRemainingQuantity(originalQuantity, totalAfter);

  return {
    isValid: true,
    totalRefundedBefore: totalBefore,
    remainingBefore: remBefore,
    totalRefundedAfter: totalAfter,
    remainingAfter: remAfter,
  };
}

/**
 * Determines whether an item or sale is eligible for a full refund.
 *
 * @param originalQuantity - The original quantity sold
 * @param refundedQuantity - The cumulative quantity already refunded
 * @returns true if remaining refundable quantity is > 0, false otherwise
 */
export function canApplyFullRefund(
  originalQuantity?: number | null,
  refundedQuantity?: number | null
): boolean {
  return getFullRefundQuantity(originalQuantity, refundedQuantity) > 0;
}
