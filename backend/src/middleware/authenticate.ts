/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { UnauthorizedError } from '../utils/errors.js';
import { prisma } from '../config/prisma.js';

/**
 * Authentication middleware.
 * Verifies Bearer JWT, validates user presence and active status in PostgreSQL,
 * and attaches verified user identity and restaurantId to the request context.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token is required (format: Bearer <token>)');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new UnauthorizedError('Authentication token cannot be empty');
    }

    // Verify token cryptographic signature and expiration
    const payload = verifyToken(token);

    // Query active user from PostgreSQL with Restaurant, Role, and Permissions
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        restaurant: true,
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Authenticated user no longer exists');
    }

    // Check account active status
    if (!user.isActive) {
      throw new UnauthorizedError('User account is deactivated');
    }

    // Check restaurant active status
    if (!user.restaurant || !user.restaurant.isActive) {
      throw new UnauthorizedError('Restaurant account is deactivated');
    }

    // Check tenant boundary against token claims
    if (user.restaurantId !== payload.restaurantId) {
      throw new UnauthorizedError('Tenant mismatch in token claims');
    }

    // Attach verified user identity without exposing sensitive hash fields
    req.user = {
      id: user.id,
      restaurantId: user.restaurantId,
      roleId: user.roleId,
      roleName: user.role.name,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      permissions: user.role.permissions.map((rp) => rp.permission.code),
      restaurant: {
        id: user.restaurant.id,
        name: user.restaurant.name,
        slug: user.restaurant.slug,
      },
    };

    // Guarantee restaurantId comes STRICTLY from authenticated identity
    req.restaurantId = user.restaurantId;

    next();
  } catch (err) {
    next(err);
  }
}
