/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useAuthStore } from '../auth/auth.store';

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);

  return {
    user,
    isAuthenticated,
    login,
    logout,
  };
}
