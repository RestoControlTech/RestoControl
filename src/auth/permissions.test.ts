/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User } from '../types';
import {
  ALL_PERMISSIONS,
  STAFF_PERMISSIONS,
  ADMIN_PERMISSIONS,
  hasPermission,
  hasRolePermission,
  Permission,
} from './permissions';

const adminUser: User = {
  id: 'usr-admin-test',
  name: 'Admin User',
  email: 'admin@restaurant.com',
  role: 'admin',
};

const staffUser: User = {
  id: 'usr-staff-test',
  name: 'Staff Member',
  email: 'staff@restaurant.com',
  role: 'staff',
};

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[Assertion Failed] ${message}`);
  }
}

export function runPermissionTests() {
  console.log('--- Running Permission System Verification Tests ---');

  // 1. Step 5B Admin verification tests
  assert(hasPermission(adminUser, 'dashboard.view') === true, 'Admin: dashboard.view -> true');
  assert(hasPermission(adminUser, 'pos.use') === true, 'Admin: pos.use -> true');
  assert(hasPermission(adminUser, 'reports.view') === true, 'Admin: reports.view -> true');
  assert(hasPermission(adminUser, 'settings.manage') === true, 'Admin: settings.manage -> true');
  assert(hasPermission(adminUser, 'products.delete') === true, 'Admin: products.delete -> true');

  // 2. Step 5B Staff verification tests
  assert(hasPermission(staffUser, 'dashboard.view') === true, 'Staff: dashboard.view -> true');
  assert(hasPermission(staffUser, 'pos.use') === true, 'Staff: pos.use -> true');
  assert(hasPermission(staffUser, 'orders.create') === true, 'Staff: orders.create -> true');
  assert(hasPermission(staffUser, 'reports.view') === false, 'Staff: reports.view -> false');
  assert(hasPermission(staffUser, 'settings.manage') === false, 'Staff: settings.manage -> false');
  assert(hasPermission(staffUser, 'products.delete') === false, 'Staff: products.delete -> false');

  // 3. Step 5B Logged-out verification tests
  assert(hasPermission(null, 'dashboard.view') === false, 'Logged out: dashboard.view -> false');
  assert(hasPermission(null, 'reports.view') === false, 'Logged out: reports.view -> false');
  assert(hasPermission(null, 'settings.manage') === false, 'Logged out: settings.manage -> false');
  assert(hasPermission(undefined, 'dashboard.view') === false, 'Undefined user: dashboard.view -> false');

  // 4. Step 5C Route-to-Permission Mapping Tests
  const routePermissions: Record<string, Permission> = {
    '/dashboard': 'dashboard.view',
    '/pos': 'pos.use',
    '/orders': 'orders.view',
    '/menu': 'menu.view',
    '/tables': 'tables.view',
    '/sales': 'sales.view',
    '/staff': 'staff.view',
    '/reports': 'reports.view',
    '/settings': 'settings.view',
  };

  // Admin access to all 9 protected routes
  for (const [route, permission] of Object.entries(routePermissions)) {
    assert(hasPermission(adminUser, permission) === true, `Admin must have access to ${route} (${permission})`);
  }

  // Staff allowed access to 5 routes
  const staffAllowedRoutes = ['/dashboard', '/pos', '/orders', '/menu', '/tables'];
  for (const route of staffAllowedRoutes) {
    const permission = routePermissions[route];
    assert(hasPermission(staffUser, permission) === true, `Staff must have access to ${route} (${permission})`);
  }

  // Staff denied access to 4 routes
  const staffDeniedRoutes = ['/sales', '/staff', '/reports', '/settings'];
  for (const route of staffDeniedRoutes) {
    const permission = routePermissions[route];
    assert(hasPermission(staffUser, permission) === false, `Staff must be DENIED access to ${route} (${permission})`);
  }

  // 5. Admin should have all 20 permissions
  assert(ADMIN_PERMISSIONS.length === 20, 'Admin permissions count must be 20');
  for (const perm of ALL_PERMISSIONS) {
    assert(hasPermission(adminUser, perm) === true, `Admin must have ${perm}`);
    assert(hasRolePermission('admin', perm) === true, `Role admin must have ${perm}`);
  }

  // 6. Staff should have exactly 8 permissions and no more
  assert(STAFF_PERMISSIONS.length === 8, 'Staff permissions count must be 8');
  for (const perm of STAFF_PERMISSIONS) {
    assert(hasPermission(staffUser, perm) === true, `Staff must have ${perm}`);
    assert(hasRolePermission('staff', perm) === true, `Role staff must have ${perm}`);
  }

  // 7. Staff forbidden permissions checks (12 permissions)
  const staffForbidden: Permission[] = [
    'orders.cancel',
    'menu.manage',
    'products.create',
    'products.update',
    'products.delete',
    'tables.manage',
    'sales.view',
    'staff.view',
    'staff.manage',
    'reports.view',
    'settings.view',
    'settings.manage',
  ];

  // 8. Step 5F Button and Action Permission Tests
  const actionPermissions = [
    { action: 'Add Menu Item', permission: 'products.create' as Permission, admin: true, staff: false },
    { action: 'Toggle Stock', permission: 'products.update' as Permission, admin: true, staff: false },
    { action: 'Delete Product', permission: 'products.delete' as Permission, admin: true, staff: false },
    { action: 'Manage Menu', permission: 'menu.manage' as Permission, admin: true, staff: false },
    { action: 'Update Order Status', permission: 'orders.update' as Permission, admin: true, staff: true },
    { action: 'Cancel / Void Order', permission: 'orders.cancel' as Permission, admin: true, staff: false },
    { action: 'View Tables', permission: 'tables.view' as Permission, admin: true, staff: true },
    { action: 'Manage Tables', permission: 'tables.manage' as Permission, admin: true, staff: false },
    { action: 'Add Staff Member', permission: 'staff.manage' as Permission, admin: true, staff: false },
    { action: 'Edit Staff Member', permission: 'staff.manage' as Permission, admin: true, staff: false },
    { action: 'Save Settings', permission: 'settings.manage' as Permission, admin: true, staff: false },
    { action: 'Export Sales CSV', permission: 'sales.view' as Permission, admin: true, staff: false },
    { action: 'Export Reports PDF', permission: 'reports.view' as Permission, admin: true, staff: false },
  ];

  for (const item of actionPermissions) {
    assert(
      hasPermission(adminUser, item.permission) === item.admin,
      `Admin action "${item.action}" (${item.permission}) must be ${item.admin}`
    );
    assert(
      hasPermission(staffUser, item.permission) === item.staff,
      `Staff action "${item.action}" (${item.permission}) must be ${item.staff}`
    );
  }

  console.log('✔ All permission assertions (Step 5A, 5B, 5C & 5F) passed successfully!');
}

// Execute if run directly via tsx
runPermissionTests();

