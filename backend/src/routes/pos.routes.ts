/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { posController } from '../controllers/pos.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requirePermission } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  posCategoriesQuerySchema,
  posProductsQuerySchema,
  posTablesQuerySchema,
} from '../validators/pos.validator.js';

export const posRouter = Router();

// Enforce authentication, tenant isolation, and POS permission on all POS read routes
posRouter.use(authenticate, tenantContext, requirePermission('pos.use'));

// GET /api/pos/products
posRouter.get('/products', validate({ query: posProductsQuerySchema }), (req, res, next) =>
  posController.listProducts(req, res, next)
);

// GET /api/pos/categories
posRouter.get('/categories', validate({ query: posCategoriesQuerySchema }), (req, res, next) =>
  posController.listCategories(req, res, next)
);

// GET /api/pos/tables
posRouter.get('/tables', validate({ query: posTablesQuerySchema }), (req, res, next) =>
  posController.listTables(req, res, next)
);
