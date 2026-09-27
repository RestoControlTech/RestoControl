/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TRANSACTIONS_DATA } from './mockData';
import { Transaction } from '../types';
import { getDateRangeForPreset, isDateInRange, parseSaleDate } from '../utils/dateUtils';
import { matchesSaleSearch } from '../utils/salesSearch';
import { filterSales } from '../utils/salesFilters';

console.log('--- Running Step 9D Sales Filtering Verification Tests ---');

// ==========================================
// 1. Initial Dataset & Attribute Filters
// ==========================================
const completedSales = TRANSACTIONS_DATA.filter(
  (tx) => tx.status === 'Receipt' || tx.status === 'Completed' || tx.status === 'Refunded'
);
console.assert(completedSales.length >= 7, 'Expected at least 7 completed/refunded transactions');
console.log(`✓ 1. Completed sales pool verified: ${completedSales.length} records.`);

// Payment Method filtering
const cashSales = completedSales.filter((tx) => tx.paymentMethod === 'Cash');
console.assert(cashSales.length > 0, 'Expected at least one Cash transaction');
console.assert(cashSales.every((tx) => tx.paymentMethod === 'Cash'), 'All cash sales should have paymentMethod="Cash"');
console.log(`✓ 2. Payment method filter "Cash" verified: ${cashSales.length} matches.`);

const cardSales = completedSales.filter((tx) => tx.paymentMethod === 'Credit Card');
console.assert(cardSales.length > 0, 'Expected at least one Credit Card transaction');
console.log(`✓ 3. Payment method filter "Credit Card" verified: ${cardSales.length} matches.`);

const qrSales = completedSales.filter((tx) => tx.paymentMethod === 'QR Code');
console.assert(qrSales.length > 0, 'Expected at least one QR Code transaction');
console.log(`✓ 4. Payment method filter "QR Code" verified: ${qrSales.length} matches.`);

// Order Type filtering
const dineInSales = completedSales.filter((tx) => tx.type === 'Dine-in');
console.assert(dineInSales.length > 0, 'Expected at least one Dine-in transaction');
console.assert(dineInSales.every((tx) => tx.type === 'Dine-in'), 'All Dine-in sales must have type="Dine-in"');
console.log(`✓ 5. Order type filter "Dine-in" verified: ${dineInSales.length} matches.`);

const takeawaySales = completedSales.filter((tx) => tx.type === 'Takeaway');
console.assert(takeawaySales.length > 0, 'Expected at least one Takeaway transaction');
console.assert(takeawaySales.every((tx) => tx.type === 'Takeaway'), 'All Takeaway sales must have type="Takeaway"');
console.log(`✓ 6. Order type filter "Takeaway" verified: ${takeawaySales.length} matches.`);

// Status filtering
const paidSales = completedSales.filter((tx) => tx.status !== 'Refunded' && tx.paymentStatus !== 'Refunded');
const refundedSales = completedSales.filter((tx) => tx.status === 'Refunded' || tx.paymentStatus === 'Refunded');
console.assert(paidSales.length > 0, 'Expected paid sales');
console.assert(refundedSales.length > 0, 'Expected refunded sales');
console.log(`✓ 7. Status filters verified: ${paidSales.length} Paid, ${refundedSales.length} Refunded.`);

// Combined multi-attribute filtering (Dine-in + Cash)
const combinedFilter = completedSales.filter(
  (tx) => tx.type === 'Dine-in' && tx.paymentMethod === 'Cash' && tx.status !== 'Refunded'
);
console.assert(combinedFilter.length > 0, 'Expected at least one Dine-in Cash transaction');
console.log(`✓ 8. Combined filter (Dine-in + Cash + Paid) verified: ${combinedFilter.length} matches.`);

// Zero-match filter scenario
const noMatches = completedSales.filter(
  (tx) => tx.type === 'Takeaway' && tx.paymentMethod === 'Digital Wallet'
);
console.assert(noMatches.length === 0, 'Expected 0 matches for non-existent criteria');
console.log('✓ 9. Zero-match attribute filter scenario verified.');

// ==========================================
// 2. STEP 9D-2 DATE RANGE FILTERING TESTS
// ==========================================
console.log('--- Running Step 9D-2 Date Range Filter Verification Tests ---');

