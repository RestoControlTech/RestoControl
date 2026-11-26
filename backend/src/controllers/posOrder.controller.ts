/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextFunction, Request, Response } from 'express';
import { posOrderService } from '../services/posOrder.service.js';
import {
  AddPosOrderItemInput,
  CancelPosOrderInput,
  CreatePosOrderInput,
  PosOrdersListQueryInput,
  UpdatePosOrderInput,
  UpdatePosOrderItemInput,
} from '../validators/posOrder.validator.js';

export class PosOrderController {
  /**
   * GET /api/pos/orders
   */
  async listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurantId = req.restaurantId!;
      const query = req.query as unknown as PosOrdersListQueryInput;
      const result = await posOrderService.listOrders(restaurantId, query);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/pos/orders/:orderId
   */
  async getOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurantId = req.restaurantId!;
      const order = await posOrderService.getOrderById(restaurantId, req.params.orderId);

      res.status(200).json({
        success: true,
        data: { order },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/pos/orders
   */
  async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurantId = req.restaurantId!;
      const userId = req.user!.id;
      const body = req.body as CreatePosOrderInput;
      const result = await posOrderService.createOrder(restaurantId, userId, body);

      res.status(result.idempotentReplay ? 200 : 201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/pos/orders/:orderId/items
   */
  async addOrderItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurantId = req.restaurantId!;
      const body = req.body as AddPosOrderItemInput;
      const order = await posOrderService.addOrderItem(restaurantId, req.params.orderId, body);

      res.status(201).json({
        success: true,
        data: { order },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/pos/orders/:orderId/items/:itemId
   */
  async updateOrderItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurantId = req.restaurantId!;
      const body = req.body as UpdatePosOrderItemInput;
      const order = await posOrderService.updateOrderItem(
        restaurantId,
        req.params.orderId,
        req.params.itemId,
        body
      );

      res.status(200).json({
        success: true,
        data: { order },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/pos/orders/:orderId/items/:itemId
   */
  async removeOrderItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurantId = req.restaurantId!;
      const order = await posOrderService.removeOrderItem(
        restaurantId,
        req.params.orderId,
        req.params.itemId
      );

      res.status(200).json({
        success: true,
        data: { order },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/pos/orders/:orderId
   */
  async updateOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurantId = req.restaurantId!;
      const body = req.body as UpdatePosOrderInput;
      const order = await posOrderService.updateOrder(restaurantId, req.params.orderId, body);

      res.status(200).json({
        success: true,
        data: { order },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/pos/orders/:orderId/cancel
   */
  async cancelOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurantId = req.restaurantId!;
      const body = req.body as CancelPosOrderInput;
      const order = await posOrderService.cancelOrder(restaurantId, req.params.orderId, body);

      res.status(200).json({
        success: true,
        data: { order },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const posOrderController = new PosOrderController();
