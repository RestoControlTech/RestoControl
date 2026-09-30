/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface RestaurantSettings {
  restaurantName: string;
  phoneNumber: string;
  logoUrl: string;
  language: 'en' | 'km';
  address?: string;
  openingHours?: string;
  currency?: string;
}

export const DEFAULT_SETTINGS: RestaurantSettings = {
  restaurantName: 'Kuro Bistro',
  phoneNumber: '+855 23 987 654',
  logoUrl: '',
  language: 'en',
  address: 'Phnom Penh, Cambodia',
  openingHours: '11:00 AM - 10:30 PM',
  currency: 'USD',
};

export interface SettingsStoreState {
  settings: RestaurantSettings;
  updateSettings: (newSettings: Partial<RestaurantSettings>) => void;
  resetSettings: () => void;
}

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

export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ...newSettings,
          },
        })),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: 'restocontrol_settings',
      storage: createJSONStorage(getStorage),
    }
  )
);
