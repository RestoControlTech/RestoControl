/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { Order } from '../types';

export interface OrderNotificationItem {
  id: string;
  orderId: string;
  orderNumber: string;
  tableName: string;
  itemCount: number;
  total: number;
  createdAt: number;
  handled: boolean;
}

export interface OrderNotificationStoreState {
  notifications: OrderNotificationItem[];
  activeToast: OrderNotificationItem | null;
  notifiedOrderIds: string[];
  notifyNewOrder: (order: Order) => void;
  dismissToast: () => void;
  markAsHandled: (orderId: string) => void;
  clearAll: () => void;
  getUnhandledCount: () => number;
}

export const useOrderNotificationStore = create<OrderNotificationStoreState>((set, get) => ({
  notifications: [],
  activeToast: null,
  notifiedOrderIds: [],

  notifyNewOrder: (order: Order) => {
    const { notifiedOrderIds } = get();
    // Guard against repeated duplicate notifications for the same order
    if (
      notifiedOrderIds.includes(order.id) ||
      (order.orderNumber && notifiedOrderIds.includes(order.orderNumber))
    ) {
      return;
    }

    const itemCount = (order.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);

    const newNotification: OrderNotificationItem = {
      id: `notif-${order.id}-${Date.now()}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      tableName: order.table,
      itemCount: itemCount > 0 ? itemCount : 1,
      total: order.total,
      createdAt: Date.now(),
      handled: false,
    };

    set((state) => ({
      notifications: [newNotification, ...state.notifications],
      activeToast: newNotification,
      notifiedOrderIds: [...state.notifiedOrderIds, order.id, order.orderNumber],
    }));
  },

  dismissToast: () => {
    set({ activeToast: null });
  },

  markAsHandled: (orderId: string) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.orderId === orderId || n.orderNumber === orderId ? { ...n, handled: true } : n
      ),
      activeToast:
        state.activeToast?.orderId === orderId || state.activeToast?.orderNumber === orderId
          ? null
          : state.activeToast,
    }));
  },

  clearAll: () => {
    set({ notifications: [], activeToast: null });
  },

  getUnhandledCount: () => {
    return get().notifications.filter((n) => !n.handled).length;
  },
}));
