/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Transaction } from '../types';

export interface PaymentSummaryItem {
  method: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface OrderTypeSummaryItem {
  type: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface SalesSummaryData {
  totalRevenue: number;
  completedCount: number;
  averageOrderValue: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
  hasCostData: boolean;
  paymentSummary: PaymentSummaryItem[];
  orderTypeSummary: OrderTypeSummaryItem[];
}

export const STANDARD_PAYMENT_METHODS = ['Cash', 'Credit Card', 'QR Code', 'Digital Wallet'];
export const STANDARD_ORDER_TYPES = ['Dine-in', 'Takeaway'];

/**
 * Calculates complete revenue, cost, profit, payment, and order type metrics
 * from a list of transactions.
 *
 * Rules:
 * - Operates purely on the provided sales dataset (non-mutating).
 * - Excludes refunded transactions from paid metrics (status !== 'Refunded' and paymentStatus !== 'Refunded').
 * - Only includes positive sale amounts in gross revenue.
 * - Total Cost = sum(product cost * quantity) for all paid items where cost is available.
 * - Profit = Revenue - Cost.
 * - Payment breakdown total strictly equals filtered revenue.
 * - Order type breakdown total strictly equals filtered revenue.
 * - If zero sales or empty input, safely returns zeroes without NaN or division-by-zero.
 */
export function calculateSalesSummary(sales: Transaction[]): SalesSummaryData {
  if (!sales || sales.length === 0) {
    return {
      totalRevenue: 0,
      completedCount: 0,
      averageOrderValue: 0,
      totalCost: 0,
      profit: 0,
      profitMargin: 0,
      hasCostData: false,
      paymentSummary: STANDARD_PAYMENT_METHODS.map((method) => ({
        method,
        count: 0,
        revenue: 0,
        percentage: 0,
      })),
      orderTypeSummary: STANDARD_ORDER_TYPES.map((type) => ({
        type,
        count: 0,
        revenue: 0,
        percentage: 0,
      })),
    };
  }

  // 1. Completed/paid transactions (excluding refunds)
  const paidSales = sales.filter(
    (tx) => tx.status !== 'Refunded' && tx.paymentStatus !== 'Refunded'
  );

  // 2. Revenue calculation
  const rawRevenue = paidSales.reduce((sum, tx) => {
    return sum + (typeof tx.amount === 'number' && tx.amount > 0 ? tx.amount : 0);
  }, 0);
  const totalRevenue = Math.round(rawRevenue * 100) / 100;

  // 3. Sales Count & Average Order Value
  const completedCount = paidSales.length;
  const rawAov = completedCount > 0 ? totalRevenue / completedCount : 0;
  const averageOrderValue = Math.round(rawAov * 100) / 100;

  // 4. Cost calculation: sum(product cost * quantity)
  let hasCostData = false;
  let rawCost = 0;

  for (const tx of paidSales) {
    if (Array.isArray(tx.items)) {
      for (const item of tx.items) {
        if (typeof item.cost === 'number' && !isNaN(item.cost)) {
          hasCostData = true;
          const qty = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
          rawCost += item.cost * qty;
        }
      }
    }
  }
  const totalCost = Math.round(rawCost * 100) / 100;

  // 5. Profit calculation: Profit = Revenue - Cost
  const profit = Math.round((totalRevenue - totalCost) * 100) / 100;
  const profitMargin = totalRevenue > 0 ? Math.round((profit / totalRevenue) * 1000) / 10 : 0;

  // 6. Payment Method Breakdown (sum of revenues strictly equals totalRevenue)
  const extraMethods = new Set<string>();
  paidSales.forEach((tx) => {
    const method = tx.paymentMethod || 'Other';
    if (!STANDARD_PAYMENT_METHODS.includes(method)) {
      extraMethods.add(method);
    }
  });

  const allPaymentMethods = [...STANDARD_PAYMENT_METHODS, ...Array.from(extraMethods)];
  const paymentSummary: PaymentSummaryItem[] = allPaymentMethods.map((method) => {
    const methodSales = paidSales.filter((tx) => (tx.paymentMethod || 'Other') === method);
    const count = methodSales.length;
    const methodRev = methodSales.reduce((sum, tx) => sum + (tx.amount > 0 ? tx.amount : 0), 0);
    const roundedRev = Math.round(methodRev * 100) / 100;
    const percentage = totalRevenue > 0 ? Math.round((roundedRev / totalRevenue) * 1000) / 10 : 0;
    return {
      method,
      count,
      revenue: roundedRev,
      percentage,
    };
  });

  // 7. Order Type Breakdown (sum of revenues strictly equals totalRevenue)
  const extraTypes = new Set<string>();
  paidSales.forEach((tx) => {
    const type = tx.type || 'Other';
    if (!STANDARD_ORDER_TYPES.includes(type)) {
      extraTypes.add(type);
    }
  });

  const allOrderTypes = [...STANDARD_ORDER_TYPES, ...Array.from(extraTypes)];
  const orderTypeSummary: OrderTypeSummaryItem[] = allOrderTypes.map((type) => {
    const typeSales = paidSales.filter((tx) => (tx.type || 'Other') === type);
    const count = typeSales.length;
    const typeRev = typeSales.reduce((sum, tx) => sum + (tx.amount > 0 ? tx.amount : 0), 0);
    const roundedRev = Math.round(typeRev * 100) / 100;
    const percentage = totalRevenue > 0 ? Math.round((roundedRev / totalRevenue) * 1000) / 10 : 0;
    return {
      type,
      count,
      revenue: roundedRev,
      percentage,
    };
  });

  return {
    totalRevenue,
    completedCount,
    averageOrderValue,
    totalCost,
    profit,
    profitMargin,
    hasCostData,
    paymentSummary,
    orderTypeSummary,
  };
}
