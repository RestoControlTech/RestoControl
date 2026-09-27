/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Single configurable exchange rate: 1 USD = 4,100 KHR
 */
export const USD_TO_KHR_RATE = 4100;

export type PaymentCurrency = 'USD' | 'KHR';

/**
 * Format a number as currency based on the currency code (USD or KHR)
 */
export function formatPrice(price: number, currency: string = 'USD'): string {
  if (currency === 'KHR') {
    const isNegative = price < 0;
    const absVal = Math.round(Math.abs(price)).toLocaleString('en-US');
    return isNegative ? `-${absVal} ៛` : `${absVal} ៛`;
  }

  // Default USD ($XX.XX)
  if (price < 0) {
    return `-$${Math.abs(price).toFixed(2)}`;
  }
  return `$${price.toFixed(2)}`;
}

/**
 * Format a number as Cambodian Riel currency (៛XX,XXX)
 */
export function formatKHR(amount: number): string {
  if (amount < 0) {
    return `-៛${Math.round(Math.abs(amount)).toLocaleString('en-US')}`;
  }
  return `៛${Math.round(amount).toLocaleString('en-US')}`;
}

/**
 * Format an amount in the specified currency (USD or KHR)
 */
export function formatCurrency(amount: number, currency: PaymentCurrency | string = 'USD'): string {
  if (currency === 'KHR') {
    return formatKHR(amount);
  }
  return formatPrice(amount, currency);
}
