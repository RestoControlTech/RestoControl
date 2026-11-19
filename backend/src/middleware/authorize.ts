/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

/**
 * RBAC Permission Authorization Middleware.
 * Enforces that the authenticated user possesses the required system permission code(s).
 */
export function requirePermission(...requiredPermissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required before checking permissions');
      }

      const userPermissions = req.user.permissions || [];
      const hasAll = requiredPermissions.every((perm) => userPermissions.includes(perm));

      if (!hasAll) {
        const missing = requiredPermissions.filter((perm) => !userPermissions.includes(perm));
        throw new ForbiddenError(`Insufficient privileges: missing permission(s) [${missing.join(', ')}]`);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Role Authorization Middleware.
 * Enforces that the authenticated user's role matches one of the specified allowed roles.
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required before checking role');
      }

      const userRole = req.user.roleName;
      const isAllowed = allowedRoles.some((role) => role.toUpperCase() === userRole.toUpperCase());

      if (!isAllowed) {
        throw new ForbiddenError(`Insufficient privileges: role '${userRole}' is not authorized for this operation`);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
