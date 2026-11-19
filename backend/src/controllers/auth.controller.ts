/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';

export class AuthController {
  /**
   * POST /api/auth/login
   * Authenticates user credentials and returns a JWT token with safe profile
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/auth/me
   * Returns safe profile and active permissions for the currently authenticated user
   */
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getCurrentUser(req.user!.id);
      res.status(200).json({
        success: true,
        data: {
          user,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/logout
   * Stateless logout endpoint acknowledging session termination; instructing the client to purge token
   */
  async logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        message: 'Logged out successfully. The client must clear the stored authentication token.',
      });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
