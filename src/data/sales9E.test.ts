/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import { TRANSACTIONS_DATA } from './mockData';
import { Transaction } from '../types';
import { calculateSalesSummary } from '../utils/salesSummary';
import { filterSales } from '../utils/salesFilters';

console.log('--- Running Complete Step 9E Sales Summary Verification Tests ---');

// ==========================================
// 1. Revenue
// ==========================================
{
  const singlePaidSale: Transaction = {
    id: 'tx-rev-1',
    orderNumber: '#TX-REV1',
    dateTime: 'Oct 24, 12:00',
    table: 'Table 01',
    type: 'Dine-in',
    amount: 33.50,
    status: 'Receipt',
    paymentStatus: 'Paid',
    paymentMethod: 'Credit Card',
  };

  const summary = calculateSalesSummary([singlePaidSale]);
  assert.strictEqual(summary.totalRevenue, 33.50, 'Total revenue must equal 33.50 for single sale');
  assert.strictEqual(summary.completedCount, 1, 'Completed count must equal 1 for single sale');

  const multipleSales: Transaction[] = [
    singlePaidSale,
    {
      id: 'tx-rev-2',
      orderNumber: '#TX-REV2',
      dateTime: 'Oct 24, 12:15',
      table: 'Pickup',
      type: 'Takeaway',
      amount: 45.00,
      status: 'Completed',
      paymentStatus: 'Paid',
      paymentMethod: 'Cash',
    },
    {
      id: 'tx-rev-refund',
      orderNumber: '#TX-REV3',
      dateTime: 'Oct 24, 12:30',
      table: 'Table 02',
      type: 'Dine-in',
      amount: -18.00,
      status: 'Refunded',
      paymentStatus: 'Refunded',
      paymentMethod: 'Credit Card',
    },
  ];

  const multiSummary = calculateSalesSummary(multipleSales);
  assert.strictEqual(multiSummary.totalRevenue, 78.50, 'Total revenue must equal 33.50 + 45.00 = 78.50 (refund excluded)');
  assert.strictEqual(multiSummary.completedCount, 2, 'Completed count must equal 2 (refund excluded)');

  console.log('✓ 1. Revenue: accurately calculated from completed/paid sales and excludes refunds.');
}

// ==========================================
// 2. Sales Count
// ==========================================
{
  const summary = calculateSalesSummary(TRANSACTIONS_DATA);
  // In TRANSACTIONS_DATA, 7 are paid, 1 is refunded
  assert.strictEqual(summary.completedCount, 7, 'Completed sales count must equal 7 in unfiltered dataset');
  assert.strictEqual(summary.averageOrderValue, Math.round((82348.50 / 7) * 100) / 100, 'AOV matches revenue / count');

  // Verify sales count updates with filters
  const cashFiltered = filterSales(TRANSACTIONS_DATA, { paymentMethod: 'Cash' });
  const cashSummary = calculateSalesSummary(cashFiltered);
  assert.strictEqual(cashSummary.completedCount, 2, 'Cash filter must yield 2 completed sales');

  console.log('✓ 2. Sales Count: updates dynamically with applicable completed sales count.');
}

// ==========================================
// 3. Cost Calculation
// ==========================================
{
  // Test single sale with cost
  const saleWithCost: Transaction = {
    id: 'tx-cost-1',
    orderNumber: '#TX-C1',
    dateTime: 'Oct 24, 13:00',
    table: 'Table 05',
    type: 'Dine-in',
    amount: 50.00,
    status: 'Receipt',
    paymentStatus: 'Paid',
    items: [
      { name: 'Ramen', quantity: 2, unitPrice: 15.00, cost: 4.50 }, // cost = 9.00
      { name: 'Gyoza', quantity: 1, unitPrice: 7.00, cost: 2.00 },  // cost = 2.00
    ],
  };

  const summaryWithCost = calculateSalesSummary([saleWithCost]);
  assert.strictEqual(summaryWithCost.totalCost, 11.00, 'Total cost must equal (4.50*2) + (2.00*1) = 11.00');
  assert.strictEqual(summaryWithCost.hasCostData, true, 'hasCostData flag must be true when items contain cost');

  // Test multiple sales with cost and quantity > 1
  const multiSaleWithCost: Transaction[] = [
    saleWithCost,
    {
      id: 'tx-cost-2',
      orderNumber: '#TX-C2',
      dateTime: 'Oct 24, 13:30',
      table: 'Pickup',
      type: 'Takeaway',
      amount: 30.00,
      status: 'Receipt',
      paymentStatus: 'Paid',
      items: [
        { name: 'Sushi Combo', quantity: 3, unitPrice: 10.00, cost: 3.50 }, // cost = 10.50
      ],
    },
  ];

  const multiCostSummary = calculateSalesSummary(multiSaleWithCost);
  assert.strictEqual(multiCostSummary.totalCost, 21.50, 'Total cost must equal 11.00 + 10.50 = 21.50');

  // Test zero sales cost
  const zeroCostSummary = calculateSalesSummary([]);
  assert.strictEqual(zeroCostSummary.totalCost, 0, 'Zero sales must yield 0 cost');
  assert.strictEqual(zeroCostSummary.hasCostData, false, 'hasCostData must be false for empty dataset');

  // Existing mock data check (schema lacks cost field on existing mock items)
  const mockSummary = calculateSalesSummary(TRANSACTIONS_DATA);
  assert.strictEqual(mockSummary.totalCost, 0, 'Existing mock data without item cost fields safely produces 0 cost');
  assert.strictEqual(mockSummary.hasCostData, false, 'hasCostData is false when mock schema lacks cost');

  console.log('✓ 3. Cost Calculation: supports sum(product cost * quantity) for single, multiple, and quantity > 1.');
}

