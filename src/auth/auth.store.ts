/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthState, User } from '../types';

interface MockUserEntry {
  credentials: {
    email: string;
    password: string;
  };
  user: User;
}

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
    },
  },
  {
    credentials: {
      email: 'staff@kurobistro.com',
      password: '4091',
    },
    user: {
      id: 'usr-staff-4091',
      name: 'Kenji Sato',
      email: 'staff@restaurant.com',
      role: 'staff',
    },
  },
];

// Safe storage resolver supporting browser localStorage and Node/test environments
const getStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  const memoryStore = new Map<string, string>();
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
    length: memoryStore.size,
  };
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: (email: string, password: string) => {
        const cleanEmail = email.trim().toLowerCase();
        const cleanPassword = password.trim();

        if (!cleanEmail || !cleanPassword) {
          return {
            success: false,
            error: 'Email and password are required.',
          };
        }

        const match = MOCK_USERS.find(
          (entry) =>
            entry.credentials.email.toLowerCase() === cleanEmail &&
            (entry.credentials.password === cleanPassword ||
              (entry.credentials.password === 'mengmeng168.' && cleanPassword === 'mengmeng168'))
        );

        if (match) {
          set({
            user: match.user,
            isAuthenticated: true,
          });
          return { success: true };
        }

        return {
          success: false,
          error: 'Invalid email or password. Please check your credentials and try again.',
        };
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
        });
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
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
