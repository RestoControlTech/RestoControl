/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { hasPermission as checkPermission, Permission } from '../auth/permissions';

export interface UsePermissionReturn {
  hasPermission: (permission: Permission) => boolean;
}

/**
 * Reusable React hook for evaluating permissions for the currently authenticated user.
 * Reuses the centralized permission architecture in src/auth/permissions.ts.
 *
 * @returns {UsePermissionReturn} An object containing the `hasPermission` check function.
 *
 * @example
 * const { hasPermission } = usePermission();
 * if (hasPermission('reports.view')) {
 *   // render report data
 * }
 */
export function usePermission(): UsePermissionReturn {
  const { user } = useAuth();

  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      return checkPermission(user, permission);
    },
    [user]
  );

  return {
    hasPermission,
  };
}
