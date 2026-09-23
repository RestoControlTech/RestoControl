/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Permission } from '../../types';
import { usePermission } from '../../hooks/usePermission';

export interface PermissionGateProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * PermissionGate conditionally renders its children only if the currently
 * authenticated user has the specified permission.
 *
 * @example
 * ```tsx
 * <PermissionGate permission="products.delete">
 *   <button onClick={handleDelete}>Delete</button>
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  permission,
  children,
  fallback = null,
}: PermissionGateProps): React.ReactElement | null {
  const { hasPermission } = usePermission();

  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  return fallback ? <>{fallback}</> : null;
}

export default PermissionGate;