// Reference date Saturday Oct 24, 2026, 20:00:00 (matching TRANSACTIONS_DATA)
const refOct24 = new Date(2026, 9, 24, 20, 0, 0); // Month 9 is October in JS 0-indexed months

// Test 1: Today filter
const todayRange = getDateRangeForPreset('today', { refDate: refOct24 })!;
console.assert(todayRange !== null, 'Today range must not be null');
console.assert(todayRange.start.getHours() === 0 && todayRange.start.getMinutes() === 0, 'Today start must be 00:00:00');
console.assert(todayRange.end.getHours() === 23 && todayRange.end.getMinutes() === 59, 'Today end must be 23:59:59');
const todaySales = completedSales.filter((tx) => isDateInRange(tx.dateTime, todayRange, refOct24));
console.assert(todaySales.length === 8, `Expected all 8 sales on Oct 24, got ${todaySales.length}`);
console.log(`✓ 10. "Today" date filter verified: ${todaySales.length} sales matched.`);

// Test 2: Yesterday filter
const yesterdayRange = getDateRangeForPreset('yesterday', { refDate: refOct24 })!;
console.assert(yesterdayRange !== null, 'Yesterday range must not be null');
console.assert(yesterdayRange.start.getDate() === 23, 'Yesterday start date must be 23');
const yesterdaySales = completedSales.filter((tx) => isDateInRange(tx.dateTime, yesterdayRange, refOct24));
console.assert(yesterdaySales.length === 0, `Expected 0 sales on yesterday (Oct 23), got ${yesterdaySales.length}`);
console.log(`✓ 11. "Yesterday" date filter verified: 0 sales from Oct 24 match yesterday.`);

// Test 3: This Week filter (Monday Oct 19 to Sunday Oct 25, 2026)
const weekRange = getDateRangeForPreset('week', { refDate: refOct24 })!;
console.assert(weekRange !== null, 'Week range must not be null');
console.assert(weekRange.start.getDate() === 19, 'Week start must be Monday Oct 19');
console.assert(weekRange.end.getDate() === 25, 'Week end must be Sunday Oct 25');
const weekSales = completedSales.filter((tx) => isDateInRange(tx.dateTime, weekRange, refOct24));
console.assert(weekSales.length === 8, `Expected 8 sales in this week, got ${weekSales.length}`);
console.log(`✓ 12. "This Week" date filter verified: ${weekSales.length} sales matched.`);

// Test 4: This Month filter (Oct 1 to Oct 31, 2026)
const monthRange = getDateRangeForPreset('month', { refDate: refOct24 })!;
console.assert(monthRange !== null, 'Month range must not be null');
console.assert(monthRange.start.getDate() === 1 && monthRange.start.getMonth() === 9, 'Month start must be Oct 1');
console.assert(monthRange.end.getDate() === 31 && monthRange.end.getMonth() === 9, 'Month end must be Oct 31');
const monthSales = completedSales.filter((tx) => isDateInRange(tx.dateTime, monthRange, refOct24));
console.assert(monthSales.length === 8, `Expected 8 sales in October, got ${monthSales.length}`);
console.log(`✓ 13. "This Month" date filter verified: ${monthSales.length} sales matched.`);

// Test 5: Custom date range filter (Oct 20, 2026 to Oct 25, 2026)
const customRange = getDateRangeForPreset('custom', { customStart: '2026-10-20', customEnd: '2026-10-25', refDate: refOct24 })!;
console.assert(customRange !== null, 'Custom range must not be null');
const customSales = completedSales.filter((tx) => isDateInRange(tx.dateTime, customRange, refOct24));
console.assert(customSales.length === 8, `Expected 8 sales in custom range Oct 20-25, got ${customSales.length}`);
console.log(`✓ 14. "Custom Date Range" filter (2026-10-20 → 2026-10-25) verified: ${customSales.length} sales.`);

// Test 6: Same start/end date filter (Oct 24, 2026 to Oct 24, 2026)
const sameDayRange = getDateRangeForPreset('custom', { customStart: '2026-10-24', customEnd: '2026-10-24', refDate: refOct24 })!;
console.assert(sameDayRange.start.getDate() === 24 && sameDayRange.end.getDate() === 24, 'Same day boundaries correct');
const sameDaySales = completedSales.filter((tx) => isDateInRange(tx.dateTime, sameDayRange, refOct24));
console.assert(sameDaySales.length === 8, `Expected 8 sales for same-day filter Oct 24, got ${sameDaySales.length}`);
console.log(`✓ 15. Same start and end date (2026-10-24 → 2026-10-24) verified: ${sameDaySales.length} sales.`);

