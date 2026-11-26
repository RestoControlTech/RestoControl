/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SaleItem, Transaction } from '../types';
import { apiClient } from './api/client';
import { QueryParamValue } from './api/config';
import { ApiError } from './api/errors';

export type BackendPaymentMethod =
  | 'CASH'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'KHQR'
  | 'DIGITAL_WALLET';

export type BackendSaleStatus =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'UNPAID';

export interface BackendSalePaymentDto {
  id: string;
  method: string;
  status: string;
  currency: string;
  amount: string;
  cashReceived: string | null;
  changeGiven: string | null;
  paidAt: string | null;
}

export interface BackendSaleItemDto {
  id: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  instructions: string | null;
}

export interface BackendSaleListItemDto {
  id: string;
  transactionNumber: string;
  orderNumber: string | null;
  createdAt: string;
  completedAt: string | null;
  tableName: string | null;
  orderType: string;
  customer: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
  cashier: {
    id: string;
    name: string;
  } | null;
  currency: string;
  subtotal: string;
  taxAmount: string;
  serviceChargeAmount: string;
  discountAmount: string;
  grossAmount: string;
  amountPaid: string;
  paymentStatus: string;
  status: string;
  paymentMethod: string | null;
  paymentSummary: string;
  itemSummary: string | null;
  payments: BackendSalePaymentDto[];
}

export interface BackendSaleDetailDto extends BackendSaleListItemDto {
  notes: string | null;
  discountType: string | null;
  discountRate: string | null;
  discountReason: string | null;
  order: {
    id: string;
    orderNumber: string;
    source: string;
    orderType: string;
  } | null;
  items: BackendSaleItemDto[];
}

export interface BackendSalesPaginationDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface BackendSalesListResponse {
  success: boolean;
  data: {
    sales: BackendSaleListItemDto[];
    pagination: BackendSalesPaginationDto;
  };
}

export interface BackendSaleDetailResponse {
  success: boolean;
  data: {
    sale: BackendSaleDetailDto;
  };
}

