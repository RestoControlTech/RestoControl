/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Tenant Context Middleware.
 * Enforces that a valid restaurantId is present from the authenticated user
 * and blocks any cross-tenant request attempts (defense-in-depth).
 */
export function tenantContext(req: Request, _res: Response, next: NextFunction): void {
  try {
    const restaurantId = req.restaurantId;

    if (!restaurantId || !UUID_REGEX.test(restaurantId)) {
      throw new UnauthorizedError('Tenant context is missing or invalid');
    }

    // Check if client tried to specify a competing restaurantId in params or body
    const paramRestaurantId = req.params?.restaurantId;
    if (paramRestaurantId && paramRestaurantId !== restaurantId) {
      throw new ForbiddenError('Cross-restaurant access is strictly prohibited (param mismatch)');
    }

    const bodyRestaurantId = (req.body as any)?.restaurantId;
    if (bodyRestaurantId && bodyRestaurantId !== restaurantId) {
      throw new ForbiddenError('Cross-restaurant access is strictly prohibited (body mismatch)');
    }

    const queryRestaurantId = (req.query as any)?.restaurantId;
    if (queryRestaurantId && queryRestaurantId !== restaurantId) {
      throw new ForbiddenError('Cross-restaurant access is strictly prohibited (query mismatch)');
    }

    next();
  } catch (err) {
    next(err);
  }
}