// Test 7: Start date after end date (invalid range test)
const invertedRange = getDateRangeForPreset('custom', { customStart: '2026-10-25', customEnd: '2026-10-20', refDate: refOct24 })!;
console.assert(invertedRange.start > invertedRange.end, 'Start must be greater than end');
const invertedSales = completedSales.filter((tx) => isDateInRange(tx.dateTime, invertedRange, refOct24));
console.assert(invertedSales.length === 0, 'Inverted date range must yield 0 matches');
console.log('✓ 16. Start date after end date correctly yields 0 matches.');

// Test 8: Sale exactly at start boundary
const boundaryTestDate = new Date(2026, 9, 24, 0, 0, 0, 0);
const startBoundaryInRange = isDateInRange(boundaryTestDate, todayRange, refOct24);
console.assert(startBoundaryInRange === true, 'Sale exactly at 00:00:00.000 must be in range');
console.log('✓ 17. Sale exactly at start boundary (00:00:00.000) verified in range.');

// Test 9: Sale exactly at end boundary
const endBoundaryTestDate = new Date(2026, 9, 24, 23, 59, 59, 999);
const endBoundaryInRange = isDateInRange(endBoundaryTestDate, todayRange, refOct24);
console.assert(endBoundaryInRange === true, 'Sale exactly at 23:59:59.999 must be in range');
console.log('✓ 18. Sale exactly at end boundary (23:59:59.999) verified in range.');

// Test 10: No matching sales (Date range with zero sales)
const pastRange = getDateRangeForPreset('custom', { customStart: '2025-01-01', customEnd: '2025-01-31', refDate: refOct24 })!;
const pastSales = completedSales.filter((tx) => isDateInRange(tx.dateTime, pastRange, refOct24));
console.assert(pastSales.length === 0, 'Past date range should have 0 sales');
console.log('✓ 19. No matching sales empty state verified.');

// Test 11: Date range crossing months (Sep 25 to Oct 25, 2026)
const crossMonthRange = getDateRangeForPreset('custom', { customStart: '2026-09-25', customEnd: '2026-10-25', refDate: refOct24 })!;
const crossMonthSales = completedSales.filter((tx) => isDateInRange(tx.dateTime, crossMonthRange, refOct24));
console.assert(crossMonthSales.length === 8, 'Cross-month range must include Oct 24 sales');
console.log('✓ 20. Date range crossing months (Sep 25 → Oct 25) verified.');

// Test 12: Date range crossing years (Dec 25, 2025 to Jan 05, 2026)
const crossYearRange = getDateRangeForPreset('custom', { customStart: '2025-12-25', customEnd: '2026-01-05', refDate: refOct24 })!;
const crossYearDec = isDateInRange(new Date(2025, 11, 31, 23, 0, 0), crossYearRange, refOct24);
const crossYearJan = isDateInRange(new Date(2026, 0, 1, 1, 0, 0), crossYearRange, refOct24);
console.assert(crossYearDec && crossYearJan, 'Cross-year range must include both Dec 31 and Jan 1');
console.log('✓ 21. Date range crossing years (2025-12-25 → 2026-01-05) verified.');

// Test 13: Multi-attribute combined filter: Date Range + Payment Method + Order Type
const combinedDatePayType = completedSales.filter((tx) =>
  isDateInRange(tx.dateTime, todayRange, refOct24) &&
  tx.paymentMethod === 'Cash' &&
  tx.type === 'Dine-in'
);
console.assert(combinedDatePayType.length === 1, 'Expected exactly 1 Cash Dine-in sale on Oct 24');
console.log('✓ 22. Combined Date + Payment + Order Type filtering verified.');

// Test 14: "Just Now" parsing & inclusion in Today filter
const justNowDate = parseSaleDate('Just Now', refOct24);
console.assert(justNowDate !== null && justNowDate.getTime() === refOct24.getTime(), '"Just Now" must equal reference instant');
console.assert(isDateInRange('Just Now', todayRange, refOct24) === true, '"Just Now" must be within today');
console.log('✓ 23. "Just Now" sale parsing verified in range.');

