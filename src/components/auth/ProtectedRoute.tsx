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
  const { isAuthenticated, isLoading } = useAuth();
  const { hasPermission } = usePermission();
  const location = useLocation();

  // 0. Loading Layer (Prevent premature redirect while session is being verified)
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-orange-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Verifying session...</p>
        </div>
      </div>
    );
  }

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
