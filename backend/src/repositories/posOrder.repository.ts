/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { randomBytes } from 'node:crypto';
import { OrderStatus, OrderType, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors.js';
import {
  AddPosOrderItemInput,
  CreatePosOrderInput,
  PosOrderItemInput,
  PosOrdersListQueryInput,
  UpdatePosOrderInput,
  UpdatePosOrderItemInput,
} from '../validators/posOrder.validator.js';

export const posOrderInclude = {
  items: {
    select: {
      id: true,
      orderId: true,
      productId: true,
      productName: true,
      quantity: true,
      unitPrice: true,
      lineTotal: true,
      instructions: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
  },
  session: {
    select: {
      id: true,
      sessionNumber: true,
      status: true,
      tableId: true,
      totalAmount: true,
      table: {
        select: {
          id: true,
          legacyId: true,
          name: true,
          section: true,
          status: true,
        },
      },
    },
  },
  customer: {
    select: {
      id: true,
      name: true,
      phone: true,
    },
  },
} satisfies Prisma.OrderInclude;

export type PosOrderRecord = Prisma.OrderGetPayload<{ include: typeof posOrderInclude }>;

interface LockedTableRow {
  id: string;
  restaurantId: string;
  name: string;
  status: string;
  isActive: boolean;
  deletedAt: Date | null;
}

interface LockedSessionRow {
  id: string;
  restaurantId: string;
  tableId: string;
  sessionNumber: string;
  status: string;
}

interface LockedOrderRow {
  id: string;
  restaurantId: string;
  sessionId: string | null;
  orderType: OrderType;
  status: OrderStatus;
  paymentStatus: string;
  discountAmount: Prisma.Decimal;
}

const MUTABLE_ORDER_STATUSES = new Set<OrderStatus>([
  'PENDING',
  'PREPARING',
  'READY',
  'SERVED',
]);

function generateUniqueCode(prefix: 'ORD' | 'SES'): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${datePart}-${randomPart}`;
}

function decimalToCents(val: Prisma.Decimal | string | number): number {
  return Math.round(Number(val.toString()) * 100);
}

function centsToDecimalString(cents: number): string {
  return (cents / 100).toFixed(2);
}

function calculateFinancialsCents(
  subtotalCents: number,
  discountCents: number,
  taxRatePercent: number,
  serviceChargeRatePercent: number
) {
  const taxableBaseCents = Math.max(0, subtotalCents - discountCents);
  const taxAmountCents = Math.round((taxableBaseCents * taxRatePercent) / 100);
  const serviceChargeAmountCents = Math.round((taxableBaseCents * serviceChargeRatePercent) / 100);
  const totalCents = Math.max(0, taxableBaseCents + taxAmountCents + serviceChargeAmountCents);

  return {
    subtotalCents,
    discountCents,
    taxAmountCents,
    serviceChargeAmountCents,
    totalCents,
  };
}

function mapPgTriggerError(err: unknown): never {
  if (err && typeof err === 'object') {
    const message = 'message' in err && typeof err.message === 'string' ? err.message : '';
    const code = 'code' in err && typeof err.code === 'string' ? err.code : '';
    if (
      message.includes('bill is frozen') ||
      message.includes('already settled') ||
      code === '23514'
    ) {
      throw new ConflictError(
        'Order cannot be modified because its bill is frozen for checkout or already settled'
      );
    }
  }
  throw err;
}

export class PosOrderRepository {
  /**
   * Lists POS orders scoped strictly to restaurantId.
   */
  async findMany(restaurantId: string, query: PosOrdersListQueryInput): Promise<PosOrderRecord[]> {
    const where: Prisma.OrderWhereInput = {
      restaurantId,
    };

    if (query.orderType) {
      where.orderType = query.orderType;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.paymentStatus) {
      where.paymentStatus = query.paymentStatus;
    }
    if (query.sessionId) {
      where.sessionId = query.sessionId;
    }
    if (query.tableId) {
      where.session = {
        tableId: query.tableId,
      };
    }

    return prisma.order.findMany({
      where,
      include: posOrderInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit,
    });
  }

  /**
   * Retrieves a single POS order strictly scoped to restaurantId.
   */
  async findById(restaurantId: string, orderId: string): Promise<PosOrderRecord | null> {
    return prisma.order.findFirst({
      where: {
        id: orderId,
        restaurantId,
      },
      include: posOrderInclude,
    });
  }

  /**
   * Locks Table -> TableSession in parent-first order for an existing DINE_IN order or new DINE_IN target,
   * and verifies neither session nor order is frozen by an ACTIVE/COMPLETED transaction.
   */
  private async lockTableAndSessionForDineIn(
    tx: Prisma.TransactionClient,
    restaurantId: string,
    userId: string,
    target: { tableId?: string; sessionId?: string }
  ): Promise<{ table: LockedTableRow; session: LockedSessionRow }> {
    let resolvedTableId = target.tableId;

    if (!resolvedTableId && target.sessionId) {
      const existingSessionMeta = await tx.tableSession.findFirst({
        where: { id: target.sessionId, restaurantId },
        select: { tableId: true },
      });
      if (!existingSessionMeta) {
        throw new NotFoundError('Table session not found in this restaurant');
      }
      resolvedTableId = existingSessionMeta.tableId;
    }

    if (!resolvedTableId) {
      throw new BadRequestError('DINE_IN orders require a valid tableId or sessionId');
    }

    // Level 0 lock: Table
    const tables = await tx.$queryRaw<LockedTableRow[]>`
      SELECT id, "restaurantId", name, status::text, "isActive", "deletedAt"
      FROM public."tables"
      WHERE id = ${resolvedTableId}::uuid
        AND "restaurantId" = ${restaurantId}::uuid
        AND "deletedAt" IS NULL
      FOR UPDATE
    `;
    const table = tables[0];
    if (!table) {
      throw new NotFoundError('Table not found in this restaurant');
    }

    // Level 1 lock: TableSession
    let session: LockedSessionRow | undefined;

    if (target.sessionId) {
      const sessions = await tx.$queryRaw<LockedSessionRow[]>`
        SELECT id, "restaurantId", "tableId", "sessionNumber", status::text
        FROM public."table_sessions"
        WHERE id = ${target.sessionId}::uuid
          AND "restaurantId" = ${restaurantId}::uuid
        FOR UPDATE
      `;
      session = sessions[0];
      if (!session) {
        throw new NotFoundError('Table session not found in this restaurant');
      }
      if (target.tableId && session.tableId !== target.tableId) {
        throw new BadRequestError('Specified sessionId does not belong to the specified tableId');
      }
      if (session.status !== 'ACTIVE') {
        throw new ConflictError(
          `Cannot attach order to table session ${session.sessionNumber} because its status is ${session.status}`
        );
      }
    } else {
      const activeSessions = await tx.$queryRaw<LockedSessionRow[]>`
        SELECT id, "restaurantId", "tableId", "sessionNumber", status::text
        FROM public."table_sessions"
        WHERE "tableId" = ${table.id}::uuid
          AND "restaurantId" = ${restaurantId}::uuid
          AND status = 'ACTIVE'::"SessionStatus"
        FOR UPDATE
      `;
      session = activeSessions[0];

      if (!session) {
        const createdSession = await tx.tableSession.create({
          data: {
            restaurantId,
            tableId: table.id,
            sessionNumber: generateUniqueCode('SES'),
            status: 'ACTIVE',
            covers: 1,
            openedById: userId,
          },
          select: {
            id: true,
            restaurantId: true,
            tableId: true,
            sessionNumber: true,
            status: true,
          },
        });
        session = createdSession;
      }
    }

    // Reject if the active table session bill is already frozen for checkout or settled
    const freezingTx = await tx.transaction.findFirst({
      where: {
        restaurantId,
        sessionId: session.id,
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
      select: { id: true, status: true },
    });
    if (freezingTx) {
      throw new ConflictError(
        `Table session ${session.sessionNumber} is frozen by an ${freezingTx.status} transaction and cannot accept new orders`
      );
    }

    return { table, session };
  }

  /**
   * Acquires parent-first locks for an existing order (Table -> TableSession -> Order)
   * and validates that the order is mutable and not frozen by any transaction.
   */
  private async lockMutableOrder(
    tx: Prisma.TransactionClient,
    restaurantId: string,
    orderId: string,
    options: { requireModifiableItems?: boolean } = {}
  ): Promise<LockedOrderRow> {
    const orderMeta = await tx.order.findFirst({
      where: { id: orderId, restaurantId },
      select: {
        id: true,
        sessionId: true,
        session: {
          select: { tableId: true },
        },
      },
    });
    if (!orderMeta) {
      throw new NotFoundError('Order not found in this restaurant');
    }

    if (orderMeta.sessionId && orderMeta.session?.tableId) {
      await tx.$queryRaw`
        SELECT id FROM public."tables"
        WHERE id = ${orderMeta.session.tableId}::uuid
          AND "restaurantId" = ${restaurantId}::uuid
        FOR UPDATE
      `;
      const lockedSessions = await tx.$queryRaw<LockedSessionRow[]>`
        SELECT id, "restaurantId", "tableId", "sessionNumber", status::text
        FROM public."table_sessions"
        WHERE id = ${orderMeta.sessionId}::uuid
          AND "restaurantId" = ${restaurantId}::uuid
        FOR UPDATE
      `;
      const lockedSession = lockedSessions[0];
      if (!lockedSession || lockedSession.status !== 'ACTIVE') {
        throw new ConflictError(
          `Cannot modify order because its table session is ${lockedSession?.status ?? 'unavailable'}`
        );
      }
    }

    const lockedOrders = await tx.$queryRaw<LockedOrderRow[]>`
      SELECT id, "restaurantId", "sessionId", "orderType"::text AS "orderType", status::text AS status, "paymentStatus"::text AS "paymentStatus", "discountAmount"
      FROM public."orders"
      WHERE id = ${orderId}::uuid
        AND "restaurantId" = ${restaurantId}::uuid
      FOR UPDATE
    `;
    const order = lockedOrders[0];
    if (!order) {
      throw new NotFoundError('Order not found in this restaurant');
    }

    // Re-check session consistency in case session changed before parent lock was obtained
    if (order.sessionId !== orderMeta.sessionId) {
      throw new ConflictError('Order session changed concurrently; please retry');
    }

    if (options.requireModifiableItems !== false && !MUTABLE_ORDER_STATUSES.has(order.status)) {
      throw new ConflictError(`Cannot modify order in ${order.status} status`);
    }

    if (order.paymentStatus !== 'UNPAID') {
      throw new ConflictError(
        `Cannot modify order when paymentStatus is ${order.paymentStatus}`
      );
    }

    // Enforce bill-freezing invariant matching fn_protect_frozen_order / fn_protect_frozen_order_item
    const freezingTx = await tx.transaction.findFirst({
      where: order.sessionId
        ? {
            restaurantId,
            sessionId: order.sessionId,
            status: { in: ['ACTIVE', 'COMPLETED'] },
          }
        : {
            restaurantId,
            directOrderId: order.id,
            status: { in: ['ACTIVE', 'COMPLETED'] },
          },
      select: { id: true, status: true },
    });
    if (freezingTx) {
      throw new ConflictError(
        `Order bill is frozen by an ${freezingTx.status} transaction and cannot be modified`
      );
    }

    return order;
  }

  /**
   * Fetches verified products from PostgreSQL for the authenticated restaurant
   * and rejects missing, deleted, cross-tenant, or unavailable products.
   */
  private async resolveCatalogProducts(
    tx: Prisma.TransactionClient,
    restaurantId: string,
    items: PosOrderItemInput[]
  ) {
    if (items.length === 0) {
      return new Map<
        string,
        { id: string; name: string; price: Prisma.Decimal; costPrice: Prisma.Decimal | null; isAvailable: boolean }
      >();
    }

    const uniqueProductIds = Array.from(new Set(items.map((item) => item.productId)));
    const products = await tx.product.findMany({
      where: {
        restaurantId,
        id: { in: uniqueProductIds },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        price: true,
        costPrice: true,
        isAvailable: true,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new NotFoundError(`Product ${item.productId} not found in this restaurant`);
      }
      if (!product.isAvailable) {
        throw new BadRequestError(`Product "${product.name}" is currently unavailable`);
      }
    }

    return productMap;
  }

  /**
   * Recomputes Order financials from persisted OrderItems and syncs TableSession / Table totals for DINE_IN.
   */
  private async recalculateTotals(
    tx: Prisma.TransactionClient,
    restaurantId: string,
    orderId: string,
    sessionId: string | null,
    discountAmountDecimal: Prisma.Decimal
  ): Promise<void> {
    const restaurant = await tx.restaurant.findUnique({
      where: { id: restaurantId },
      select: { taxRate: true, serviceChargeRate: true, isActive: true },
    });
    if (!restaurant || !restaurant.isActive) {
      throw new NotFoundError('Authenticated restaurant is inactive or missing');
    }

    const taxRatePercent = Number(restaurant.taxRate.toString());
    const serviceChargeRatePercent = Number(restaurant.serviceChargeRate.toString());

    const activeItems = await tx.orderItem.findMany({
      where: {
        orderId,
        restaurantId,
        status: { not: 'CANCELLED' },
      },
      select: { lineTotal: true },
    });

    const subtotalCents = activeItems.reduce((sum, item) => sum + decimalToCents(item.lineTotal), 0);
    const discountCents = decimalToCents(discountAmountDecimal);
    const orderFin = calculateFinancialsCents(
      subtotalCents,
      discountCents,
      taxRatePercent,
      serviceChargeRatePercent
    );

    try {
      await tx.order.update({
        where: { id: orderId },
        data: {
          subtotal: centsToDecimalString(orderFin.subtotalCents),
          taxAmount: centsToDecimalString(orderFin.taxAmountCents),
          serviceChargeAmount: centsToDecimalString(orderFin.serviceChargeAmountCents),
          total: centsToDecimalString(orderFin.totalCents),
        },
      });
    } catch (err) {
      mapPgTriggerError(err);
    }

    if (sessionId) {
      const sessionOrders = await tx.order.findMany({
        where: {
          restaurantId,
          sessionId,
          status: { not: 'CANCELLED' },
        },
        select: {
          subtotal: true,
          taxAmount: true,
          serviceChargeAmount: true,
          discountAmount: true,
          total: true,
        },
      });

      const agg = sessionOrders.reduce(
        (acc, o) => ({
          subtotal: acc.subtotal + decimalToCents(o.subtotal),
          taxAmount: acc.taxAmount + decimalToCents(o.taxAmount),
          serviceChargeAmount: acc.serviceChargeAmount + decimalToCents(o.serviceChargeAmount),
          discountAmount: acc.discountAmount + decimalToCents(o.discountAmount),
          totalAmount: acc.totalAmount + decimalToCents(o.total),
        }),
        { subtotal: 0, taxAmount: 0, serviceChargeAmount: 0, discountAmount: 0, totalAmount: 0 }
      );

      const updatedSession = await tx.tableSession.update({
        where: { id: sessionId },
        data: {
          subtotal: centsToDecimalString(agg.subtotal),
          taxAmount: centsToDecimalString(agg.taxAmount),
          serviceChargeAmount: centsToDecimalString(agg.serviceChargeAmount),
          discountAmount: centsToDecimalString(agg.discountAmount),
          totalAmount: centsToDecimalString(agg.totalAmount),
        },
        select: { tableId: true },
      });

      const currentTable = await tx.table.findUnique({
        where: { id: updatedSession.tableId },
        select: { status: true },
      });

      await tx.table.update({
        where: { id: updatedSession.tableId },
        data: {
          status: currentTable?.status === 'BUSY' ? 'BUSY' : 'OCCUPIED',
          isActive: true,
          totalAmount: centsToDecimalString(agg.totalAmount),
          lastActivityAt: new Date(),
        },
      });
    }
  }

  /**
   * Creates a new POS order (and initial OrderItems + DINE_IN TableSession if needed) atomically.
   */
  async createOrder(
    restaurantId: string,
    userId: string,
    input: CreatePosOrderInput
  ): Promise<{ order: PosOrderRecord; idempotentReplay: boolean }> {
    return prisma.$transaction(
      async (tx) => {
        if (input.idempotencyKey) {
          const existing = await tx.order.findFirst({
            where: {
              restaurantId,
              idempotencyKey: input.idempotencyKey,
            },
            include: posOrderInclude,
          });
          if (existing) {
            if (existing.orderType !== input.orderType) {
              throw new ConflictError(
                'Idempotency key already used for a different orderType'
              );
            }
            if (input.sessionId && existing.sessionId !== input.sessionId) {
              throw new ConflictError(
                'Idempotency key already used for a different sessionId'
              );
            }
            if (input.tableId && existing.session?.tableId !== input.tableId) {
              throw new ConflictError(
                'Idempotency key already used for a different tableId'
              );
            }
            return { order: existing, idempotentReplay: true };
          }
        }

        if (input.customerId) {
          const customer = await tx.customer.findFirst({
            where: { id: input.customerId, restaurantId },
            select: { id: true },
          });
          if (!customer) {
            throw new NotFoundError('Customer not found in this restaurant');
          }
        }

        let resolvedSessionId: string | null = null;
        if (input.orderType === 'DINE_IN') {
          const lockedTarget = await this.lockTableAndSessionForDineIn(tx, restaurantId, userId, {
            tableId: input.tableId,
            sessionId: input.sessionId,
          });
          resolvedSessionId = lockedTarget.session.id;
        }

        const productMap = await this.resolveCatalogProducts(tx, restaurantId, input.items);

        const createdOrder = await tx.order.create({
          data: {
            restaurantId,
            sessionId: resolvedSessionId,
            customerId: input.customerId ?? null,
            createdById: userId,
            orderNumber: generateUniqueCode('ORD'),
            idempotencyKey: input.idempotencyKey ?? null,
            source: 'POS',
            orderType: input.orderType,
            status: 'PENDING',
            paymentStatus: 'UNPAID',
            subtotal: '0.00',
            taxAmount: '0.00',
            serviceChargeAmount: '0.00',
            discountAmount: '0.00',
            total: '0.00',
            notes: input.notes ?? null,
          },
          select: { id: true, discountAmount: true },
        });

        try {
          for (const itemInput of input.items) {
            const product = productMap.get(itemInput.productId)!;
            const unitPriceCents = decimalToCents(product.price);
            const lineTotalCents = unitPriceCents * itemInput.quantity;

            await tx.orderItem.create({
              data: {
                restaurantId,
                orderId: createdOrder.id,
                productId: product.id,
                productName: product.name,
                quantity: itemInput.quantity,
                unitPrice: centsToDecimalString(unitPriceCents),
                unitCost: product.costPrice ?? null,
                lineTotal: centsToDecimalString(lineTotalCents),
                instructions: itemInput.instructions ?? null,
                status: 'PENDING',
              },
            });
          }
        } catch (err) {
          mapPgTriggerError(err);
        }

        await this.recalculateTotals(
          tx,
          restaurantId,
          createdOrder.id,
          resolvedSessionId,
          createdOrder.discountAmount
        );

        const hydratedOrder = await tx.order.findFirstOrThrow({
          where: { id: createdOrder.id, restaurantId },
          include: posOrderInclude,
        });

        return { order: hydratedOrder, idempotentReplay: false };
      },
      { maxWait: 10000, timeout: 15000 }
    );
  }

  /**
   * Adds a new item to an existing mutable POS order and recalculates backend totals atomically.
   */
  async addOrderItem(
    restaurantId: string,
    orderId: string,
    input: AddPosOrderItemInput
  ): Promise<PosOrderRecord> {
    return prisma.$transaction(
      async (tx) => {
        const order = await this.lockMutableOrder(tx, restaurantId, orderId);
        const productMap = await this.resolveCatalogProducts(tx, restaurantId, [input]);
        const product = productMap.get(input.productId)!;

        const unitPriceCents = decimalToCents(product.price);
        const lineTotalCents = unitPriceCents * input.quantity;

        try {
          await tx.orderItem.create({
            data: {
              restaurantId,
              orderId: order.id,
              productId: product.id,
              productName: product.name,
              quantity: input.quantity,
              unitPrice: centsToDecimalString(unitPriceCents),
              unitCost: product.costPrice ?? null,
              lineTotal: centsToDecimalString(lineTotalCents),
              instructions: input.instructions ?? null,
              status: 'PENDING',
            },
          });
        } catch (err) {
          mapPgTriggerError(err);
        }

        await this.recalculateTotals(
          tx,
          restaurantId,
          order.id,
          order.sessionId,
          order.discountAmount
        );

        return tx.order.findFirstOrThrow({
          where: { id: order.id, restaurantId },
          include: posOrderInclude,
        });
      },
      { maxWait: 10000, timeout: 15000 }
    );
  }

  /**
   * Updates quantity or instructions of an existing OrderItem using stored unitPrice snapshot,
   * then recalculates Order and DINE_IN session totals.
   */
  async updateOrderItem(
    restaurantId: string,
    orderId: string,
    itemId: string,
    input: UpdatePosOrderItemInput
  ): Promise<PosOrderRecord> {
    return prisma.$transaction(
      async (tx) => {
        const order = await this.lockMutableOrder(tx, restaurantId, orderId);

        const items = await tx.$queryRaw<
          Array<{
            id: string;
            quantity: number;
            unitPrice: Prisma.Decimal;
            instructions: string | null;
            status: string;
          }>
        >`
          SELECT id, quantity, "unitPrice", instructions, status::text AS status
          FROM public."order_items"
          WHERE id = ${itemId}::uuid
            AND "orderId" = ${orderId}::uuid
            AND "restaurantId" = ${restaurantId}::uuid
          FOR UPDATE
        `;
        const item = items[0];
        if (!item) {
          throw new NotFoundError('Order item not found on this order');
        }

        if (item.status === 'CANCELLED') {
          throw new ConflictError('Cannot modify a CANCELLED order item');
        }

        const nextQuantity = input.quantity ?? item.quantity;
        const unitPriceCents = decimalToCents(item.unitPrice);
        const nextLineTotalCents = unitPriceCents * nextQuantity;

        try {
          await tx.orderItem.update({
            where: { id: item.id },
            data: {
              quantity: nextQuantity,
              lineTotal: centsToDecimalString(nextLineTotalCents),
              ...(input.instructions !== undefined ? { instructions: input.instructions } : {}),
            },
          });
        } catch (err) {
          mapPgTriggerError(err);
        }

        await this.recalculateTotals(
          tx,
          restaurantId,
          order.id,
          order.sessionId,
          order.discountAmount
        );

        return tx.order.findFirstOrThrow({
          where: { id: order.id, restaurantId },
          include: posOrderInclude,
        });
      },
      { maxWait: 10000, timeout: 15000 }
    );
  }

  /**
   * Removes an OrderItem from a mutable order and recalculates Order / TableSession totals.
   */
  async removeOrderItem(
    restaurantId: string,
    orderId: string,
    itemId: string
  ): Promise<PosOrderRecord> {
    return prisma.$transaction(
      async (tx) => {
        const order = await this.lockMutableOrder(tx, restaurantId, orderId);

        const items = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id
          FROM public."order_items"
          WHERE id = ${itemId}::uuid
            AND "orderId" = ${orderId}::uuid
            AND "restaurantId" = ${restaurantId}::uuid
          FOR UPDATE
        `;
        if (!items[0]) {
          throw new NotFoundError('Order item not found on this order');
        }

        try {
          await tx.orderItem.delete({
            where: { id: itemId },
          });
        } catch (err) {
          mapPgTriggerError(err);
        }

        await this.recalculateTotals(
          tx,
          restaurantId,
          order.id,
          order.sessionId,
          order.discountAmount
        );

        return tx.order.findFirstOrThrow({
          where: { id: order.id, restaurantId },
          include: posOrderInclude,
        });
      },
      { maxWait: 10000, timeout: 15000 }
    );
  }

  /**
   * Updates non-financial kitchen status or notes on a mutable POS order.
   */
  async updateOrder(
    restaurantId: string,
    orderId: string,
    input: UpdatePosOrderInput
  ): Promise<PosOrderRecord> {
    return prisma.$transaction(
      async (tx) => {
        const order = await this.lockMutableOrder(tx, restaurantId, orderId);

        if (input.status !== undefined) {
          const allowedTransitions: Record<string, string[]> = {
            PENDING: ['PENDING', 'PREPARING', 'READY', 'SERVED'],
            PREPARING: ['PREPARING', 'READY', 'SERVED'],
            READY: ['READY', 'SERVED'],
            SERVED: ['SERVED'],
          };
          const allowed = allowedTransitions[order.status] ?? [];
          if (!allowed.includes(input.status)) {
            throw new ConflictError(
              `Invalid order status transition from ${order.status} to ${input.status}`
            );
          }
        }

        try {
          await tx.order.update({
            where: { id: order.id },
            data: {
              ...(input.status !== undefined ? { status: input.status } : {}),
              ...(input.notes !== undefined ? { notes: input.notes } : {}),
            },
          });
        } catch (err) {
          mapPgTriggerError(err);
        }

        return tx.order.findFirstOrThrow({
          where: { id: order.id, restaurantId },
          include: posOrderInclude,
        });
      },
      { maxWait: 10000, timeout: 15000 }
    );
  }

  /**
   * Cancels an unpaid, unfrozen POS order and recalculates session totals.
   */
  async cancelOrder(
    restaurantId: string,
    orderId: string,
    reason?: string | null
  ): Promise<PosOrderRecord> {
    return prisma.$transaction(
      async (tx) => {
        const order = await this.lockMutableOrder(tx, restaurantId, orderId);

        try {
          await tx.orderItem.updateMany({
            where: { orderId: order.id, restaurantId },
            data: { status: 'CANCELLED' },
          });

          await tx.order.update({
            where: { id: order.id },
            data: {
              status: 'CANCELLED',
              cancelledAt: new Date(),
              cancellationReason: reason ?? null,
            },
          });
        } catch (err) {
          mapPgTriggerError(err);
        }

        await this.recalculateTotals(
          tx,
          restaurantId,
          order.id,
          order.sessionId,
          order.discountAmount
        );

        return tx.order.findFirstOrThrow({
          where: { id: order.id, restaurantId },
          include: posOrderInclude,
        });
      },
      { maxWait: 10000, timeout: 15000 }
    );
  }
}

export const posOrderRepository = new PosOrderRepository();
