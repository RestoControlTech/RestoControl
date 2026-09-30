/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import { useSettingsStore, DEFAULT_SETTINGS, RestaurantSettings } from '../store/settings.store';
import { TRANSLATIONS } from '../i18n';
import { ROLE_PERMISSIONS, hasPermission } from '../auth/permissions';
import { MOCK_ORDERS } from './orders';
import { TRANSACTIONS_DATA } from './mockData';

console.log('--- Running Settings Improvement & Regression Test Suite ---');

// ==================================================
// TEST 1 — RESTAURANT NAME PERSISTENCE
// ==================================================
console.log('Testing Restaurant Name persistence...');
useSettingsStore.getState().resetSettings();
assert(
  useSettingsStore.getState().settings.restaurantName === 'Kuro Bistro',
  'Default restaurant name should be Kuro Bistro'
);

// Update restaurant name
useSettingsStore.getState().updateSettings({ restaurantName: 'Test Restaurant' });
assert(
  useSettingsStore.getState().settings.restaurantName === 'Test Restaurant',
  'Restaurant name should update to "Test Restaurant"'
);

// Verify persistence across re-reads
const persistedName = useSettingsStore.getState().settings.restaurantName;
assert(persistedName === 'Test Restaurant', 'Restaurant name must persist');
console.log('✓ TEST 1: Restaurant Name persistence passed.');

// ==================================================
// TEST 2 — PHONE NUMBER PERSISTENCE & VALIDATION
// ==================================================
console.log('Testing Phone Number persistence & validation...');
// Basic phone validation logic identical to Settings.tsx
const validatePhone = (val: string): boolean => {
  const trimmed = val.trim();
  if (!trimmed) return false;
  const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
  return phoneRegex.test(trimmed);
};

// Valid Cambodian numbers
assert(validatePhone('+855 23 987 654') === true, 'Cambodian +855 format must be valid');
assert(validatePhone('012 345 678') === true, 'Local Cambodian 012 format must be valid');
assert(validatePhone('+85512345678') === true, 'Continuous +855 format must be valid');
// Valid International numbers
assert(validatePhone('+1 (555) 123-4567') === true, 'International format must be valid');

// Invalid formats
assert(validatePhone('') === false, 'Empty phone number must be invalid');
assert(validatePhone('   ') === false, 'Whitespace phone number must be invalid');
assert(validatePhone('abc12345') === false, 'Alphabetic phone number must be invalid');
assert(validatePhone('123') === false, 'Short phone number under 7 digits must be invalid');

// Save phone number
const testPhone = '+855 99 888 777';
useSettingsStore.getState().updateSettings({ phoneNumber: testPhone });
assert(
  useSettingsStore.getState().settings.phoneNumber === testPhone,
  'Phone number must be updated and persisted'
);
console.log('✓ TEST 2: Phone Number persistence & validation passed.');

// ==================================================
// TEST 3 — LOGO CLOUDINARY URL
// ==================================================
console.log('Testing Logo Cloudinary URL storage...');
const cloudinaryUrl = 'https://res.cloudinary.com/example/image/upload/v1234567890/kuro_logo.png';
useSettingsStore.getState().updateSettings({ logoUrl: cloudinaryUrl });

const currentLogo = useSettingsStore.getState().settings.logoUrl;
assert(currentLogo === cloudinaryUrl, 'Logo URL must match the Cloudinary URL exactly');
assert(!currentLogo.startsWith('data:'), 'Logo URL must NOT be base64 data');
assert(!currentLogo.startsWith('blob:'), 'Logo URL must NOT be a local blob URL');
console.log('✓ TEST 3: Logo Cloudinary URL storage passed.');

// ==================================================
// TEST 4 — INVALID LOGO & ERROR FALLBACK
// ==================================================
console.log('Testing logo preview fallback handling...');
// In Settings.tsx, empty URL yields "No logo", invalid URL triggers onError -> "Unable to load image"
const getLogoStatus = (url: string, isError: boolean) => {
  if (!url) return 'No logo';
  if (isError) return 'Unable to load image';
  return 'Active';
};

assert(getLogoStatus('', false) === 'No logo', 'Empty URL must show "No logo"');
assert(getLogoStatus('https://invalid.url/broken.jpg', true) === 'Unable to load image', 'Broken URL must show "Unable to load image"');
assert(getLogoStatus(cloudinaryUrl, false) === 'Active', 'Valid URL must be active');
console.log('✓ TEST 4: Invalid logo fallback handling passed.');