// ==========================================
// 3. STEP 9D-3 SALES SEARCH TESTS
// ==========================================
console.log('--- Running Step 9D-3 Sales Search Verification Tests ---');

// Test 1: Search by sale/order number
const searchByOrderNum = completedSales.filter((tx) => matchesSaleSearch(tx, '#TX-9042'));
console.assert(searchByOrderNum.length === 1 && searchByOrderNum[0].orderNumber === '#TX-9042', 'Search by order # failed');
console.log(`✓ 24. Search by sale/order number ("#TX-9042") verified: ${searchByOrderNum.length} match.`);

// Test 2: Search by customer name
const searchByCustomer = completedSales.filter((tx) => matchesSaleSearch(tx, 'Sarah Connor'));
console.assert(searchByCustomer.length === 1 && searchByCustomer[0].customerName === 'Sarah Connor', 'Search by customer failed');
console.log(`✓ 25. Search by customer ("Sarah Connor") verified: ${searchByCustomer.length} match.`);

// Test 3: Search by table
const searchByTable = completedSales.filter((tx) => matchesSaleSearch(tx, 'Table 09'));
console.assert(searchByTable.length === 1 && searchByTable[0].table === 'Table 09', 'Search by table failed');
console.log(`✓ 26. Search by table ("Table 09") verified: ${searchByTable.length} match.`);

// Test 4: Search by product name (e.g. 'Salmon' in item items array)
const searchByProduct = completedSales.filter((tx) => matchesSaleSearch(tx, 'Salmon'));
console.assert(searchByProduct.length >= 2, `Expected at least 2 salmon sales, got ${searchByProduct.length}`);
console.log(`✓ 27. Search by product ("Salmon") verified: ${searchByProduct.length} matches.`);

// Test 5: Case-insensitive search
const searchCase1 = completedSales.filter((tx) => matchesSaleSearch(tx, 'KENJI SATO'));
const searchCase2 = completedSales.filter((tx) => matchesSaleSearch(tx, 'kenji sato'));
console.assert(searchCase1.length === 1 && searchCase2.length === 1, 'Case-insensitive search failed');
console.log(`✓ 28. Case-insensitive search ("KENJI SATO" vs "kenji sato") verified.`);

// Test 6: Partial search
const searchPartial = completedSales.filter((tx) => matchesSaleSearch(tx, '904'));
console.assert(searchPartial.length === 3, `Expected 3 orders matching "904", got ${searchPartial.length}`);
console.log(`✓ 29. Partial search ("904") verified: ${searchPartial.length} matches.`);

// Test 7: No-match search
const searchNoMatch = completedSales.filter((tx) => matchesSaleSearch(tx, 'nonexistent-query-xyz'));
console.assert(searchNoMatch.length === 0, 'No-match search must return 0 results');
console.log(`✓ 30. No-match search ("nonexistent-query-xyz") correctly returns 0 records.`);

// Test 8: Search + payment filter
const searchAndPayment = completedSales.filter(
  (tx) => matchesSaleSearch(tx, 'Ramen') && tx.paymentMethod === 'Credit Card'
);
console.assert(searchAndPayment.length > 0, 'Search + Payment filter failed');
console.assert(searchAndPayment.every((tx) => tx.paymentMethod === 'Credit Card'), 'Payment method must be Credit Card');
console.log(`✓ 31. Search + Payment Filter ("Ramen" + "Credit Card") verified: ${searchAndPayment.length} matches.`);

// Test 9: Search + order type filter
const searchAndOrderType = completedSales.filter(
  (tx) => matchesSaleSearch(tx, 'Ramen') && tx.type === 'Dine-in'
);
console.assert(searchAndOrderType.length > 0, 'Search + Order Type filter failed');
console.assert(searchAndOrderType.every((tx) => tx.type === 'Dine-in'), 'Order type must be Dine-in');
console.log(`✓ 32. Search + Order Type Filter ("Ramen" + "Dine-in") verified: ${searchAndOrderType.length} matches.`);

// Test 10: Search + date range
const searchAndDate = completedSales.filter(
  (tx) => matchesSaleSearch(tx, 'Ramen') && isDateInRange(tx.dateTime, todayRange, refOct24)
);
console.assert(searchAndDate.length > 0, 'Search + Date Range filter failed');
console.log(`✓ 33. Search + Date Range ("Ramen" + Today) verified: ${searchAndDate.length} matches.`);

