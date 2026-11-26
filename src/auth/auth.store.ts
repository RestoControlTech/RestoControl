/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthState, User, Role } from '../types';
import {
  apiLogin,
  apiGetMe,
  apiLogout,
  getToken,
  clearToken,
  BackendSafeUser,
} from '../services/authApi';
import { isApiError } from '../services/api/errors';

interface MockUserEntry {
  credentials: {
    email: string;
    password: string;
  };
  user: User;
}

export const DEFAULT_AVATAR = 'https://res.cloudinary.com/cc67bunh/image/upload/v1790939496/logo.jpg';

/**
 * Maps the safe user payload returned by the Express backend into the frontend User domain model.
 */
export function mapBackendUserToFrontend(backendUser: BackendSafeUser): User {
  const roleName = backendUser.role?.name?.toLowerCase() || '';
  const normalizedRole: Role = roleName === 'admin' ? 'admin' : 'staff';

  return {
    id: backendUser.id,
    name: backendUser.name,
    email: backendUser.email,
    role: normalizedRole,
    avatar: backendUser.avatarUrl || DEFAULT_AVATAR,
    avatarPublicId: undefined,
    phone: backendUser.phone || undefined,
    permissions: backendUser.permissions || [],
    restaurantId: backendUser.restaurantId,
    authSource: 'database',
    restaurant: backendUser.restaurant
      ? {
          id: backendUser.restaurant.id,
          name: backendUser.restaurant.name,
          slug: backendUser.restaurant.slug,
        }
      : undefined,
  };
}

/**
 * @deprecated MOCK_USERS retained strictly for legacy offline fixtures and tests.
 * Production authentication connects directly to Express + PostgreSQL via apiLogin().
 */
export const MOCK_USERS: MockUserEntry[] = [
  // Primary Admins
  {
    credentials: {
      email: 'panbunhen58@gmail.com',
      password: 'Heng1111',
    },
    user: {
      id: 'usr-admin-01',
      name: 'Pan Bunheng',
      email: 'panbunhen58@gmail.com',
      role: 'admin',
      avatar: DEFAULT_AVATAR,
      authSource: 'legacy_mock',
    },
  },
  {
    credentials: {
      email: 'buma168@gmail.com',
      password: 'bumma1111',
    },
    user: {
      id: 'usr-admin-buma',
      name: 'Buma',
      email: 'Buma168@gmail.com',
      role: 'admin',
      avatar: DEFAULT_AVATAR,
      authSource: 'legacy_mock',
    },
  },
  {
    credentials: {
      email: 'lymeng111@gmail.com',
      password: 'mengmeng168.',
    },
    user: {
      id: 'usr-admin-lymeng',
      name: 'Lymeng',
      email: 'Lymeng111@gmail.com',
      role: 'admin',
      avatar: DEFAULT_AVATAR,
      authSource: 'legacy_mock',
    },
  },
  // Staff Members
  {
    credentials: {
      email: 'panhrith233@gmail.com',
      password: 'rithloveyou111',
    },
    user: {
      id: 'usr-staff-panhrith',
      name: 'Panhrith',
      email: 'Panhrith233@gmail.com',
      role: 'staff',
      avatar: DEFAULT_AVATAR,
      authSource: 'legacy_mock',
    },
  },
  {
    credentials: {
      email: 'dalyna188@gmail.com',
      password: 'nanabeksloy',
    },
    user: {
      id: 'usr-staff-dalyna',
      name: 'Dalyna',
      email: 'Dalyna188@gmail.com',
      role: 'staff',
      avatar: DEFAULT_AVATAR,
      authSource: 'legacy_mock',
    },
  },
  {
    credentials: {
      email: 'romromloveyou@gmail.com',
      password: 'iloveyou111',
    },
    user: {
      id: 'usr-staff-romrom',
      name: 'Romrom',
      email: 'romromloveyou@gmail.com',
      role: 'staff',
      avatar: DEFAULT_AVATAR,
      authSource: 'legacy_mock',
    },
  },
  // Legacy / Default demo accounts
  {
    credentials: {
      email: 'admin@restaurant.com',
      password: 'admin123',
    },
    user: {
      id: 'usr-admin-legacy',
      name: 'Admin User',
      email: 'admin@restaurant.com',
      role: 'admin',
      avatar: DEFAULT_AVATAR,
      authSource: 'legacy_mock',
    },
  },
  {
    credentials: {
      email: 'staff@restaurant.com',
      password: 'staff123',
    },
    user: {
      id: 'usr-staff-01',
      name: 'Staff Member',
      email: 'staff@restaurant.com',
      role: 'staff',
      avatar: DEFAULT_AVATAR,
      authSource: 'legacy_mock',
    },
  },
  // Legacy / Quick PIN fallback support for terminal touch keypad
  {
    credentials: {
      email: '4091',
      password: '4091',
    },
    user: {
      id: 'usr-admin-4091',
      name: 'Kenji Sato',
      email: 'admin@restaurant.com',
      role: 'admin',
      avatar: DEFAULT_AVATAR,
      authSource: 'legacy_mock',
    },
  },
  {
    credentials: {
      email: 'staff@autumn.com',
      password: '4091',
    },
    user: {
      id: 'usr-staff-4091',
      name: 'Kenji Sato',
      email: 'staff@restaurant.com',
      role: 'staff',
      avatar: DEFAULT_AVATAR,
      authSource: 'legacy_mock',
    },
  },
];

