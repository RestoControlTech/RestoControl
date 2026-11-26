/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Prisma } from '@prisma/client';
import {
  SaleDetailRecord,
  SaleListRecord,
  salesRepository,
} from '../repositories/sales.repository.js';
import { NotFoundError } from '../utils/errors.js';
import { SalesListQueryInput } from '../validators/sales.validator.js';

export interface SalePaymentDto {
  id: string;
  method: string;
  status: string;
  currency: string;
  amount: string;
  cashReceived: string | null;
  changeGiven: string | null;
  paidAt: string | null;
}

export interface SaleItemDetailDto {
  id: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  instructions: string | null;
}

export interface SaleListItemDto {
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
  payments: SalePaymentDto[];
}

export interface SaleDetailDto extends SaleListItemDto {
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
  items: SaleItemDetailDto[];
}

export interface SalesPaginationDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface SalesListResponseDto {
  sales: SaleListItemDto[];
  pagination: SalesPaginationDto;
}

function formatMoney(value: Prisma.Decimal): string {
  return value.toFixed(2);
}

function formatOptionalMoney(value: Prisma.Decimal | null | undefined): string | null {
  return value ? value.toFixed(2) : null;
}

function mapPaymentDto(payment: SaleListRecord['payments'][number]): SalePaymentDto {
  return {
    id: payment.id,
    method: payment.method,
    status: payment.status,
    currency: payment.currency,
    amount: formatMoney(payment.amount),
    cashReceived: formatOptionalMoney(payment.cashReceived),
    changeGiven: formatOptionalMoney(payment.changeGiven),
    paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
  };
}

function mapSaleListItemDto(record: SaleListRecord): SaleListItemDto {
  const payments = record.payments.map(mapPaymentDto);
  const primaryPayment = payments[0] ?? null;

  return {
    id: record.id,
    transactionNumber: record.transactionNumber,
    orderNumber: record.directOrder?.orderNumber ?? null,
    createdAt: record.createdAt.toISOString(),
    completedAt: record.completedAt ? record.completedAt.toISOString() : null,
    tableName: record.tableName,
    orderType: record.orderType,
    customer: record.customer
      ? {
          id: record.customer.id,
          name: record.customer.name,
          phone: record.customer.phone,
        }
      : null,
    cashier: record.cashier
      ? {
          id: record.cashier.id,
          name: record.cashier.name,
        }
      : null,
    currency: record.currency,
    subtotal: formatMoney(record.subtotal),
    taxAmount: formatMoney(record.taxAmount),
    serviceChargeAmount: formatMoney(record.serviceChargeAmount),
    discountAmount: formatMoney(record.discountAmount),
    grossAmount: formatMoney(record.grossAmount),
    amountPaid: formatMoney(record.amountPaid),
    paymentStatus: record.paymentStatus,
    status: record.status,
    paymentMethod: primaryPayment ? primaryPayment.method : null,
    paymentSummary: record.paymentSummary,
    itemSummary: record.itemSummary,
    payments,
  };
}

function mapSaleDetailDto(record: SaleDetailRecord): SaleDetailDto {
  const base = mapSaleListItemDto(record);

  const directItems = record.directOrder?.items ?? [];
  const sessionItems =
    directItems.length === 0 && record.session?.orders
      ? record.session.orders.flatMap((order) => order.items)
      : [];

  const items: SaleItemDetailDto[] = [...directItems, ...sessionItems].map((item) => ({
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: formatMoney(item.unitPrice),
    lineTotal: formatMoney(item.lineTotal),
    instructions: item.instructions,
  }));

  const fallbackOrderNumber =
    record.directOrder?.orderNumber ??
    (record.session?.orders && record.session.orders.length > 0
      ? record.session.orders.map((o) => o.orderNumber).join(', ')
      : null);

  return {
    ...base,
    orderNumber: fallbackOrderNumber,
    notes: record.notes,
    discountType: record.discountType,
    discountRate: formatOptionalMoney(record.discountRate),
    discountReason: record.discountReason,
    order: record.directOrder
      ? {
          id: record.directOrder.id,
          orderNumber: record.directOrder.orderNumber,
          source: record.directOrder.source,
          orderType: record.directOrder.orderType,
        }
      : null,
    items,
  };
}

export class SalesService {
  /**
   * Lists paginated sales history for a verified restaurant tenant.
   */
  async listSales(
    restaurantId: string,
    query: SalesListQueryInput
  ): Promise<SalesListResponseDto> {
    const { records, total } = await salesRepository.findMany(restaurantId, query);
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

    return {
      sales: records.map(mapSaleListItemDto),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1 && totalPages > 0,
      },
    };
  }

  /**
   * Retrieves a single sale transaction by ID within the verified restaurant tenant.
   */
  async getSaleById(restaurantId: string, id: string): Promise<SaleDetailDto> {
    const record = await salesRepository.findById(restaurantId, id);
    if (!record) {
      throw new NotFoundError('Sale transaction not found');
    }
    return mapSaleDetailDto(record);
  }
}

export const salesService = new SalesService();