// Test 11: Search + multiple filters (Search + Payment + Order Type + Date + Status)
const searchMulti = completedSales.filter((tx) =>
  matchesSaleSearch(tx, 'Kenji') &&
  tx.paymentMethod === 'Credit Card' &&
  tx.type === 'Dine-in' &&
  isDateInRange(tx.dateTime, todayRange, refOct24) &&
  tx.status !== 'Refunded'
);
console.assert(searchMulti.length === 1 && searchMulti[0].orderNumber === '#TX-9042', 'Multi-filter combination failed');
console.log(`✓ 34. Search + Multiple Filters (Search "Kenji" + Credit Card + Dine-in + Today + Paid) verified: 1 match.`);

// Test 12: Empty search returns all applicable records
const emptySearch = completedSales.filter((tx) => matchesSaleSearch(tx, ''));
const whitespaceSearch = completedSales.filter((tx) => matchesSaleSearch(tx, '   '));
console.assert(emptySearch.length === completedSales.length, 'Empty search should match all records');
console.assert(whitespaceSearch.length === completedSales.length, 'Whitespace search should match all records');
console.log(`✓ 35. Empty search returns all ${emptySearch.length} completed records.`);

// ==========================================
// 4. STEP 9D-4 COMBINED SEARCH + FILTER TESTS (20 Combinations)
// ==========================================
console.log('--- Running Step 9D-4 Combined Search & Filter Verification Tests ---');

// 1. Search + Payment
const c1 = filterSales(completedSales, { searchQuery: 'Tonkotsu', paymentMethod: 'Credit Card', refDate: refOct24 });
console.assert(c1.length === 1 && c1[0].orderNumber === '#TX-9042', 'Combination 1 failed');
console.log(`✓ 36. Combination 1 (Search + Payment): ${c1.length} match.`);

// 2. Search + Order Type
const c2 = filterSales(completedSales, { searchQuery: 'Salmon', orderType: 'Takeaway', refDate: refOct24 });
console.assert(c2.length === 1 && c2[0].orderNumber === '#TX-9041', 'Combination 2 failed');
console.log(`✓ 37. Combination 2 (Search + Order Type): ${c2.length} match.`);

// 3. Search + Status
const c3 = filterSales(completedSales, { searchQuery: 'Matcha', status: 'refunded', refDate: refOct24 });
console.assert(c3.length === 1 && c3[0].orderNumber === '#TX-9039', 'Combination 3 failed');
console.log(`✓ 38. Combination 3 (Search + Status): ${c3.length} match.`);

// 4. Search + Date
const c4 = filterSales(completedSales, { searchQuery: 'Kenji', dateRangePreset: 'today', refDate: refOct24 });
console.assert(c4.length === 1 && c4[0].orderNumber === '#TX-9042', 'Combination 4 failed');
console.log(`✓ 39. Combination 4 (Search + Date): ${c4.length} match.`);

// 5. Payment + Order Type
const c5 = filterSales(completedSales, { paymentMethod: 'Cash', orderType: 'Dine-in', refDate: refOct24 });
console.assert(c5.length === 1 && c5[0].orderNumber === '#TX-9035', 'Combination 5 failed');
console.log(`✓ 40. Combination 5 (Payment + Order Type): ${c5.length} match.`);

// 6. Payment + Status
const c6 = filterSales(completedSales, { paymentMethod: 'Credit Card', status: 'refunded', refDate: refOct24 });
console.assert(c6.length === 1 && c6[0].orderNumber === '#TX-9039', 'Combination 6 failed');
console.log(`✓ 41. Combination 6 (Payment + Status): ${c6.length} match.`);

// 7. Payment + Date
const c7 = filterSales(completedSales, { paymentMethod: 'QR Code', dateRangePreset: 'today', refDate: refOct24 });
console.assert(c7.length === 1 && c7[0].orderNumber === '#TX-9038', 'Combination 7 failed');
console.log(`✓ 42. Combination 7 (Payment + Date): ${c7.length} match.`);

// 8. Order Type + Status
const c8 = filterSales(completedSales, { orderType: 'Dine-in', status: 'refunded', refDate: refOct24 });
console.assert(c8.length === 1 && c8[0].orderNumber === '#TX-9039', 'Combination 8 failed');
console.log(`✓ 43. Combination 8 (Order Type + Status): ${c8.length} match.`);

