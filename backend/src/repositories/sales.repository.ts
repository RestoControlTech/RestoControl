/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InvoiceStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { SalesListQueryInput } from '../validators/sales.validator.js';

const INVOICE_STATUS_SET = new Set<string>(['ACTIVE', 'COMPLETED', 'CANCELLED']);
const PAYMENT_STATUS_SET = new Set<string>(['PAID', 'PARTIALLY_PAID', 'UNPAID']);
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const saleListInclude = {
  customer: {
    select: {
      id: true,
      name: true,
      phone: true,
    },
  },
  cashier: {
    select: {
      id: true,
      name: true,
    },
  },
  payments: {
    select: {
      id: true,
      method: true,
      status: true,
      currency: true,
      amount: true,
      cashReceived: true,
      changeGiven: true,
      paidAt: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
  },
  directOrder: {
    select: {
      id: true,
      orderNumber: true,
      source: true,
      orderType: true,
    },
  },
} satisfies Prisma.TransactionInclude;

export const saleDetailInclude = {
  ...saleListInclude,
  directOrder: {
    select: {
      id: true,
      orderNumber: true,
      source: true,
      orderType: true,
      items: {
        select: {
          id: true,
          productId: true,
          productName: true,
          quantity: true,
          unitPrice: true,
          lineTotal: true,
          instructions: true,
        },
        orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
      },
    },
  },
  session: {
    select: {
      id: true,
      sessionNumber: true,
      orders: {
        select: {
          id: true,
          orderNumber: true,
          items: {
            select: {
              id: true,
              productId: true,
              productName: true,
              quantity: true,
              unitPrice: true,
              lineTotal: true,
              instructions: true,
            },
            orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
          },
        },
        orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
      },
    },
  },
} satisfies Prisma.TransactionInclude;

export type SaleListRecord = Prisma.TransactionGetPayload<{ include: typeof saleListInclude }>;
export type SaleDetailRecord = Prisma.TransactionGetPayload<{ include: typeof saleDetailInclude }>;

function parseDateBoundary(raw: string, boundary: 'start' | 'end'): Date {
  if (DATE_ONLY_REGEX.test(raw)) {
    return new Date(boundary === 'start' ? `${raw}T00:00:00.000Z` : `${raw}T23:59:59.999Z`);
  }
  return new Date(raw);
}

export class SalesRepository {
  /**
   * Queries paginated sales transactions strictly scoped to the verified restaurantId.
   */
  async findMany(
    restaurantId: string,
    query: SalesListQueryInput
  ): Promise<{ records: SaleListRecord[]; total: number }> {
    const where: Prisma.TransactionWhereInput = {
      restaurantId,
    };

    if (query.search && query.search.length > 0) {
      const search = query.search;
      where.OR = [
        { transactionNumber: { contains: search, mode: 'insensitive' } },
        { tableName: { contains: search, mode: 'insensitive' } },
        { itemSummary: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { directOrder: { orderNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (query.paymentMethod) {
      where.payments = {
        some: {
          method: query.paymentMethod as PaymentMethod,
        },
      };
    }

    if (query.status) {
      if (INVOICE_STATUS_SET.has(query.status)) {
        where.status = query.status as InvoiceStatus;
      } else if (PAYMENT_STATUS_SET.has(query.status)) {
        where.paymentStatus = query.status as PaymentStatus;
      }
    }

    if (query.startDate || query.endDate) {
      const createdAtFilter: Prisma.DateTimeFilter = {};
      if (query.startDate) {
        createdAtFilter.gte = parseDateBoundary(query.startDate, 'start');
      }
      if (query.endDate) {
        createdAtFilter.lte = parseDateBoundary(query.endDate, 'end');
      }
      where.createdAt = createdAtFilter;
    }

    const skip = (query.page - 1) * query.limit;

    const [records, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: saleListInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: query.limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return { records, total };
  }

  /**
   * Fetches a single sales transaction by ID strictly within the verified restaurantId.
   */
  async findById(restaurantId: string, id: string): Promise<SaleDetailRecord | null> {
    return prisma.transaction.findFirst({
      where: {
        id,
        restaurantId,
      },
      include: saleDetailInclude,
    });
  }
}

export const salesRepository = new SalesRepository();
