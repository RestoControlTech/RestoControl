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
 * Checks whether a user has a specific permission based strictly on user.role.
 *
 * @param user The user object or session
 * @param permission The permission identifier to verify
 * @returns boolean true if user.role grants permission, false otherwise
 */
export function hasPermission(user: User | null | undefined, permission: Permission): boolean {
  if (!user || !user.role) {
    return false;
  }
  return hasRolePermission(user.role, permission);
}
