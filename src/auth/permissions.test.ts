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
  authSource: 'legacy_mock',
};

const staffUser: User = {
  id: 'usr-staff-test',
  name: 'Staff Member',
  email: 'staff@restaurant.com',
  role: 'staff',
  authSource: 'legacy_mock',
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

  // =========================================================================
  // 9. STEP 2E FIX 1: Backend Database Permissions Enforcement (No Fallback)
  // =========================================================================
  console.log('\n--- Testing Backend vs. Legacy Authentication Permission Security ---');

  // Test Case A: Backend admin with all permissions receives only those permissions
  const backendAdminAll: User = {
    id: 'usr-db-admin-all',
    name: 'DB Admin All',
    email: 'dbadmin@restaurant.com',
    role: 'admin',
    authSource: 'database',
    restaurantId: 'rest-uuid-1',
    permissions: ['dashboard.view', 'pos.use', 'orders.view', 'sales.view'],
  };
  assert(hasPermission(backendAdminAll, 'dashboard.view') === true, 'Backend admin with dashboard.view has access');
  assert(hasPermission(backendAdminAll, 'pos.use') === true, 'Backend admin with pos.use has access');
  assert(hasPermission(backendAdminAll, 'orders.view') === true, 'Backend admin with orders.view has access');
  assert(hasPermission(backendAdminAll, 'sales.view') === true, 'Backend admin with sales.view has access');
  // CRITICAL: Backend admin does NOT receive ungranted permissions despite 'admin' role!
  assert(hasPermission(backendAdminAll, 'settings.manage') === false, 'Backend admin without settings.manage is strictly DENIED (no role fallback)');
  assert(hasPermission(backendAdminAll, 'products.delete') === false, 'Backend admin without products.delete is strictly DENIED (no role fallback)');
  console.log('✓ Test 1: Backend admin receives only database-granted permissions.');

  // Test Case B: Backend admin with permissions: [] receives no permissions
  const backendAdminEmpty: User = {
    id: 'usr-db-admin-empty',
    name: 'DB Admin Empty',
    email: 'emptyadmin@restaurant.com',
    role: 'admin',
    authSource: 'database',
    restaurantId: 'rest-uuid-1',
    permissions: [],
  };
  for (const perm of ALL_PERMISSIONS) {
    assert(
      hasPermission(backendAdminEmpty, perm) === false,
      `Backend admin with empty permissions must be DENIED ${perm}`
    );
  }
  console.log('✓ Test 2: Backend admin with permissions: [] receives NO permissions.');

  // Test Case C: Backend staff with permissions: [] receives no permissions
  const backendStaffEmpty: User = {
    id: 'usr-db-staff-empty',
    name: 'DB Staff Empty',
    email: 'emptystaff@restaurant.com',
    role: 'staff',
    authSource: 'database',
    restaurantId: 'rest-uuid-1',
    permissions: [],
  };
  for (const perm of ALL_PERMISSIONS) {
    assert(
      hasPermission(backendStaffEmpty, perm) === false,
      `Backend staff with empty permissions must be DENIED ${perm}`
    );
  }
  console.log('✓ Test 3: Backend staff with permissions: [] receives NO permissions.');

  // Test Case D: Backend user missing pos.use cannot access pos.use
  const backendUserNoPos: User = {
    id: 'usr-db-nopos',
    name: 'DB User No POS',
    email: 'nopos@restaurant.com',
    role: 'staff',
    authSource: 'database',
    restaurantId: 'rest-uuid-1',
    permissions: ['orders.view', 'tables.view'],
  };
  assert(hasPermission(backendUserNoPos, 'pos.use') === false, 'Backend user missing pos.use CANNOT access pos.use');
  console.log('✓ Test 4: Backend user missing pos.use is strictly denied.');

  // Test Case E: Backend user with pos.use can access pos.use
  const backendUserWithPos: User = {
    id: 'usr-db-withpos',
    name: 'DB User With POS',
    email: 'withpos@restaurant.com',
    role: 'staff',
    authSource: 'database',
    restaurantId: 'rest-uuid-1',
    permissions: ['pos.use', 'orders.create'],
  };
  assert(hasPermission(backendUserWithPos, 'pos.use') === true, 'Backend user with pos.use CAN access pos.use');
  assert(hasPermission(backendUserWithPos, 'orders.create') === true, 'Backend user with orders.create CAN access orders.create');
  assert(hasPermission(backendUserWithPos, 'orders.view') === false, 'Backend user missing orders.view CANNOT access orders.view');
  console.log('✓ Test 5: Backend user with pos.use is permitted, while ungranted permissions are denied.');

  // Test Case F: Legacy admin still uses existing role permissions
  const legacyAdmin: User = {
    id: 'usr-legacy-admin',
    name: 'Legacy Admin User',
    email: 'legacyadmin@restaurant.com',
    role: 'admin',
    authSource: 'legacy_mock',
  };
  for (const perm of ALL_PERMISSIONS) {
    assert(hasPermission(legacyAdmin, perm) === true, `Legacy admin must have role permission ${perm}`);
  }
  console.log('✓ Test 6: Legacy admin continues to receive full role permissions.');

  // Test Case G: Legacy staff still uses existing role permissions
  const legacyStaff: User = {
    id: 'usr-legacy-staff',
    name: 'Legacy Staff User',
    email: 'legacystaff@restaurant.com',
    role: 'staff',
    authSource: 'legacy_mock',
  };
  for (const perm of STAFF_PERMISSIONS) {
    assert(hasPermission(legacyStaff, perm) === true, `Legacy staff must have role permission ${perm}`);
  }
  for (const perm of staffForbidden) {
    assert(hasPermission(legacyStaff, perm) === false, `Legacy staff must be DENIED ${perm}`);
  }
  console.log('✓ Test 7: Legacy staff continues to receive standard staff role permissions.');

  // Test Case H: Admin user with authSource omitted / undefined
  // Requirement: Users with missing or undefined authSource must receive NO permissions through role fallback, even if their role is admin.
  const userWithoutAuthSource: User = {
    id: 'usr-no-authsource-admin',
    name: 'Admin Without AuthSource',
    email: 'noauthsource@restaurant.com',
    role: 'admin',
    // authSource is deliberately omitted / undefined
  };
  assert(
    hasPermission(userWithoutAuthSource, 'settings.manage') === false,
    'Admin user with authSource omitted must be DENIED settings.manage (role fallback is strictly blocked)'
  );
  assert(
    hasPermission(userWithoutAuthSource, 'dashboard.view') === false,
    'Admin user with authSource omitted must be DENIED dashboard.view (role fallback is strictly blocked)'
  );
  assert(
    hasPermission(userWithoutAuthSource, 'pos.use') === false,
    'Admin user with authSource omitted must be DENIED pos.use (role fallback is strictly blocked)'
  );
  for (const perm of ALL_PERMISSIONS) {
    assert(
      hasPermission(userWithoutAuthSource, perm) === false,
      `Admin user with authSource omitted must be DENIED ${perm} through role fallback`
    );
  }
  console.log('✓ Test 8: Admin user with authSource omitted strictly receives NO permissions (role fallback blocked).');

  console.log('\n✔ All permission assertions (Step 5A, 5B, 5C, 5F & Step 2E FIX 1) passed successfully!');
}

// Execute if run directly via tsx
runPermissionTests();

