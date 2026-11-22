/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Role, User } from '../types';

export const ALL_PERMISSIONS = [
  'dashboard.view',
  'pos.use',
  'orders.view',
  'orders.create',
  'orders.update',
  'orders.cancel',
  'menu.view',
  'menu.manage',
  'products.view',
  'products.create',
  'products.update',
  'products.delete',
  'tables.view',
  'tables.manage',
  'sales.view',
  'staff.view',
  'staff.manage',
  'reports.view',
  'settings.view',
  'settings.manage',
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export const STAFF_PERMISSIONS: readonly Permission[] = [
  'dashboard.view',
  'pos.use',
  'orders.view',
  'orders.create',
  'orders.update',
  'menu.view',
  'products.view',
  'tables.view',
] as const;

export const ADMIN_PERMISSIONS: readonly Permission[] = ALL_PERMISSIONS;

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: ADMIN_PERMISSIONS,
  staff: STAFF_PERMISSIONS,
};

const staffPermissionsSet = new Set<Permission>(STAFF_PERMISSIONS);
const adminPermissionsSet = new Set<Permission>(ADMIN_PERMISSIONS);

export const ROLE_PERMISSION_SETS: Record<Role, ReadonlySet<Permission>> = {
  admin: adminPermissionsSet,
  staff: staffPermissionsSet,
};

/**
 * Checks whether a given role is granted a specific permission.
 */
export function hasRolePermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSION_SETS[role]?.has(permission) ?? false;
}

/**
 * Checks whether a user has a specific permission based on authentication source.
 *
 * Security Model:
 * 1. Backend-authenticated users (authSource === 'database'):
 *    - Must rely EXCLUSIVELY on user.permissions returned by PostgreSQL.
 *    - Never falls back to hardcoded ROLE_PERMISSIONS, preventing permission restriction bypasses.
 *    - If user.permissions is empty or lacks the permission, returns false.
 *
 * 2. Legacy / Mock users (authSource === 'legacy_mock' or unassigned legacy fixture):
 *    - Preserves existing role-based fallback for explicitly identified legacy/mock users.
 *
 * @param user The user object or session
 * @param permission The permission identifier to verify
 * @returns boolean true if permitted, false otherwise
 */
export function hasPermission(user: User | null | undefined, permission: Permission | string): boolean {
  if (!user) {
    return false;
  }

  // 1. Backend-authenticated users (authSource === 'database')
  // They MUST rely EXCLUSIVELY on user.permissions from PostgreSQL.
  // Under NO circumstances do they fall back to hardcoded ROLE_PERMISSIONS.
  if (user.authSource === 'database') {
    return Array.isArray(user.permissions) && user.permissions.includes(permission);
  }

  // 2. Legacy / Mock users (authSource === 'legacy_mock')
  // Role-based permission fallback is allowed ONLY when user.authSource === 'legacy_mock'.
  if (user.authSource === 'legacy_mock') {
    if (Array.isArray(user.permissions) && user.permissions.includes(permission)) {
      return true;
    }
    if (user.role) {
      return hasRolePermission(user.role, permission as Permission);
    }
    return false;
  }

  // 3. Users with missing, undefined, or unrecognized authSource
  // Must receive NO permissions through role fallback, even if their role is admin.
  if (Array.isArray(user.permissions) && user.permissions.includes(permission)) {
    return true;
  }

  return false;
}
