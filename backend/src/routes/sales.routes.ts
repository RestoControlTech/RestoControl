/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { salesController } from '../controllers/sales.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requirePermission } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { saleIdParamsSchema, salesListQuerySchema } from '../validators/sales.validator.js';

export const salesRouter = Router();

// Enforce authentication, tenant isolation, and sales.view permission for all routes
salesRouter.use(authenticate, tenantContext, requirePermission('sales.view'));

// GET /api/sales
salesRouter.get('/', validate({ query: salesListQuerySchema }), (req, res, next) =>
  salesController.listSales(req, res, next)
);

// GET /api/sales/:id
salesRouter.get('/:id', validate({ params: saleIdParamsSchema }), (req, res, next) =>
  salesController.getSaleById(req, res, next)
);
