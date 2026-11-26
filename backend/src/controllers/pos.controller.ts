/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { posService } from '../services/pos.service.js';
import {
  PosCategoriesQueryInput,
  PosProductsQueryInput,
  PosTablesQueryInput,
} from '../validators/pos.validator.js';

export class PosController {
  /**
   * GET /api/pos/products
   */
  async listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurantId = req.restaurantId!;
      const query = req.query as unknown as PosProductsQueryInput;
      const result = await posService.listProducts(restaurantId, query);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/pos/categories
   */
  async listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurantId = req.restaurantId!;
      const query = req.query as unknown as PosCategoriesQueryInput;
      const result = await posService.listCategories(restaurantId, query);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/pos/tables
   */
  async listTables(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurantId = req.restaurantId!;
      const query = req.query as unknown as PosTablesQueryInput;
      const result = await posService.listTables(restaurantId, query);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const posController = new PosController();