export interface SalesQueryParams {
  search?: string;
  paymentMethod?: BackendPaymentMethod;
  status?: BackendSaleStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface SalesListResult {
  sales: Transaction[];
  rawSales: BackendSaleListItemDto[];
  pagination: BackendSalesPaginationDto;
}

export interface SaleDetailResult {
  sale: Transaction;
  rawSale: BackendSaleDetailDto;
}

/**
 * Safely parses a decimal string returned by the backend into a finite number
 * for UI formatting without performing floating-point monetary arithmetic.
 */
export function parseMoneyAmount(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Maps backend PaymentMethod enum values to existing frontend display labels.
 * Returns undefined when no payment method is present rather than inventing one.
 */
export function mapPaymentMethodLabel(method: string | null | undefined): string | undefined {
  if (!method) {
    return undefined;
  }
  switch (method.toUpperCase()) {
    case 'CASH':
      return 'Cash';
    case 'CREDIT_CARD':
      return 'Credit Card';
    case 'DEBIT_CARD':
      return 'Debit Card';
    case 'KHQR':
      return 'QR Code';
    case 'DIGITAL_WALLET':
      return 'Digital Wallet';
    default:
      return method;
  }
}

/**
 * Maps a backend Sale DTO (list item or detail) to the frontend Transaction model
 * while preserving optional fields safely without fabricating missing data.
 */
export function mapBackendSaleToTransaction(
  dto: BackendSaleListItemDto | BackendSaleDetailDto
): Transaction {
  const firstCashPayment = dto.payments.find(
    (p) => p.method.toUpperCase() === 'CASH' && (p.cashReceived !== null || p.changeGiven !== null)
  );

  const items: SaleItem[] | undefined =
    'items' in dto && Array.isArray(dto.items)
      ? dto.items.map((item) => ({
          id: item.id,
          name: item.productName,
          quantity: item.quantity,
          unitPrice: parseMoneyAmount(item.unitPrice),
          subtotal: parseMoneyAmount(item.lineTotal),
        }))
      : undefined;

  return {
    id: dto.id,
    orderNumber: dto.orderNumber ?? dto.transactionNumber,
    dateTime: dto.completedAt ?? dto.createdAt,
    table:
      dto.tableName ??
      (dto.orderType === 'TAKEAWAY' ? 'Takeaway' : dto.orderType === 'DELIVERY' ? 'Delivery' : ''),
    type: dto.orderType === 'TAKEAWAY' ? 'Takeaway' : 'Dine-in',
    amount: parseMoneyAmount(dto.grossAmount),
    status: dto.status === 'COMPLETED' ? 'Completed' : 'Receipt',
    paymentMethod: mapPaymentMethodLabel(dto.paymentMethod),
    customerName: dto.customer?.name,
    currency: dto.currency,
    items,
    itemSummary: dto.itemSummary ?? undefined,
    subtotal: parseMoneyAmount(dto.subtotal),
    tax: parseMoneyAmount(dto.taxAmount),
    cashReceived:
      firstCashPayment?.cashReceived !== null && firstCashPayment?.cashReceived !== undefined
        ? parseMoneyAmount(firstCashPayment.cashReceived)
        : undefined,
    change:
      firstCashPayment?.changeGiven !== null && firstCashPayment?.changeGiven !== undefined
        ? parseMoneyAmount(firstCashPayment.changeGiven)
        : undefined,
    amountPaid: parseMoneyAmount(dto.amountPaid),
    paymentStatus: dto.paymentStatus === 'PAID' ? 'Paid' : 'Pending',
    notes: 'notes' in dto && dto.notes ? dto.notes : undefined,
  };
}

function buildSalesQueryParams(
  params?: SalesQueryParams
): Record<string, QueryParamValue> | undefined {
  if (!params) {
    return undefined;
  }

  const query: Record<string, QueryParamValue> = {};

  if (params.search && params.search.trim() !== '') {
    query.search = params.search.trim();
  }
  if (params.paymentMethod) {
    query.paymentMethod = params.paymentMethod;
  }
  if (params.status) {
    query.status = params.status;
  }
  if (params.startDate && params.startDate.trim() !== '') {
    query.startDate = params.startDate.trim();
  }
  if (params.endDate && params.endDate.trim() !== '') {
    query.endDate = params.endDate.trim();
  }
  if (params.page !== undefined) {
    query.page = params.page;
  }
  if (params.limit !== undefined) {
    query.limit = params.limit;
  }

  return Object.keys(query).length > 0 ? query : undefined;
}

/**
 * Fetches paginated sales history from GET /api/sales via the centralized API client.
 */
export async function fetchSalesList(params?: SalesQueryParams): Promise<SalesListResult> {
  const response = await apiClient.get<BackendSalesListResponse>('/sales', {
    params: buildSalesQueryParams(params),
  });

  if (!response?.success || !response.data) {
    throw new ApiError({
      message: 'Unexpected response format received from sales service.',
      status: 200,
      code: 'INVALID_RESPONSE',
      category: 'UNEXPECTED_RESPONSE',
    });
  }

  return {
    sales: response.data.sales.map(mapBackendSaleToTransaction),
    rawSales: response.data.sales,
    pagination: response.data.pagination,
  };
}

/**
 * Fetches detailed sale information from GET /api/sales/:id via the centralized API client.
 */
export async function fetchSaleById(id: string): Promise<SaleDetailResult> {
  const cleanId = id.trim();
  if (!cleanId) {
    throw new ApiError({
      message: 'Sale transaction ID is required.',
      status: 400,
      code: 'VALIDATION_ERROR',
      category: 'VALIDATION',
    });
  }

  const response = await apiClient.get<BackendSaleDetailResponse>(
    `/sales/${encodeURIComponent(cleanId)}`
  );

  if (!response?.success || !response.data?.sale) {
    throw new ApiError({
      message: 'Unexpected response format received from sales service.',
      status: 200,
      code: 'INVALID_RESPONSE',
      category: 'UNEXPECTED_RESPONSE',
    });
  }

  return {
    sale: mapBackendSaleToTransaction(response.data.sale),
    rawSale: response.data.sale,
  };
}