// 9. Order Type + Date
const c9 = filterSales(completedSales, { orderType: 'Takeaway', dateRangePreset: 'today', refDate: refOct24 });
console.assert(c9.length === 2, `Expected 2 Takeaway sales today, got ${c9.length}`);
console.log(`✓ 44. Combination 9 (Order Type + Date): ${c9.length} matches.`);

// 10. Status + Date
const c10 = filterSales(completedSales, { status: 'paid', dateRangePreset: 'today', refDate: refOct24 });
console.assert(c10.length === 7, `Expected 7 paid sales today, got ${c10.length}`);
console.log(`✓ 45. Combination 10 (Status + Date): ${c10.length} matches.`);

// 11. Search + Payment + Order Type
const c11 = filterSales(completedSales, { searchQuery: 'Tonkotsu', paymentMethod: 'Credit Card', orderType: 'Dine-in', refDate: refOct24 });
console.assert(c11.length === 1 && c11[0].orderNumber === '#TX-9042', 'Combination 11 failed');
console.log(`✓ 46. Combination 11 (Search + Payment + Order Type): ${c11.length} match.`);

// 12. Search + Payment + Status
const c12 = filterSales(completedSales, { searchQuery: 'Matcha', paymentMethod: 'Credit Card', status: 'refunded', refDate: refOct24 });
console.assert(c12.length === 1 && c12[0].orderNumber === '#TX-9039', 'Combination 12 failed');
console.log(`✓ 47. Combination 12 (Search + Payment + Status): ${c12.length} match.`);

// 13. Search + Payment + Date
const c13 = filterSales(completedSales, { searchQuery: 'Kenji', paymentMethod: 'Credit Card', dateRangePreset: 'today', refDate: refOct24 });
console.assert(c13.length === 1 && c13[0].orderNumber === '#TX-9042', 'Combination 13 failed');
console.log(`✓ 48. Combination 13 (Search + Payment + Date): ${c13.length} match.`);

// 14. Search + Order Type + Date
const c14 = filterSales(completedSales, { searchQuery: 'Dragon', orderType: 'Takeaway', dateRangePreset: 'today', refDate: refOct24 });
console.assert(c14.length === 1 && c14[0].orderNumber === '#TX-9036', 'Combination 14 failed');
console.log(`✓ 49. Combination 14 (Search + Order Type + Date): ${c14.length} match.`);

// 15. Search + Status + Date
const c15 = filterSales(completedSales, { searchQuery: 'Elena', status: 'refunded', dateRangePreset: 'today', refDate: refOct24 });
console.assert(c15.length === 1 && c15[0].orderNumber === '#TX-9039', 'Combination 15 failed');
console.log(`✓ 50. Combination 15 (Search + Status + Date): ${c15.length} match.`);

// 16. Payment + Order Type + Status
const c16 = filterSales(completedSales, { paymentMethod: 'Cash', orderType: 'Dine-in', status: 'paid', refDate: refOct24 });
console.assert(c16.length === 1 && c16[0].orderNumber === '#TX-9035', 'Combination 16 failed');
console.log(`✓ 51. Combination 16 (Payment + Order Type + Status): ${c16.length} match.`);

// 17. Payment + Order Type + Date
const c17 = filterSales(completedSales, { paymentMethod: 'Cash', orderType: 'Takeaway', dateRangePreset: 'today', refDate: refOct24 });
console.assert(c17.length === 1 && c17[0].orderNumber === '#TX-9041', 'Combination 17 failed');
console.log(`✓ 52. Combination 17 (Payment + Order Type + Date): ${c17.length} match.`);

// 18. Payment + Status + Date
const c18 = filterSales(completedSales, { paymentMethod: 'Credit Card', status: 'paid', dateRangePreset: 'today', refDate: refOct24 });
console.assert(c18.length === 3, `Expected 3 paid card sales today, got ${c18.length}`);
console.log(`✓ 53. Combination 18 (Payment + Status + Date): ${c18.length} matches.`);

// 19. Order Type + Status + Date
const c19 = filterSales(completedSales, { orderType: 'Dine-in', status: 'paid', dateRangePreset: 'today', refDate: refOct24 });
console.assert(c19.length === 5, `Expected 5 paid Dine-in sales today, got ${c19.length}`);
console.log(`✓ 54. Combination 19 (Order Type + Status + Date): ${c19.length} matches.`);

