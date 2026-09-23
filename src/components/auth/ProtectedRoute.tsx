/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import { Permission } from '../../auth/permissions';
import AccessDenied from '../../pages/AccessDenied';

export interface ProtectedRouteProps {
  permission?: Permission;
  children?: React.ReactNode;
}

/**
 * Route Guard enforcing both Authentication and optional Permission-based Authorization.
 *
 * Evaluation Flow:
 * 1. Is user authenticated? -> NO: Redirect to /login with state preserved.
 * 2. Is permission required? -> YES: Check hasPermission(permission).
 *    -> NO: Render AccessDenied page.
 * 3. Render page content if authorized.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  permission,
  children,
}) => {
  const { isAuthenticated } = useAuth();
  const { hasPermission } = usePermission();
  const location = useLocation();

  // 1. Authentication Layer (Unauthenticated -> Redirect to /login)
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Authorization Layer (Authenticated but Unauthorized -> Render AccessDenied)
  if (permission && !hasPermission(permission)) {
    return <AccessDenied permission={permission} />;
  }

  // 3. Authorized Render
  return children ? <>{children}</> : <Outlet />;
};
