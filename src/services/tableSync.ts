/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Table, Order, Transaction, PaymentConfirmation } from '../types';
import { useAuthStore } from '../auth/auth.store';

class TableSyncService {
  private inFlightTables = false;
  private inFlightOrders = false;
  private lastActivityMap = new Map<string, number>();

  /**
   * Helper to attach user authentication / RBAC role header
   */
  private getAuthHeaders(): HeadersInit {
    const user = useAuthStore.getState().user;
    const role = user?.role || 'customer';
    return {
      'Content-Type': 'application/json',
      'x-user-role': role,
    };
  }

  /**
   * Fetch live table state from shared backend
   */
  public async fetchTables(): Promise<Table[] | null> {
    if (this.inFlightTables) return null;
    this.inFlightTables = true;
    try {
      const res = await fetch('/api/tables', {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.tables || null;
    } catch {
      // Backend not running (e.g. static preview or isolated test)
      return null;
    } finally {
      this.inFlightTables = false;
    }
  }

  /**
   * Fetch live orders from shared backend
   */
  public async fetchOrders(): Promise<Order[] | null> {
    if (this.inFlightOrders) return null;
    this.inFlightOrders = true;
    try {
      const res = await fetch('/api/orders', {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.orders || null;
    } catch {
      return null;
    } finally {
      this.inFlightOrders = false;
    }
  }

  /**
   * Customer scans Table QR code / enters customer menu.
   * Debounces duplicate triggers within 2 seconds.
   */
  public async recordTableActivity(tableIdOrName: string): Promise<Table | null> {
    const key = (tableIdOrName || '').toLowerCase().trim();
    const now = Date.now();
    const last = this.lastActivityMap.get(key) || 0;
    if (now - last < 2000) {
      // Avoid duplicate fast spam
      return null;
    }
    this.lastActivityMap.set(key, now);

    try {
      const res = await fetch(`/api/tables/${encodeURIComponent(tableIdOrName)}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.table || null;
    } catch (err) {
      console.warn('[TableSyncService] recordTableActivity offline fallback:', err);
      return null;
    }
  }

  /**
   * Submit new order to shared backend
   */
  public async submitOrder(orderPayload: Partial<Order>): Promise<{ order: Order; table: Table } | null> {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(orderPayload),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return { order: data.order, table: data.table };
    } catch (err) {
      console.warn('[TableSyncService] submitOrder offline fallback:', err);
      return null;
    }
  }

  /**
   * Staff receives payment for all outstanding orders on a table.
   * Atomic backend transaction resets table card to white, clears activity, and zeroes total.
   */
  public async payTableOrders(
    tableIdOrName: string,
    paymentInfo?: Partial<PaymentConfirmation>
  ): Promise<{ table: Table; paidOrders: Order[]; totalPaid: number; transaction?: Transaction } | null> {
    try {
      const res = await fetch(`/api/tables/${encodeURIComponent(tableIdOrName)}/pay`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ paymentInfo }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Payment failed');
      }
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('[TableSyncService] payTableOrders error:', err);
      throw err;
    }
  }

  /**
   * Reset / clear table activity
   */
  public async clearTableActivity(tableIdOrName: string): Promise<Table | null> {
    try {
      const res = await fetch(`/api/tables/${encodeURIComponent(tableIdOrName)}/clear`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.table || null;
    } catch {
      return null;
    }
  }

  /**
   * Toggle table status
   */
  public async toggleTableStatus(tableIdOrName: string): Promise<Table | null> {
    try {
      const res = await fetch(`/api/tables/${encodeURIComponent(tableIdOrName)}/toggle`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.table || null;
    } catch {
      return null;
    }
  }
}

export const tableSync = new TableSyncService();