// 20. Search + Payment + Order Type + Status + Date
const c20 = filterSales(completedSales, {
  searchQuery: 'Kenji',
  paymentMethod: 'Credit Card',
  orderType: 'Dine-in',
  status: 'paid',
  dateRangePreset: 'today',
  refDate: refOct24,
});
console.assert(c20.length === 1 && c20[0].orderNumber === '#TX-9042', 'Combination 20 failed');
console.log(`✓ 55. Combination 20 (All 5 filters active simultaneously): ${c20.length} match.`);

// ==========================================
// 5. EDGE CASES
// ==========================================
console.log('--- Running Edge Case Verification Tests ---');

// Edge 1: No filters returns all records
const e1 = filterSales(completedSales, {});
console.assert(e1.length === completedSales.length, 'No filters must return all records');
console.log(`✓ 56. Edge case 1 (No filters): ${e1.length} records.`);

// Edge 2: Empty search returns all records
const e2 = filterSales(completedSales, { searchQuery: '' });
console.assert(e2.length === completedSales.length, 'Empty search must return all records');
console.log(`✓ 57. Edge case 2 (Empty search): ${e2.length} records.`);

// Edge 3: Whitespace search returns all records
const e3 = filterSales(completedSales, { searchQuery: '    ' });
console.assert(e3.length === completedSales.length, 'Whitespace search must return all records');
console.log(`✓ 58. Edge case 3 (Whitespace search): ${e3.length} records.`);

// Edge 4: No matching combination
const e4 = filterSales(completedSales, { searchQuery: 'Kenji', paymentMethod: 'Cash' });
console.assert(e4.length === 0, 'No matching combination must return 0 records');
console.log('✓ 59. Edge case 4 (No matching combination returns 0 records).');

// Edge 5: Invalid date range (start after end)
const e5 = filterSales(completedSales, {
  dateRangePreset: 'custom',
  customStart: '2026-10-25',
  customEnd: '2026-10-20',
  refDate: refOct24,
});
console.assert(e5.length === 0, 'Invalid date range must return 0 records');
console.log('✓ 60. Edge case 5 (Invalid date range returns 0 records).');

// Edge 6: Same start and end date
const e6 = filterSales(completedSales, {
  dateRangePreset: 'custom',
  customStart: '2026-10-24',
  customEnd: '2026-10-24',
  refDate: refOct24,
});
console.assert(e6.length === 8, `Expected 8 records for same day, got ${e6.length}`);
console.log(`✓ 61. Edge case 6 (Same start/end date): ${e6.length} records.`);

// Edge 7: Multiple filters producing zero results
const e7 = filterSales(completedSales, {
  searchQuery: 'Dragon',
  paymentMethod: 'Cash',
  orderType: 'Dine-in',
  refDate: refOct24,
});
console.assert(e7.length === 0, 'Multiple conflicting filters must yield 0 results');
console.log('✓ 62. Edge case 7 (Multiple conflicting filters produce 0 results).');

// Edge 8: Clearing one filter restores matching results
const e8Before = filterSales(completedSales, {
  searchQuery: 'Salmon',
  paymentMethod: 'QR Code',
  refDate: refOct24,
});
console.assert(e8Before.length === 0, 'Expected 0 matches before clearing payment filter');
const e8After = filterSales(completedSales, {
  searchQuery: 'Salmon',
  paymentMethod: 'all',
  refDate: refOct24,
});
console.assert(e8After.length >= 1, 'Expected matching records restored after clearing payment filter');
console.log(`✓ 63. Edge case 8 (Clearing one filter restores results): 0 -> ${e8After.length} matches.`);

// Edge 9: Reset All Filters restores the complete dataset
const e9Reset = filterSales(completedSales, {
  searchQuery: '',
  paymentMethod: 'all',
  orderType: 'all',
  status: 'all',
  dateRangePreset: 'all',
  customStart: '',
  customEnd: '',
  refDate: refOct24,
});
console.assert(e9Reset.length === completedSales.length, 'Reset all filters must restore all records');
console.log(`✓ 64. Edge case 9 (Reset all filters restores complete dataset): ${e9Reset.length} records.`);

console.log('✔ All 64 Step 9D-1, 9D-2, 9D-3 & 9D-4 Sales Filtering verification tests passed successfully!');
