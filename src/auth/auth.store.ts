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
  {
    credentials: {
      email: 'admin@restaurant.com',
      password: 'admin123',
    },
    user: {
      id: 'usr-admin-01',
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
            entry.credentials.password === cleanPassword
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
    }),
    {
      name: 'restocontrol_auth_session',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