// Persistent in-memory storage for Node/test environments when localStorage is absent
const memoryStore = new Map<string, string>();

// Safe storage resolver supporting browser localStorage and Node/test environments
const getStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return {
    getItem: (key: string) => memoryStore.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memoryStore.set(key, value);
    },
    removeItem: (key: string) => {
      memoryStore.delete(key);
    },
    clear: () => {
      memoryStore.clear();
    },
    key: (index: number) => Array.from(memoryStore.keys())[index] ?? null,
    get length() {
      return memoryStore.size;
    },
  };
};

// In-flight initialization promise to deduplicate concurrent initializeAuth() calls (e.g. React StrictMode)
let inFlightInitializeAuth: Promise<void> | null = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: getToken(),
      isAuthenticated: false,
      isLoading: Boolean(getToken()),

      login: async (email: string, password: string) => {
        const cleanEmail = email.trim();
        const cleanPassword = password.trim();

        if (!cleanEmail || !cleanPassword) {
          return {
            success: false,
            error: 'Email and password are required.',
          };
        }

        set({ isLoading: true });

        try {
          const res = await apiLogin({
            email: cleanEmail,
            password: cleanPassword,
          });

          if (res.success && res.data) {
            const frontendUser = mapBackendUserToFrontend(res.data.user);
            set({
              user: frontendUser,
              token: res.data.token,
              isAuthenticated: true,
              isLoading: false,
            });
            return { success: true };
          }

          set({ isLoading: false });
          return {
            success: false,
            error: res.error || 'Invalid email or password. Please try again.',
          };
        } catch (err: any) {
          set({ isLoading: false });
          return {
            success: false,
            error: 'Cannot connect to authentication service. Please check your connection and try again.',
          };
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await apiLogout();
        } catch {
          // Fallback: always clear token locally regardless of network outcome
        } finally {
          clearToken();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      initializeAuth: async () => {
        if (inFlightInitializeAuth) {
          return inFlightInitializeAuth;
        }

        const runInit = async () => {
          const token = getToken();
          if (!token) {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
            return;
          }

          set({ isLoading: true });

          try {
            const res = await apiGetMe();
            if (res.success && res.data) {
              const frontendUser = mapBackendUserToFrontend(res.data.user);
              set({
                user: frontendUser,
                token,
                isAuthenticated: true,
                isLoading: false,
              });
            } else if (res.isUnauthorized || res.status === 401) {
              // Explicitly unauthorized: clear invalid token and reset authenticated session
              clearToken();
              set({
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
              });
            } else {
              // Recoverable error (network, timeout, proxy/5xx, 403):
              // Preserve JWT and persisted user/session; finish loading state cleanly.
              set({
                token,
                isLoading: false,
              });
            }
          } catch (err: unknown) {
            if (isApiError(err) && err.isUnauthorized) {
              clearToken();
              set({
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
              });
            } else {
              // Recoverable failure: preserve JWT and existing session
              set({
                token,
                isLoading: false,
              });
            }
          } finally {
            inFlightInitializeAuth = null;
          }
        };

        inFlightInitializeAuth = runInit();
        return inFlightInitializeAuth;
      },

      updateUser: (updates: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
      },
    }),
    {
      name: 'restocontrol_auth_session',
      storage: createJSONStorage(getStorage),
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          const state = persistedState as any;
          if (state?.user && (!state.user.avatar || state.user.avatar === '')) {
            state.user.avatar = DEFAULT_AVATAR;
          }
          return state;
        }
        return persistedState;
      },
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
