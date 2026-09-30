/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSettingsStore, RestaurantSettings } from '../store/settings.store';

export function useSettings() {
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const resetSettings = useSettingsStore((state) => state.resetSettings);

  return {
    settings,
    updateSettings,
    resetSettings,
    restaurantName: settings.restaurantName,
    phoneNumber: settings.phoneNumber,
    logoUrl: settings.logoUrl,
    language: settings.language,
  };
}
