/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import { Table, TableStatus, Order, Transaction, PaymentConfirmation } from '../types/index.ts';

export const INITIAL_TABLES: Table[] = [
  { id: 't1', name: 'Table 01', section: 'Main Dining', seats: 4, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t1', isActive: false, lastActivity: null, totalAmount: 0 },
  { id: 't2', name: 'Table 02', section: 'Main Dining', seats: 2, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t2', isActive: false, lastActivity: null, totalAmount: 0 },
  { id: 't3', name: 'Table 03', section: 'Main Dining', seats: 4, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t3', isActive: false, lastActivity: null, totalAmount: 0 },
  { id: 't4', name: 'Table 04', section: 'Main Dining', seats: 4, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t4', isActive: false, lastActivity: null, totalAmount: 0 },
  { id: 't5', name: 'Table 05', section: 'Indoor Booths', seats: 6, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t5', isActive: false, lastActivity: null, totalAmount: 0 },
  { id: 't6', name: 'Table 06', section: 'Indoor Booths', seats: 4, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t6', isActive: false, lastActivity: null, totalAmount: 0 },
  { id: 't7', name: 'Table 07', section: 'Outdoor Terrace', seats: 2, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t7', isActive: false, lastActivity: null, totalAmount: 0 },
  { id: 't8', name: 'Table 08', section: 'Outdoor Terrace', seats: 4, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t8', isActive: false, lastActivity: null, totalAmount: 0 },
];

export interface DatabaseSchema {
  tables: Table[];
  orders: Order[];
  transactions: Transaction[];
  version: number;
}

export class RestoDatabase {
  private dbFilePath: string;
  private tables: Table[] = [];
  private orders: Order[] = [];
  private transactions: Transaction[] = [];
  private isLocked = false;
  private queue: (() => void)[] = [];

  constructor(filePath?: string) {
    if (filePath) {
      this.dbFilePath = filePath;
    } else {
      // Default storage path in project directory
      const baseDir = typeof process !== 'undefined' && process.cwd ? process.cwd() : '.';
      this.dbFilePath = path.resolve(baseDir, 'src/data/resto_db.json');
    }
    this.load();
  }

  /**
   * Acquire transactional lock to prevent race conditions during concurrent requests
   */
  private async acquireLock(): Promise<() => void> {
    if (!this.isLocked) {
      this.isLocked = true;
      return () => {
        this.isLocked = false;
        const next = this.queue.shift();
        if (next) next();
      };
    }

    return new Promise<() => void>((resolve) => {
      this.queue.push(() => {
        this.isLocked = true;
        resolve(() => {
          this.isLocked = false;
          const next = this.queue.shift();
          if (next) next();
        });
      });
    });
  }

  private load(): void {
    try {
      if (fs.existsSync(this.dbFilePath)) {
        const raw = fs.readFileSync(this.dbFilePath, 'utf8');
        const data = JSON.parse(raw) as DatabaseSchema;
        this.tables = Array.isArray(data.tables) && data.tables.length > 0 ? data.tables : JSON.parse(JSON.stringify(INITIAL_TABLES));
        this.orders = Array.isArray(data.orders) ? data.orders : [];
        this.transactions = Array.isArray(data.transactions) ? data.transactions : [];
      } else {
        this.resetDefaults();
      }
    } catch (err) {
      console.warn('[RestoDatabase] Failed to read db file, initializing defaults:', err);
      this.resetDefaults();
    }
    this.recalculateAllTableTotals();
  }

  public resetDefaults(): void {
    this.tables = JSON.parse(JSON.stringify(INITIAL_TABLES));
    this.orders = [];
    this.transactions = [];
    this.save();
  }

  private save(): void {
    try {
      const dir = path.dirname(this.dbFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data: DatabaseSchema = {
        tables: this.tables,
        orders: this.orders,
        transactions: this.transactions,
        version: 1,
      };
      // Atomic write via temp file
      const tempPath = `${this.dbFilePath}.${Date.now()}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tempPath, this.dbFilePath);
    } catch (err) {
      console.error('[RestoDatabase] Failed to persist database:', err);
    }
  }

  /**
   * Find table matching ID or Name (case-insensitive & slug-tolerant)
   */
  public findTable(tableIdOrName: string): Table | undefined {
    const clean = (tableIdOrName || '').trim().toLowerCase().replace(/[\s-_]+/g, '');
    return this.tables.find((t) => {
      const tId = t.id.toLowerCase().replace(/[\s-_]+/g, '');
      const tName = t.name.toLowerCase().replace(/[\s-_]+/g, '');
      return tId === clean || tName === clean;
    });
  }

  /**
   * Recalculate total outstanding unpaid order amount for a table
   */
  public computeTableTotal(tableId: string): number {
    const targetTable = this.findTable(tableId);
    if (!targetTable) return 0;

    const cleanTable = targetTable.name.trim().toLowerCase().replace(/[\s-_]+/g, '');
    const cleanId = targetTable.id.toLowerCase().replace(/[\s-_]+/g, '');

    const unpaidOrders = this.orders.filter((o) => {
      const oTableClean = o.table.trim().toLowerCase().replace(/[\s-_]+/g, '');
      const oIdClean = (o.tableId || '').toLowerCase().replace(/[\s-_]+/g, '');
      const matches = oTableClean === cleanTable || (oIdClean && oIdClean === cleanId);
      const isUnpaid = o.paymentStatus === 'UNPAID' || o.paymentStatus === 'Unpaid' || o.paymentStatus === 'Pending';
      return matches && isUnpaid && o.status !== 'Cancelled';
    });

    const sum = unpaidOrders.reduce((acc, order) => acc + (order.total || 0), 0);
    return Math.round(sum * 100) / 100;
  }

  private recalculateAllTableTotals(): void {
    for (const t of this.tables) {
      t.totalAmount = this.computeTableTotal(t.id);
    }
  }

  public getTables(): Table[] {
    this.recalculateAllTableTotals();
    return JSON.parse(JSON.stringify(this.tables));
  }

  public getOrders(): Order[] {
    return JSON.parse(JSON.stringify(this.orders));
  }

  public getTransactions(): Transaction[] {
    return JSON.parse(JSON.stringify(this.transactions));
  }

  /**
   * Customer scans Table QR code / enters menu route.
   * Validates table ID, marks table active, sets lastActivity timestamp, and sets status to Busy.
   */
  public async recordTableActivity(tableIdOrName: string): Promise<{ success: boolean; table?: Table; error?: string }> {
    const release = await this.acquireLock();
    try {
      const table = this.findTable(tableIdOrName);
      if (!table) {
        return { success: false, error: `Table '${tableIdOrName}' not found` };
      }

      table.isActive = true;
      table.lastActivity = Date.now();
      // Only set to Busy if not Reserved
      if (table.status !== 'Reserved') {
        table.status = 'Busy';
      }
      table.totalAmount = this.computeTableTotal(table.id);

      this.save();
      return { success: true, table: JSON.parse(JSON.stringify(table)) };
    } finally {
      release();
    }
  }

  /**
   * Add a new order (from QR customer or POS staff).
   * Separate order is created for each submission to preserve distinct bills and line items.
   * Customer requests CANNOT set paymentStatus = 'PAID'.
   */
  public async createOrder(orderPayload: Partial<Order>, actorRole: 'customer' | 'staff' | 'admin' = 'customer'): Promise<{ success: boolean; order?: Order; table?: Table; error?: string }> {
    const release = await this.acquireLock();
    try {
      const tableIdentifier = orderPayload.tableId || orderPayload.table || '';
      const table = this.findTable(tableIdentifier);
      if (!table) {
        return { success: false, error: `Invalid table: '${tableIdentifier}'` };
      }

      // Enforce security: Customers can never mark payment as PAID
      let paymentStatus = orderPayload.paymentStatus || 'UNPAID';
      if (actorRole === 'customer') {
        paymentStatus = 'UNPAID';
      }

      // Check idempotency: avoid duplicate order creation on network retries
      if (orderPayload.id) {
        const existing = this.orders.find((o) => o.id === orderPayload.id);
        if (existing) {
          table.totalAmount = this.computeTableTotal(table.id);
          return { success: true, order: existing, table };
        }
      }

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const orderNumber = orderPayload.orderNumber || `#ORD-${1000 + this.orders.length + 1}`;

      const newOrder: Order = {
        id: orderPayload.id || `ord-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        orderNumber,
        table: table.name,
        tableId: table.id,
        source: actorRole === 'customer' ? 'QR' : (orderPayload.source || 'POS'),
        customer: orderPayload.customer || (actorRole === 'customer' ? `QR Guest (${table.name})` : `${table.name} Walk-in`),
        orderType: orderPayload.orderType || 'Dine In',
        items: orderPayload.items || [],
        total: orderPayload.total ?? 0,
        paymentStatus: paymentStatus as any,
        status: orderPayload.status || 'NEW',
        dateTime: orderPayload.dateTime || `Today, ${timeStr}`,
        note: orderPayload.note || (actorRole === 'customer' ? 'Customer QR Order' : undefined),
      };

      this.orders.unshift(newOrder);

      // Update table state
      table.isActive = true;
      table.lastActivity = Date.now();
      if (table.status !== 'Reserved') {
        table.status = 'Busy';
      }
      table.totalAmount = this.computeTableTotal(table.id);

      this.save();
      return {
        success: true,
        order: JSON.parse(JSON.stringify(newOrder)),
        table: JSON.parse(JSON.stringify(table)),
      };
    } finally {
      release();
    }
  }

  /**
   * Staff receives payment for all outstanding orders on a table.
   * Transactional operation:
   * 1. Marks all associated unpaid orders as PAID.
   * 2. Clears table activity (isActive = false, lastActivity = null).
   * 3. Resets table card to white (status = 'Available').
   * 4. Resets displayed outstanding order amount to 0.
   * 5. Creates completed sales transaction record.
   */
  public async payTableOrders(
    tableIdOrName: string,
    paymentInfo?: Partial<PaymentConfirmation>,
    actorRole: 'customer' | 'staff' | 'admin' = 'staff'
  ): Promise<{ success: boolean; table?: Table; paidOrders?: Order[]; totalPaid?: number; transaction?: Transaction; error?: string }> {
    // Only authorized staff or admin can mark orders as paid
    if (actorRole === 'customer') {
      return { success: false, error: 'Unauthorized: Customers cannot mark orders as paid.' };
    }

    const release = await this.acquireLock();
    try {
      const table = this.findTable(tableIdOrName);
      if (!table) {
        return { success: false, error: `Table '${tableIdOrName}' not found` };
      }

      const cleanTable = table.name.trim().toLowerCase().replace(/[\s-_]+/g, '');
      const cleanId = table.id.toLowerCase().replace(/[\s-_]+/g, '');

      // Identify all outstanding unpaid orders for this table
      const unpaidOrders = this.orders.filter((o) => {
        const oTableClean = o.table.trim().toLowerCase().replace(/[\s-_]+/g, '');
        const oIdClean = (o.tableId || '').toLowerCase().replace(/[\s-_]+/g, '');
        const matches = oTableClean === cleanTable || (oIdClean && oIdClean === cleanId);
        const isUnpaid = o.paymentStatus === 'UNPAID' || o.paymentStatus === 'Unpaid' || o.paymentStatus === 'Pending';
        return matches && isUnpaid && o.status !== 'Cancelled';
      });

      const totalPaid = unpaidOrders.reduce((sum, o) => sum + (o.total || 0), 0);

      // Mark all identified orders as PAID in this atomic transaction
      for (const order of unpaidOrders) {
        order.paymentStatus = 'PAID';
        if (order.status === 'Draft' || order.status === 'NEW') {
          order.status = 'READY';
        }
      }

      // Create Sales Transaction if any orders were settled
      let newTx: Transaction | undefined;
      if (totalPaid > 0) {
        const allItems = unpaidOrders.flatMap((o) =>
          o.items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            subtotal: i.lineTotal,
          }))
        );

        newTx = {
          id: `tx-${Date.now()}`,
          orderNumber: unpaidOrders.map((o) => o.orderNumber).join(', '),
          dateTime: 'Just Now',
          table: table.name,
          type: 'Dine-in',
          amount: totalPaid,
          status: 'Receipt',
          paymentMethod:
            paymentInfo?.method === 'card'
              ? 'Credit Card'
              : paymentInfo?.method === 'cash'
              ? 'Cash'
              : 'Cash',
          cashReceived: paymentInfo?.cashReceived,
          change: paymentInfo?.change,
          amountPaid: paymentInfo?.cashReceived || totalPaid,
          items: allItems,
        };
        this.transactions.unshift(newTx);
      }

      // Clear table activity & reset card to white (Available, 0 total)
      table.isActive = false;
      table.lastActivity = null;
      table.status = 'Available';
      table.totalAmount = 0;

      this.save();

      return {
        success: true,
        table: JSON.parse(JSON.stringify(table)),
        paidOrders: JSON.parse(JSON.stringify(unpaidOrders)),
        totalPaid,
        transaction: newTx ? JSON.parse(JSON.stringify(newTx)) : undefined,
      };
    } finally {
      release();
    }
  }

  /**
   * Reset / clear table activity manually (e.g. table vacated)
   */
  public async clearTableActivity(tableIdOrName: string): Promise<{ success: boolean; table?: Table; error?: string }> {
    const release = await this.acquireLock();
    try {
      const table = this.findTable(tableIdOrName);
      if (!table) {
        return { success: false, error: `Table '${tableIdOrName}' not found` };
      }

      table.isActive = false;
      table.lastActivity = null;
      table.status = 'Available';
      table.totalAmount = 0;

      this.save();
      return { success: true, table: JSON.parse(JSON.stringify(table)) };
    } finally {
      release();
    }
  }

  /**
   * Toggle table status between Available -> Busy -> Reserved -> Available
   */
  public async toggleTableStatus(tableIdOrName: string): Promise<{ success: boolean; table?: Table; error?: string }> {
    const release = await this.acquireLock();
    try {
      const table = this.findTable(tableIdOrName);
      if (!table) {
        return { success: false, error: `Table '${tableIdOrName}' not found` };
      }

      const isBusy = table.status === 'Busy' || table.status === 'Occupied';
      const nextStatus: TableStatus = table.status === 'Available' ? 'Busy' : isBusy ? 'Reserved' : 'Available';
      table.status = nextStatus;
      if (nextStatus === 'Available') {
        table.isActive = false;
        table.lastActivity = null;
      } else if (nextStatus === 'Busy') {
        table.isActive = true;
        table.lastActivity = Date.now();
      }

      this.save();
      return { success: true, table: JSON.parse(JSON.stringify(table)) };
    } finally {
      release();
    }
  }

  /**
   * Advance order status (NEW -> PREPARING -> READY -> COMPLETED)
   */
  public async updateOrderStatus(orderId: string, status: Order['status']): Promise<{ success: boolean; order?: Order; error?: string }> {
    const release = await this.acquireLock();
    try {
      const order = this.orders.find((o) => o.id === orderId || o.orderNumber === orderId);
      if (!order) {
        return { success: false, error: `Order '${orderId}' not found` };
      }
      order.status = status;
      this.save();
      return { success: true, order: JSON.parse(JSON.stringify(order)) };
    } finally {
      release();
    }
  }
}

// Global shared singleton database instance
let instance: RestoDatabase | null = null;
export function getDatabase(): RestoDatabase {
  if (!instance) {
    instance = new RestoDatabase();
  }
  return instance;
}