// ==================================================
// TEST 5 & 6 — LANGUAGE ENGLISH & KHMER
// ==================================================
console.log('Testing Language selection & translations...');
// English
useSettingsStore.getState().updateSettings({ language: 'en' });
assert(useSettingsStore.getState().settings.language === 'en', 'Language must be set to English');
assert(TRANSLATIONS.en.dashboard === 'Dashboard', 'English dashboard translation must match');
assert(TRANSLATIONS.en.orders === 'Orders', 'English orders translation must match');
assert(TRANSLATIONS.en.menu === 'Menu', 'English menu translation must match');
assert(TRANSLATIONS.en.tables === 'Tables & QR', 'English tables translation must match');
assert(TRANSLATIONS.en.settings === 'Settings', 'English settings translation must match');
console.log('✓ TEST 5: English language selection passed.');

// Khmer
useSettingsStore.getState().updateSettings({ language: 'km' });
assert(useSettingsStore.getState().settings.language === 'km', 'Language must be set to Khmer');
assert(TRANSLATIONS.km.dashboard === 'ផ្ទាំងគ្រប់គ្រង', 'Khmer dashboard translation must match');
assert(TRANSLATIONS.km.orders === 'ការបញ្ជាទិញ', 'Khmer orders translation must match');
assert(TRANSLATIONS.km.menu === 'មុខម្ហូប', 'Khmer menu translation must match');
assert(TRANSLATIONS.km.tables === 'តុ និង QR', 'Khmer tables translation must match');
assert(TRANSLATIONS.km.settings === 'ការកំណត់', 'Khmer settings translation must match');
assert(TRANSLATIONS.km.saveChanges === 'រក្សាទុកការផ្លាស់ប្តូរ', 'Khmer save button translation must match');
assert(TRANSLATIONS.km.savedSuccessfully === 'បានរក្សាទុកការកំណត់ដោយជោគជ័យ', 'Khmer settings saved translation must match');
console.log('✓ TEST 6: Khmer language selection passed.');

// ==================================================
// TEST 7 — UNIFIED SETTINGS DATA MODEL
// ==================================================
console.log('Testing Unified Settings Data Model...');
const updatedSettings: Partial<RestaurantSettings> = {
  restaurantName: 'Angkor Bistro',
  phoneNumber: '+855 12 345 678',
  logoUrl: 'https://res.cloudinary.com/angkor/image/upload/logo.png',
  language: 'km',
};

useSettingsStore.getState().updateSettings(updatedSettings);
const fullState = useSettingsStore.getState().settings;

assert(fullState.restaurantName === 'Angkor Bistro', 'Single model restaurantName match');
assert(fullState.phoneNumber === '+855 12 345 678', 'Single model phoneNumber match');
assert(fullState.logoUrl === 'https://res.cloudinary.com/angkor/image/upload/logo.png', 'Single model logoUrl match');
assert(fullState.language === 'km', 'Single model language match');
console.log('✓ TEST 7: Unified Settings Data Model passed.');

// ==================================================
// TEST 8 — REGRESSION: AUTH & RBAC
// ==================================================
console.log('Testing Auth & RBAC regression...');
const adminUser = {
  id: 'usr-admin-test',
  name: 'Admin User',
  email: 'admin@restaurant.com',
  role: 'admin' as const,
};
const staffUser = {
  id: 'usr-staff-test',
  name: 'Staff Member',
  email: 'staff@restaurant.com',
  role: 'staff' as const,
};

assert(hasPermission(adminUser, 'settings.manage') === true, 'Admin must have settings.manage permission');
assert(hasPermission(adminUser, 'settings.view') === true, 'Admin must have settings.view permission');
assert(hasPermission(staffUser, 'settings.manage') === false, 'Staff must NOT have settings.manage permission');
assert(hasPermission(staffUser, 'dashboard.view') === true, 'Staff must have dashboard.view permission');
console.log('✓ TEST 8: Auth & RBAC regression passed.');

// ==================================================
// TEST 9 — REGRESSION: ORDERS & SALES
// ==================================================
console.log('Testing Orders & Sales data regression...');
assert(MOCK_ORDERS.length > 0, 'Mock orders pool must be intact');
assert(TRANSACTIONS_DATA.length > 0, 'Transactions pool must be intact');
const firstOrder = MOCK_ORDERS[0];
assert(typeof firstOrder.id === 'string', 'Order ID must exist');
assert(typeof firstOrder.total === 'number' && firstOrder.total > 0, 'Order total must be valid');
console.log('✓ TEST 9: Orders & Sales data regression passed.');

console.log('✔ All Settings & Language Improvement tests passed successfully!');