// ==========================================
// 4. Profit Calculation
// ==========================================
{
  const saleForProfit: Transaction = {
    id: 'tx-prof-1',
    orderNumber: '#TX-P1',
    dateTime: 'Oct 24, 14:00',
    table: 'Table 01',
    type: 'Dine-in',
    amount: 100.00,
    status: 'Receipt',
    paymentStatus: 'Paid',
    items: [
      { name: 'Steak', quantity: 2, unitPrice: 50.00, cost: 20.00 }, // cost = 40.00
    ],
  };

  const profSummary = calculateSalesSummary([saleForProfit]);
  assert.strictEqual(profSummary.totalRevenue, 100.00, 'Revenue must be 100.00');
  assert.strictEqual(profSummary.totalCost, 40.00, 'Cost must be 40.00');
  assert.strictEqual(profSummary.profit, 60.00, 'Profit must equal Revenue - Cost = 60.00');
  assert.strictEqual(profSummary.profitMargin, 60.0, 'Profit margin must be 60.0%');

  // Mathematical verification: Profit === Revenue - Cost
  assert.strictEqual(profSummary.profit, profSummary.totalRevenue - profSummary.totalCost, 'Mathematical invariant: Profit === Revenue - Cost');

  // Zero sales profit check
  const zeroProfSummary = calculateSalesSummary([]);
  assert.strictEqual(zeroProfSummary.profit, 0, 'Zero sales profit must equal 0');
  assert.strictEqual(zeroProfSummary.profitMargin, 0, 'Zero sales margin must equal 0 without NaN');

  console.log('✓ 4. Profit Calculation: verified Profit === Revenue - Cost and profit margin percentage.');
}

// ==========================================
// 5. Payment Summary
// ==========================================
{
  const summary = calculateSalesSummary(TRANSACTIONS_DATA);
  const paymentBreakdown = summary.paymentSummary;

  assert(Array.isArray(paymentBreakdown), 'Payment summary must be an array');
  assert(paymentBreakdown.length >= 4, 'Must have at least standard 4 payment methods');

  const cashItem = paymentBreakdown.find((p) => p.method === 'Cash');
  const ccItem = paymentBreakdown.find((p) => p.method === 'Credit Card');
  const qrItem = paymentBreakdown.find((p) => p.method === 'QR Code');
  const dwItem = paymentBreakdown.find((p) => p.method === 'Digital Wallet');

  assert(cashItem && cashItem.count === 2, 'Cash should have 2 paid transactions');
  assert(ccItem && ccItem.count === 3, 'Credit Card should have 3 paid transactions (refund excluded)');
  assert(qrItem && qrItem.count === 1, 'QR Code should have 1 paid transaction');
  assert(dwItem && dwItem.count === 1, 'Digital Wallet should have 1 paid transaction');

  // Mathematical verification: Payment breakdown total === filtered revenue
  const totalPaymentRev = Math.round(paymentBreakdown.reduce((sum, p) => sum + p.revenue, 0) * 100) / 100;
  assert.strictEqual(totalPaymentRev, summary.totalRevenue, 'Mathematical invariant: Payment breakdown total === filtered revenue');

  console.log('✓ 5. Payment Summary: counts and revenue verified by payment method; sum strictly equals total revenue.');
}

