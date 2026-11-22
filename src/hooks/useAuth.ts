/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useAuthStore } from '../auth/auth.store';

export function useAuth() {
  const storeUser = useAuthStore((state) => state.user);
  const storeToken = useAuthStore((state) => state.token);
  const storeIsAuth = useAuthStore((state) => state.isAuthenticated);
  const storeIsLoading = useAuthStore((state) => state.isLoading);

  // In SSR / headless test environments, Zustand v5 getServerSnapshot() returns getInitialState().
  // When running in SSR, fallback to live getState() so server/test renders reflect the active state.
  const isSSR = typeof window === 'undefined';
  const liveState = useAuthStore.getState();

  const user = isSSR ? liveState.user : storeUser;
  const token = isSSR ? liveState.token : storeToken;
  const isAuthenticated = isSSR ? liveState.isAuthenticated : storeIsAuth;
  const isLoading = isSSR ? liveState.isLoading : storeIsLoading;

  const login = liveState.login;
  const logout = liveState.logout;
  const initializeAuth = liveState.initializeAuth;
  const updateUser = liveState.updateUser;

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    initializeAuth,
    updateUser,
  };
}
