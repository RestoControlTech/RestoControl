/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Transaction } from '../types';
import {
  BackendPaymentMethod,
  BackendSaleDetailDto,
  BackendSaleListItemDto,
  BackendSalesPaginationDto,
  BackendSaleStatus,
  fetchSaleById,
  fetchSalesList,
  SalesQueryParams,
} from '../services/salesApi';
import { isApiError } from '../services/api/errors';
import { getDateRangeForPreset } from '../utils/dateUtils';

export interface SalesHistoryFilterState {
  search: string;
  datePreset: string;
  customStartDate: string;
  customEndDate: string;
  paymentMethod: string;
  status: string;
  page: number;
  limit?: number;
}

const DEFAULT_PAGINATION: BackendSalesPaginationDto = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

const PAYMENT_FILTER_TO_BACKEND: Record<string, BackendPaymentMethod> = {
  Cash: 'CASH',
  'Credit Card': 'CREDIT_CARD',
  'Debit Card': 'DEBIT_CARD',
  'QR Code': 'KHQR',
  'Digital Wallet': 'DIGITAL_WALLET',
};

/**
 * Maps UI filter controls to backend GET /api/sales query parameters.
 * Returns null if the filter combination is guaranteed to produce 0 matches
 * (e.g. inverted custom date range or 'refunded' under NO-REFUND policy).
 */
export function buildBackendSalesQuery(
  filters: SalesHistoryFilterState
): SalesQueryParams | null {
  if (
    filters.datePreset === 'custom' &&
    filters.customStartDate &&
    filters.customEndDate &&
    filters.customStartDate > filters.customEndDate
  ) {
    return null;
  }

  if (filters.status === 'refunded') {
    return null;
  }

  const query: SalesQueryParams = {
    page: filters.page,
    limit: filters.limit ?? 20,
  };

  const trimmedSearch = filters.search.trim();
  if (trimmedSearch) {
    query.search = trimmedSearch;
  }

  if (filters.paymentMethod && filters.paymentMethod !== 'all') {
    const mappedMethod = PAYMENT_FILTER_TO_BACKEND[filters.paymentMethod];
    if (mappedMethod) {
      query.paymentMethod = mappedMethod;
    }
  }

  if (filters.status === 'paid') {
    query.status = 'PAID' satisfies BackendSaleStatus;
  }

  if (filters.datePreset !== 'all') {
    const range = getDateRangeForPreset(filters.datePreset, {
      customStart: filters.customStartDate,
      customEnd: filters.customEndDate,
    });
    if (range) {
      query.startDate = range.start.toISOString();
      query.endDate = range.end.toISOString();
    }
  }

  return query;
}

export function useSalesHistory(filters: SalesHistoryFilterState) {
  const [sales, setSales] = useState<Transaction[]>([]);
  const [rawSalesById, setRawSalesById] = useState<Record<string, BackendSaleListItemDto>>({});
  const [pagination, setPagination] = useState<BackendSalesPaginationDto>(DEFAULT_PAGINATION);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSale, setSelectedSale] = useState<Transaction | null>(null);
  const [selectedRawDetail, setSelectedRawDetail] = useState<BackendSaleDetailDto | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const requestSeqRef = useRef(0);
  const detailSeqRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadSales = useCallback(async (activeFilters: SalesHistoryFilterState) => {
    const query = buildBackendSalesQuery(activeFilters);
    const currentSeq = ++requestSeqRef.current;

    if (query === null) {
      setSales([]);
      setRawSalesById({});
      setPagination({
        page: 1,
        limit: activeFilters.limit ?? 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchSalesList(query);
      if (!isMountedRef.current || currentSeq !== requestSeqRef.current) {
        return;
      }

      const byId: Record<string, BackendSaleListItemDto> = {};
      for (const raw of result.rawSales) {
        byId[raw.id] = raw;
      }

      setSales(result.sales);
      setRawSalesById(byId);
      setPagination(result.pagination);
      setError(null);
    } catch (err: unknown) {
      if (!isMountedRef.current || currentSeq !== requestSeqRef.current) {
        return;
      }
      const message = isApiError(err)
        ? err.message
        : 'Unable to load sales history. Please try again.';
      setError(message);
    } finally {
      if (isMountedRef.current && currentSeq === requestSeqRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadSales(filters);
  }, [
    loadSales,
    filters.search,
    filters.datePreset,
    filters.customStartDate,
    filters.customEndDate,
    filters.paymentMethod,
    filters.status,
    filters.page,
    filters.limit,
  ]);

  const retry = useCallback(() => {
    loadSales(filters);
  }, [loadSales, filters]);

  const openSaleDetail = useCallback(async (sale: Transaction) => {
    const currentDetailSeq = ++detailSeqRef.current;
    setSelectedSale(sale);
    setSelectedRawDetail(null);
    setDetailError(null);
    setIsDetailLoading(true);

    try {
      const detail = await fetchSaleById(sale.id);
      if (!isMountedRef.current || currentDetailSeq !== detailSeqRef.current) {
        return;
      }
      setSelectedSale(detail.sale);
      setSelectedRawDetail(detail.rawSale);
      setDetailError(null);
    } catch (err: unknown) {
      if (!isMountedRef.current || currentDetailSeq !== detailSeqRef.current) {
        return;
      }
      const message = isApiError(err)
        ? err.message
        : 'Failed to load full sale details.';
      setDetailError(message);
    } finally {
      if (isMountedRef.current && currentDetailSeq === detailSeqRef.current) {
        setIsDetailLoading(false);
      }
    }
  }, []);

  const retrySaleDetail = useCallback(() => {
    if (selectedSale) {
      openSaleDetail(selectedSale);
    }
  }, [selectedSale, openSaleDetail]);

  const closeSaleDetail = useCallback(() => {
    detailSeqRef.current += 1;
    setSelectedSale(null);
    setSelectedRawDetail(null);
    setDetailError(null);
    setIsDetailLoading(false);
  }, []);

  return {
    sales,
    rawSalesById,
    pagination,
    isLoading,
    error,
    retry,
    selectedSale,
    selectedRawDetail,
    isDetailLoading,
    detailError,
    openSaleDetail,
    retrySaleDetail,
    closeSaleDetail,
  };
}