// ==========================================
// 6. Order Type Summary
// ==========================================
{
  const summary = calculateSalesSummary(TRANSACTIONS_DATA);
  const orderTypeBreakdown = summary.orderTypeSummary;

  assert(Array.isArray(orderTypeBreakdown), 'Order type summary must be an array');
  assert(orderTypeBreakdown.length >= 2, 'Must have Dine-in and Takeaway');

  const dineInItem = orderTypeBreakdown.find((o) => o.type === 'Dine-in');
  const takeawayItem = orderTypeBreakdown.find((o) => o.type === 'Takeaway');

  assert(dineInItem && dineInItem.count === 5, 'Dine-in should have 5 paid transactions (refund excluded)');
  assert(takeawayItem && takeawayItem.count === 2, 'Takeaway should have 2 paid transactions');

  // Mathematical verification: Order-type breakdown total === filtered revenue
  const totalOrderTypeRev = Math.round(orderTypeBreakdown.reduce((sum, o) => sum + o.revenue, 0) * 100) / 100;
  assert.strictEqual(totalOrderTypeRev, summary.totalRevenue, 'Mathematical invariant: Order-type breakdown total === filtered revenue');

  console.log('✓ 6. Order Type Summary: counts and revenue verified for Dine-in and Takeaway; sum strictly equals total revenue.');
}

// ==========================================
// 7. Zero Results
// ==========================================
{
  const emptySummary = calculateSalesSummary([]);
  assert.strictEqual(emptySummary.totalRevenue, 0, 'Revenue = 0 for empty results');
  assert.strictEqual(emptySummary.completedCount, 0, 'Sales Count = 0 for empty results');
  assert.strictEqual(emptySummary.totalCost, 0, 'Cost = 0 for empty results');
  assert.strictEqual(emptySummary.profit, 0, 'Profit = 0 for empty results');
  assert.strictEqual(emptySummary.averageOrderValue, 0, 'AOV = 0 for empty results');

  const paymentSum = emptySummary.paymentSummary.reduce((sum, p) => sum + p.revenue, 0);
  assert.strictEqual(paymentSum, 0, 'Payment breakdown revenue sum = 0 for empty results');

  const orderTypeSum = emptySummary.orderTypeSummary.reduce((sum, o) => sum + o.revenue, 0);
  assert.strictEqual(orderTypeSum, 0, 'Order type breakdown revenue sum = 0 for empty results');

  console.log('✓ 7. Zero Results: all summary metrics safely return 0 without NaN or exceptions.');
}

// ==========================================
// 8. Search-Filtered Summary
// ==========================================
{
  const searchSales = filterSales(TRANSACTIONS_DATA, { searchQuery: 'Salmon' });
  const searchSummary = calculateSalesSummary(searchSales);

  assert.strictEqual(searchSummary.completedCount, 2, 'Search "Salmon" matches 2 sales');
  assert.strictEqual(searchSummary.totalRevenue, 178.50, 'Search "Salmon" revenue is $178.50');

  // Breakdown checks for filtered subset
  const paySum = Math.round(searchSummary.paymentSummary.reduce((sum, p) => sum + p.revenue, 0) * 100) / 100;
  assert.strictEqual(paySum, searchSummary.totalRevenue, 'Search filtered payment breakdown equals revenue');

  const typeSum = Math.round(searchSummary.orderTypeSummary.reduce((sum, o) => sum + o.revenue, 0) * 100) / 100;
  assert.strictEqual(typeSum, searchSummary.totalRevenue, 'Search filtered order type breakdown equals revenue');

  console.log('✓ 8. Search-Filtered Summary: correctly calculates metrics and breakdowns for search query.');
}

// ==========================================
// 9. Payment-Filtered Summary
// ==========================================
{
  const cardSales = filterSales(TRANSACTIONS_DATA, { paymentMethod: 'Credit Card' });
  const cardSummary = calculateSalesSummary(cardSales);

  assert.strictEqual(cardSummary.completedCount, 3, 'Credit Card paid count is 3 (1 refund excluded)');
  assert.strictEqual(cardSummary.totalRevenue, 256.50, 'Credit Card revenue is $256.50');

  const cardPayItem = cardSummary.paymentSummary.find((p) => p.method === 'Credit Card');
  assert.strictEqual(cardPayItem?.revenue, 256.50, 'Credit card item in breakdown matches filtered revenue');
  assert.strictEqual(cardPayItem?.percentage, 100, 'Credit card is 100% of filtered revenue');

  console.log('✓ 9. Payment-Filtered Summary: accurately isolates metrics for selected payment method.');
}

