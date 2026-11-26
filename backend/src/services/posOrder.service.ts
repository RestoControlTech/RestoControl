/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { posOrderRepository, PosOrderRecord } from '../repositories/posOrder.repository.js';
import { NotFoundError } from '../utils/errors.js';
import {
  AddPosOrderItemInput,
  CancelPosOrderInput,
  CreatePosOrderInput,
  PosOrdersListQueryInput,
  UpdatePosOrderInput,
  UpdatePosOrderItemInput,
} from '../validators/posOrder.validator.js';

export interface PosOrderItemDto {
  id: string;
  orderId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  instructions: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PosOrderDto {
  id: string;
  orderNumber: string;
  source: string;
  orderType: string;
  status: string;
  paymentStatus: string;
  sessionId: string | null;
  customerId: string | null;
  customer: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
  session: {
    id: string;
    sessionNumber: string;
    status: string;
    tableId: string;
    totalAmount: string;
    table: {
      id: string;
      legacyId: string | null;
      name: string;
      section: string;
      status: string;
    };
  } | null;
  subtotal: string;
  taxAmount: string;
  serviceChargeAmount: string;
  discountAmount: string;
  total: string;
  notes: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: PosOrderItemDto[];
}

function mapOrderDto(record: PosOrderRecord): PosOrderDto {
  return {
    id: record.id,
    orderNumber: record.orderNumber,
    source: record.source,
    orderType: record.orderType,
    status: record.status,
    paymentStatus: record.paymentStatus,
    sessionId: record.sessionId,
    customerId: record.customerId,
    customer: record.customer,
    session: record.session
      ? {
          id: record.session.id,
          sessionNumber: record.session.sessionNumber,
          status: record.session.status,
          tableId: record.session.tableId,
          totalAmount: record.session.totalAmount.toFixed(2),
          table: record.session.table,
        }
      : null,
    subtotal: record.subtotal.toFixed(2),
    taxAmount: record.taxAmount.toFixed(2),
    serviceChargeAmount: record.serviceChargeAmount.toFixed(2),
    discountAmount: record.discountAmount.toFixed(2),
    total: record.total.toFixed(2),
    notes: record.notes,
    cancellationReason: record.cancellationReason,
    cancelledAt: record.cancelledAt ? record.cancelledAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    items: record.items.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toFixed(2),
      lineTotal: item.lineTotal.toFixed(2),
      instructions: item.instructions,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
  };
}

export class PosOrderService {
  async listOrders(
    restaurantId: string,
    query: PosOrdersListQueryInput
  ): Promise<{ orders: PosOrderDto[]; total: number }> {
    const records = await posOrderRepository.findMany(restaurantId, query);
    const orders = records.map(mapOrderDto);
    return { orders, total: orders.length };
  }

  async getOrderById(restaurantId: string, orderId: string): Promise<PosOrderDto> {
    const record = await posOrderRepository.findById(restaurantId, orderId);
    if (!record) {
      throw new NotFoundError('Order not found in this restaurant');
    }
    return mapOrderDto(record);
  }

  async createOrder(
    restaurantId: string,
    userId: string,
    input: CreatePosOrderInput
  ): Promise<{ order: PosOrderDto; idempotentReplay: boolean }> {
    const result = await posOrderRepository.createOrder(restaurantId, userId, input);
    return {
      order: mapOrderDto(result.order),
      idempotentReplay: result.idempotentReplay,
    };
  }

  async addOrderItem(
    restaurantId: string,
    orderId: string,
    input: AddPosOrderItemInput
  ): Promise<PosOrderDto> {
    const updated = await posOrderRepository.addOrderItem(restaurantId, orderId, input);
    return mapOrderDto(updated);
  }

  async updateOrderItem(
    restaurantId: string,
    orderId: string,
    itemId: string,
    input: UpdatePosOrderItemInput
  ): Promise<PosOrderDto> {
    const updated = await posOrderRepository.updateOrderItem(restaurantId, orderId, itemId, input);
    return mapOrderDto(updated);
  }

  async removeOrderItem(
    restaurantId: string,
    orderId: string,
    itemId: string
  ): Promise<PosOrderDto> {
    const updated = await posOrderRepository.removeOrderItem(restaurantId, orderId, itemId);
    return mapOrderDto(updated);
  }

  async updateOrder(
    restaurantId: string,
    orderId: string,
    input: UpdatePosOrderInput
  ): Promise<PosOrderDto> {
    const updated = await posOrderRepository.updateOrder(restaurantId, orderId, input);
    return mapOrderDto(updated);
  }

  async cancelOrder(
    restaurantId: string,
    orderId: string,
    input: CancelPosOrderInput
  ): Promise<PosOrderDto> {
    const updated = await posOrderRepository.cancelOrder(restaurantId, orderId, input.reason);
    return mapOrderDto(updated);
  }
}

export const posOrderService = new PosOrderService();
