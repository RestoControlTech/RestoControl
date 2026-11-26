/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { salesService } from '../services/sales.service.js';
import { SalesListQueryInput } from '../validators/sales.validator.js';

export class SalesController {
  /**
   * GET /api/sales
   * Returns paginated sales history for the authenticated restaurant.
   */
  async listSales(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurantId = req.restaurantId!;
      const query = req.query as unknown as SalesListQueryInput;
      const result = await salesService.listSales(restaurantId, query);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/sales/:id
   * Returns detailed sale transaction data within the authenticated restaurant.
   */
  async getSaleById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurantId = req.restaurantId!;
      const id = req.params.id;
      const sale = await salesService.getSaleById(restaurantId, id);

      res.status(200).json({
        success: true,
        data: {
          sale,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const salesController = new SalesController();
