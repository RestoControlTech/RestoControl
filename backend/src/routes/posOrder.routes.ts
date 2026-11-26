/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { posOrderController } from '../controllers/posOrder.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/authorize.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { validate } from '../middleware/validate.js';
import {
  addPosOrderItemSchema,
  cancelPosOrderSchema,
  createPosOrderSchema,
  posOrderIdParamsSchema,
  posOrderItemParamsSchema,
  posOrdersListQuerySchema,
  updatePosOrderItemSchema,
  updatePosOrderSchema,
} from '../validators/posOrder.validator.js';

export const posOrderRouter = Router();

// Enforce authentication, strict tenant isolation, and POS access on all order routes
posOrderRouter.use(authenticate, tenantContext, requirePermission('pos.use'));

// GET /api/pos/orders
posOrderRouter.get(
  '/',
  requirePermission('orders.view'),
  validate({ query: posOrdersListQuerySchema }),
  (req, res, next) => posOrderController.listOrders(req, res, next)
);

// GET /api/pos/orders/:orderId
posOrderRouter.get(
  '/:orderId',
  requirePermission('orders.view'),
  validate({ params: posOrderIdParamsSchema }),
  (req, res, next) => posOrderController.getOrderById(req, res, next)
);

// POST /api/pos/orders
posOrderRouter.post(
  '/',
  requirePermission('orders.create'),
  validate({ body: createPosOrderSchema }),
  (req, res, next) => posOrderController.createOrder(req, res, next)
);

// PATCH /api/pos/orders/:orderId
posOrderRouter.patch(
  '/:orderId',
  requirePermission('orders.update'),
  validate({ params: posOrderIdParamsSchema, body: updatePosOrderSchema }),
  (req, res, next) => posOrderController.updateOrder(req, res, next)
);

// POST /api/pos/orders/:orderId/cancel
posOrderRouter.post(
  '/:orderId/cancel',
  requirePermission('orders.cancel'),
  validate({ params: posOrderIdParamsSchema, body: cancelPosOrderSchema }),
  (req, res, next) => posOrderController.cancelOrder(req, res, next)
);

// POST /api/pos/orders/:orderId/items
posOrderRouter.post(
  '/:orderId/items',
  requirePermission('orders.update'),
  validate({ params: posOrderIdParamsSchema, body: addPosOrderItemSchema }),
  (req, res, next) => posOrderController.addOrderItem(req, res, next)
);

// PATCH /api/pos/orders/:orderId/items/:itemId
posOrderRouter.patch(
  '/:orderId/items/:itemId',
  requirePermission('orders.update'),
  validate({ params: posOrderItemParamsSchema, body: updatePosOrderItemSchema }),
  (req, res, next) => posOrderController.updateOrderItem(req, res, next)
);

// DELETE /api/pos/orders/:orderId/items/:itemId
posOrderRouter.delete(
  '/:orderId/items/:itemId',
  requirePermission('orders.update'),
  validate({ params: posOrderItemParamsSchema }),
  (req, res, next) => posOrderController.removeOrderItem(req, res, next)
);