// ==========================================
// 10. Order-Type-Filtered Summary
// ==========================================
{
  const takeawaySales = filterSales(TRANSACTIONS_DATA, { orderType: 'Takeaway' });
  const takeawaySummary = calculateSalesSummary(takeawaySales);

  assert.strictEqual(takeawaySummary.completedCount, 2, 'Takeaway count is 2');
  assert.strictEqual(takeawaySummary.totalRevenue, 91.50, 'Takeaway revenue is $91.50');

  const takeawayTypeItem = takeawaySummary.orderTypeSummary.find((o) => o.type === 'Takeaway');
  assert.strictEqual(takeawayTypeItem?.revenue, 91.50, 'Takeaway breakdown item matches filtered revenue');
  assert.strictEqual(takeawayTypeItem?.percentage, 100, 'Takeaway is 100% of filtered revenue');

  console.log('✓ 10. Order-Type-Filtered Summary: accurately isolates metrics for selected order type.');
}

// ==========================================
// 11. Status-Filtered Summary
// ==========================================
{
  const paidOnly = filterSales(TRANSACTIONS_DATA, { status: 'paid' });
  const paidSummary = calculateSalesSummary(paidOnly);
  assert.strictEqual(paidSummary.completedCount, 7, 'Paid status matches 7 sales');
  assert.strictEqual(paidSummary.totalRevenue, 82348.50, 'Paid status revenue is 82,348.50');

  const refundedOnly = filterSales(TRANSACTIONS_DATA, { status: 'refunded' });
  const refundedSummary = calculateSalesSummary(refundedOnly);
  assert.strictEqual(refundedSummary.completedCount, 0, 'Refunded status has 0 paid sales');
  assert.strictEqual(refundedSummary.totalRevenue, 0, 'Refunded status has 0 paid revenue');

  console.log('✓ 11. Status-Filtered Summary: properly distinguishes paid vs refunded sales.');
}

// ==========================================
// 12. Date-Filtered Summary
// ==========================================
{
  const refDate = new Date('2026-10-24T20:00:00');

  // Today
  const todaySales = filterSales(TRANSACTIONS_DATA, { dateRangePreset: 'today', refDate });
  const todaySummary = calculateSalesSummary(todaySales);
  assert.strictEqual(todaySummary.completedCount, 7, 'Today filter matches 7 completed sales');

  // Yesterday
  const yesterdaySales = filterSales(TRANSACTIONS_DATA, { dateRangePreset: 'yesterday', refDate });
  const yesterdaySummary = calculateSalesSummary(yesterdaySales);
  assert.strictEqual(yesterdaySummary.completedCount, 0, 'Yesterday filter matches 0 sales');
  assert.strictEqual(yesterdaySummary.totalRevenue, 0, 'Yesterday revenue is 0');

  console.log('✓ 12. Date-Filtered Summary: accurately computes metrics for active date ranges.');
}

// ==========================================
// 13. Combined Filters
// ==========================================
{
  const refDate = new Date('2026-10-24T20:00:00');

  // All 5 filters simultaneously active: Search + Payment + Order Type + Status + Date
  const comboSales = filterSales(TRANSACTIONS_DATA, {
    searchQuery: 'Kenji',
    paymentMethod: 'Credit Card',
    orderType: 'Dine-in',
    status: 'paid',
    dateRangePreset: 'today',
    refDate,
  });

  const comboSummary = calculateSalesSummary(comboSales);
  assert.strictEqual(comboSummary.completedCount, 1, 'Simultaneous 5-filter combination matches 1 sale');
  assert.strictEqual(comboSummary.totalRevenue, 33.50, 'Combo revenue is $33.50');
  assert.strictEqual(comboSummary.profit, 33.50, 'Profit equals Revenue - 0 cost = 33.50');

  // Conflicting combined filter -> 0 matches
  const conflictSales = filterSales(TRANSACTIONS_DATA, {
    searchQuery: 'Kenji',
    paymentMethod: 'Cash', // Kenji paid with Credit Card
  });
  const conflictSummary = calculateSalesSummary(conflictSales);
  assert.strictEqual(conflictSummary.completedCount, 0, 'Conflicting combination yields 0 count');
  assert.strictEqual(conflictSummary.totalRevenue, 0, 'Conflicting combination yields 0 revenue');

  console.log('✓ 13. Combined Filters: verified 5-filter simultaneous combination and zero-match conflict handling.');
}

