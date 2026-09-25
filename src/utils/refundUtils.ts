/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Calculates the remaining refundable quantity for an item or sale line.
 *
 * Rules:
 * - Refundable quantity can never be negative.
 * - Handles undefined, null, or invalid inputs safely.
 * - Does not mutate any input data.
 *
 * @param originalQuantity - The initial quantity sold
 * @param refundedQuantity - The cumulative quantity already refunded (defaults to 0)
 * @returns The non-negative remaining refundable quantity
 */
export function getRefundableQuantity(
  originalQuantity?: number | null,
  refundedQuantity?: number | null
): number {
  const orig = typeof originalQuantity === 'number' && !Number.isNaN(originalQuantity) ? Math.max(0, originalQuantity) : 0;
  const ref = typeof refundedQuantity === 'number' && !Number.isNaN(refundedQuantity) ? Math.max(0, refundedQuantity) : 0;
  return Math.max(0, orig - ref);
}

/**
 * Calculates the remaining refundable monetary amount for a transaction or line item.
 *
 * Rules:
 * - Refundable amount can never be negative.
 * - Handles floating-point precision cleanly (rounded to 2 decimal places).
 * - Handles undefined, null, or invalid inputs safely.
 * - Does not mutate any input data.
 *
 * @param originalAmount - The total amount originally charged
 * @param refundedAmount - The cumulative amount already refunded (defaults to 0)
 * @returns The non-negative remaining refundable amount
 */
export function getRefundableAmount(
  originalAmount?: number | null,
  refundedAmount?: number | null
): number {
  const orig = typeof originalAmount === 'number' && !Number.isNaN(originalAmount) ? Math.max(0, originalAmount) : 0;
  const ref = typeof refundedAmount === 'number' && !Number.isNaN(refundedAmount) ? Math.max(0, refundedAmount) : 0;
  const remaining = orig - ref;
  return Math.max(0, Math.round(remaining * 100) / 100);
}

/**
 * Calculates the partial refund amount for a given unit price and quantity.
 *
 * Rules:
 * - Negative unit price or quantity results in 0.00 refund amount.
 * - Returns exact monetary value rounded to 2 decimal places.
 * - Overload allows direct numeric unitPrice or an item object with unitPrice.
 *
 * @param unitPriceOrItem - The unit price of the item, or an object containing unitPrice
 * @param quantity - The quantity to be refunded
 * @returns The calculated refund amount
 */
export function calculatePartialRefundAmount(
  unitPriceOrItem: number | { unitPrice: number },
  quantity?: number | null
): number {
  const rawPrice =
    typeof unitPriceOrItem === 'number'
      ? unitPriceOrItem
      : typeof unitPriceOrItem?.unitPrice === 'number'
      ? unitPriceOrItem.unitPrice
      : 0;

  const unitPrice = typeof rawPrice === 'number' && !Number.isNaN(rawPrice) ? rawPrice : 0;
  const qty = typeof quantity === 'number' && !Number.isNaN(quantity) ? quantity : 0;

  if (unitPrice <= 0 || qty <= 0) {
    return 0;
  }

  return Math.round(unitPrice * qty * 100) / 100;
}

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
 * Calculates total cumulative refunded quantity for an item.
 *
 * @param itemOrQuantity - An item with refundedQuantity or numeric quantity
 * @returns Safe non-negative cumulative refunded quantity
 */
export function getTotalRefundedQuantity(
  itemOrQuantity?: { refundedQuantity?: number } | number | null
): number {
  if (typeof itemOrQuantity === 'number') {
    return Math.max(0, Number.isNaN(itemOrQuantity) ? 0 : itemOrQuantity);
  }
  if (itemOrQuantity && typeof itemOrQuantity.refundedQuantity === 'number') {
    return Math.max(0, Number.isNaN(itemOrQuantity.refundedQuantity) ? 0 : itemOrQuantity.refundedQuantity);
  }
  return 0;
}

/**
 * Calculates remaining quantity from original and total refunded quantity:
 * remainingQuantity = Math.max(0, originalQuantity - totalRefundedQuantity)
 *
 * Rules:
 * - Never returns a negative number.
 * - Leaves original quantity intact.
 */
export function calculateRemainingQuantity(
  originalQuantity?: number | null,
  totalRefundedQuantity?: number | null
): number {
  return getRefundableQuantity(originalQuantity, totalRefundedQuantity);
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
 * Calculates the exact remaining refundable quantity for a full refund of an item.
 *
 * Rules:
 * - Returns remaining refundable quantity (originalQuantity - refundedQuantity).
 * - Never returns a negative value (clamped to Math.max(0, ...)).
 * - If nothing remains, returns 0.
 * - Does not mutate the original data.
 * - Does NOT refund the original quantity if partial refunds already took place.
 *
 * @param originalQuantity - The original quantity sold
 * @param refundedQuantity - The cumulative quantity already refunded
 * @returns The remaining quantity needed to fully refund the item
 */
export function getFullRefundQuantity(
  originalQuantity?: number | null,
  refundedQuantity?: number | null
): number {
  return getRefundableQuantity(originalQuantity, refundedQuantity);
}

/**
 * Calculates the remaining refundable monetary amount for a full refund.
 *
 * Rules:
 * - Returns remaining refundable amount (originalAmount - refundedAmount).
 * - Never returns a negative value.
 * - Rounds cleanly to 2 decimal places.
 * - If nothing remains, returns 0.00.
 * - Does not mutate the original data.
 *
 * @param originalAmount - The original total transaction amount
 * @param refundedAmount - The cumulative amount already refunded
 * @returns The remaining refundable amount
 */
export function getFullRefundAmount(
  originalAmount?: number | null,
  refundedAmount?: number | null
): number {
  return getRefundableAmount(originalAmount, refundedAmount);
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

/**
 * Calculates the line refund amount for fully refunding an item's remaining quantity.
 *
 * @param unitPrice - Unit price of the item
 * @param originalQuantity - The original quantity sold
 * @param refundedQuantity - The cumulative quantity already refunded
 * @returns Exact monetary refund amount for remaining items
 */
export function calculateItemFullRefundAmount(
  unitPrice: number,
  originalQuantity?: number | null,
  refundedQuantity?: number | null
): number {
  const remainingQty = getFullRefundQuantity(originalQuantity, refundedQuantity);
  return calculatePartialRefundAmount(unitPrice, remainingQty);
}
