/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Transaction } from '../types';

/**
 * Checks whether a given transaction matches the search query.
 * Performs a comprehensive, case-insensitive match supporting:
 * - Sale / Order number (e.g. '#TX-9042', 'TX-9042', 'ORD-001', '9042')
 * - Customer name (e.g. 'Kenji Sato', 'Sarah Connor', 'dara')
 * - Table name / number (e.g. 'Table 02', 'table 2', 'Pickup')
 * - Product / Item name (both itemSummary and itemized items array, e.g. 'salmon', 'ramen', 'soda')
 *
 * Empty or whitespace-only query matches all records.
 */
export function matchesSaleSearch(tx: Transaction, rawQuery?: string): boolean {
  if (!rawQuery) return true;
  const query = rawQuery.toLowerCase().trim();
  if (!query) return true;

  // 1. Sale / Order Number & Transaction ID
  const orderNum = (tx.orderNumber || '').toLowerCase();
  const cleanOrderNum = orderNum.replace(/^#/, '');
  const cleanQuery = query.replace(/^#/, '');

  if (orderNum.includes(query) || (cleanQuery && cleanOrderNum.includes(cleanQuery))) {
    return true;
  }
  if (tx.id && tx.id.toLowerCase().includes(query)) {
    return true;
  }

  // 2. Customer Name
  if (tx.customerName && tx.customerName.toLowerCase().includes(query)) {
    return true;
  }

  // 3. Table Name & Number
  if (tx.table) {
    const tableStr = tx.table.toLowerCase();
    if (tableStr.includes(query)) {
      return true;
    }
    // Also match when leading zeros differ (e.g. query 'table 2' matches 'Table 02')
    const normalizedTable = tableStr.replace(/0+(\d+)/g, '$1');
    const normalizedQuery = query.replace(/0+(\d+)/g, '$1');
    if (normalizedTable.includes(normalizedQuery)) {
      return true;
    }
  }

  // 4. Product / Item Names
  // A. Check itemSummary string
  if (tx.itemSummary && tx.itemSummary.toLowerCase().includes(query)) {
    return true;
  }

  // B. Check itemized items array
  if (tx.items && tx.items.some((item) => item.name && item.name.toLowerCase().includes(query))) {
    return true;
  }

  return false;
}
