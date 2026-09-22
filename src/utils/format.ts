/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Format a number as currency ($XX.XX)
 */
export function formatPrice(price: number): string {
  // If price is negative (like a refund), format with a minus sign before the dollar sign
  if (price < 0) {
    return `-$${Math.abs(price).toFixed(2)}`;
  }
  return `$${price.toFixed(2)}`;
}