// ==========================================
// 14. Reset Filters
// ==========================================
{
  const initialSummary = calculateSalesSummary(TRANSACTIONS_DATA);

  // Apply filter
  const filteredSales = filterSales(TRANSACTIONS_DATA, { searchQuery: 'Sarah' });
  const filteredSummary = calculateSalesSummary(filteredSales);
  assert.strictEqual(filteredSummary.completedCount, 1, 'Filtered count is 1');

  // Reset filter by providing empty criteria
  const resetSales = filterSales(TRANSACTIONS_DATA, {});
  const resetSummary = calculateSalesSummary(resetSales);
  assert.strictEqual(resetSummary.completedCount, initialSummary.completedCount, 'Reset filter restores completed count');
  assert.strictEqual(resetSummary.totalRevenue, initialSummary.totalRevenue, 'Reset filter restores total revenue');

  console.log('✓ 14. Reset Filters: clearing filters restores 100% of baseline summary metrics.');
}

// ==========================================
// 15. Same-Day Range
// ==========================================
{
  const sameDaySales = filterSales(TRANSACTIONS_DATA, {
    dateRangePreset: 'custom',
    customStart: '2026-10-24',
    customEnd: '2026-10-24',
  });
  const sameDaySummary = calculateSalesSummary(sameDaySales);
  assert.strictEqual(sameDaySummary.completedCount, 7, 'Same-day range includes full day transactions');

  console.log('✓ 15. Same-Day Range: full-day 00:00:00 to 23:59:59.999 inclusion verified.');
}

// ==========================================
// 16. Cross-Month Range
// ==========================================
{
  const crossMonthSales = filterSales(TRANSACTIONS_DATA, {
    dateRangePreset: 'custom',
    customStart: '2026-09-15',
    customEnd: '2026-10-31',
  });
  const crossMonthSummary = calculateSalesSummary(crossMonthSales);
  assert.strictEqual(crossMonthSummary.completedCount, 7, 'Cross-month range correctly captures October sales');

  console.log('✓ 16. Cross-Month Range: verified multi-month range calculations.');
}

// ==========================================
// 17. Cross-Year Range
// ==========================================
{
  const crossYearSales = filterSales(TRANSACTIONS_DATA, {
    dateRangePreset: 'custom',
    customStart: '2025-11-01',
    customEnd: '2026-11-01',
  });
  const crossYearSummary = calculateSalesSummary(crossYearSales);
  assert.strictEqual(crossYearSummary.completedCount, 7, 'Cross-year range correctly captures 2026 sales');

  console.log('✓ 17. Cross-Year Range: verified cross-year range calculations.');
}

// ==========================================
// Mathematical Invariants & Immutability Verification
// ==========================================
{
  const snapshotBefore = JSON.stringify(TRANSACTIONS_DATA);

  const summary = calculateSalesSummary(TRANSACTIONS_DATA);

  // 1. Profit = Revenue - Cost
  assert.strictEqual(summary.profit, Math.round((summary.totalRevenue - summary.totalCost) * 100) / 100, 'Profit must equal Revenue - Cost');

  // 2. Payment breakdown total = filtered revenue
  const paymentTotal = Math.round(summary.paymentSummary.reduce((sum, p) => sum + p.revenue, 0) * 100) / 100;
  assert.strictEqual(paymentTotal, summary.totalRevenue, 'Payment breakdown sum must strictly equal filtered revenue');

  // 3. Order-type breakdown total = filtered revenue
  const orderTypeTotal = Math.round(summary.orderTypeSummary.reduce((sum, o) => sum + o.revenue, 0) * 100) / 100;
  assert.strictEqual(orderTypeTotal, summary.totalRevenue, 'Order-type breakdown sum must strictly equal filtered revenue');

  // 4. Sales count = number of applicable completed sales
  assert.strictEqual(summary.completedCount, 7, 'Sales count must strictly equal 7');

  // 5. Immutability
  const snapshotAfter = JSON.stringify(TRANSACTIONS_DATA);
  assert.strictEqual(snapshotAfter, snapshotBefore, 'Source transactions data must not be mutated');

  console.log('✓ Mathematical Verification: Profit = Revenue - Cost, Payment breakdown total = filtered revenue, Order-type breakdown total = filtered revenue, and Source Immutability verified.');
}

console.log('\n✔ All 17 Step 9E Sales Summary test suites and mathematical invariants passed successfully!\n');
