/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Format a number as currency based on the currency code (USD or KHR)
 */
export function formatPrice(price: number, currency: string = 'USD'): string {
  if (currency === 'KHR') {
    const isNegative = price < 0;
    const absVal = Math.round(Math.abs(price)).toLocaleString('en-US');
    return isNegative ? `-${absVal} ៛` : `${absVal} ៛`;
  }

  // Default USD
  if (price < 0) {
    return `-$${Math.abs(price).toFixed(2)}`;
  }
  return `$${price.toFixed(2)}`;
}

/**
 * Alias for formatPrice to format monetary values cleanly
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return formatPrice(amount, currency);
}
