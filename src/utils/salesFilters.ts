/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Transaction } from '../types';
import { getDateRangeForPreset, isDateInRange } from './dateUtils';
import { matchesSaleSearch } from './salesSearch';

export interface SalesFilterCriteria {
  searchQuery?: string;
  paymentMethod?: string;
  orderType?: string;
  status?: string;
  dateRangePreset?: string;
  customStart?: string;
  customEnd?: string;
  refDate?: Date;
}

/**
 * Filters a list of completed sales using cooperative AND logic.
 * Every active filter criteria must be satisfied for a sale to be included.
 */
export function filterSales(
  sales: Transaction[],
  criteria: SalesFilterCriteria
): Transaction[] {
  const {
    searchQuery = '',
    paymentMethod = 'all',
    orderType = 'all',
    status = 'all',
    dateRangePreset = 'all',
    customStart,
    customEnd,
    refDate = new Date(),
  } = criteria;

  const dateRange = getDateRangeForPreset(dateRangePreset, {
    customStart,
    customEnd,
    refDate,
  });

  const query = searchQuery.trim();

  return sales.filter((tx) => {
    // 1. Date Range Filtering
    if (dateRangePreset !== 'all') {
      const inDate = isDateInRange(tx.dateTime, dateRange, refDate);
      if (!inDate) return false;
    }

    // 2. Search Query Filtering
    if (query) {
      const inSearch = matchesSaleSearch(tx, query);
      if (!inSearch) return false;
    }

    // 3. Payment Method Filtering
    if (paymentMethod !== 'all' && tx.paymentMethod !== paymentMethod) {
      return false;
    }

    // 4. Order Type Filtering
    if (orderType !== 'all' && tx.type !== orderType) {
      return false;
    }

    // 5. Status Filtering
    if (status !== 'all') {
      if (status === 'paid') {
        if (tx.status === 'Refunded' || tx.paymentStatus === 'Refunded') {
          return false;
        }
      } else if (status === 'refunded') {
        if (tx.status !== 'Refunded' && tx.paymentStatus !== 'Refunded') {
          return false;
        }
      }
    }

    return true;
  });
}
