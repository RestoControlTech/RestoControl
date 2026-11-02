/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import { getDatabase } from './database.ts';

export const createApiRouter = () => {
  const router = express.Router();
  const db = getDatabase();

  // Helper to extract role from headers
  const getActorRole = (req: Request): 'customer' | 'staff' | 'admin' => {
    const roleHeader = (req.headers['x-user-role'] as string) || '';
    if (roleHeader.toLowerCase() === 'admin') return 'admin';
    if (roleHeader.toLowerCase() === 'staff') return 'staff';
    return 'customer';
  };

  // --- TABLES ENDPOINTS ---

  // GET /api/tables - List all tables with activity, status, and outstanding amount
  router.get('/tables', (_req: Request, res: Response) => {
    try {
      const tables = db.getTables();
      res.json({ success: true, tables });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/tables/:tableId - Get details of a specific table
  router.get('/tables/:tableId', (req: Request, res: Response) => {
    try {
      const table = db.findTable(req.params.tableId);
      if (!table) {
        return res.status(404).json({ success: false, error: `Table '${req.params.tableId}' not found` });
      }
      table.totalAmount = db.computeTableTotal(table.id);
      res.json({ success: true, table });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/tables/:tableId/activity - Customer scans QR / opens menu
  // Validates table, sets isActive = true, status = Busy, updates lastActivity
  router.post('/tables/:tableId/activity', async (req: Request, res: Response) => {
    try {
      const tableId = req.params.tableId;
      if (!tableId) {
        return res.status(400).json({ success: false, error: 'Table ID is required' });
      }

      const result = await db.recordTableActivity(tableId);
      if (!result.success) {
        return res.status(404).json(result);
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/tables/:tableId/pay - Staff receives payment for all outstanding orders on a table
  // Marks orders paid, clears activity, resets table to white (Available, 0 total)
  router.post('/tables/:tableId/pay', async (req: Request, res: Response) => {
    try {
      const role = getActorRole(req);
      if (role === 'customer') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Customers are not permitted to mark orders as paid.',
        });
      }

      const tableId = req.params.tableId;
      const paymentInfo = req.body?.paymentInfo;
      const result = await db.payTableOrders(tableId, paymentInfo, role);

      if (!result.success) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/tables/:tableId/clear - Reset / clear table state
  router.post('/tables/:tableId/clear', async (req: Request, res: Response) => {
    try {
      const role = getActorRole(req);
      if (role === 'customer') {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      const result = await db.clearTableActivity(req.params.tableId);
      if (!result.success) {
        return res.status(404).json(result);
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/tables/:tableId/toggle - Manual table status toggle (staff only)
  router.post('/tables/:tableId/toggle', async (req: Request, res: Response) => {
    try {
      const result = await db.toggleTableStatus(req.params.tableId);
      if (!result.success) {
        return res.status(404).json(result);
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- ORDERS ENDPOINTS ---

  // GET /api/orders - Get orders (optionally filter by table)
  router.get('/orders', (req: Request, res: Response) => {
    try {
      let orders = db.getOrders();
      const tableFilter = req.query.table as string;
      if (tableFilter) {
        const clean = tableFilter.trim().toLowerCase().replace(/[\s-_]+/g, '');
        orders = orders.filter((o) => {
          const tClean = o.table.trim().toLowerCase().replace(/[\s-_]+/g, '');
          const tIdClean = (o.tableId || '').toLowerCase().replace(/[\s-_]+/g, '');
          return tClean === clean || tIdClean === clean;
        });
      }
      res.json({ success: true, orders });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/orders - Create a new order
  // Customer submissions create separate orders and CANNOT mark as paid
  router.post('/orders', async (req: Request, res: Response) => {
    try {
      const role = getActorRole(req);
      const payload = req.body;

      if (!payload || !payload.tableId && !payload.table) {
        return res.status(400).json({ success: false, error: 'Table ID or Name is required' });
      }

      const result = await db.createOrder(payload, role);
      if (!result.success) {
        return res.status(400).json(result);
      }
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // PUT /api/orders/:orderId/status - Update kitchen status
  router.put('/orders/:orderId/status', async (req: Request, res: Response) => {
    try {
      const status = req.body?.status;
      if (!status) {
        return res.status(400).json({ success: false, error: 'Status is required' });
      }
      const result = await db.updateOrderStatus(req.params.orderId, status);
      if (!result.success) {
        return res.status(404).json(result);
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/transactions - Get completed sales
  router.get('/transactions', (_req: Request, res: Response) => {
    try {
      const transactions = db.getTransactions();
      res.json({ success: true, transactions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/reset - Reset database to default state (clean state for testing)
  router.post('/reset', (_req: Request, res: Response) => {
    try {
      db.resetDefaults();
      res.json({ success: true, message: 'Database reset to default clean state' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};

export const createApiApp = () => {
  const app = express();
  app.use(express.json());

  // CORS middleware for multi-device network support
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-role');
    next();
  });

  app.use('/api', createApiRouter());
  return app;
};
