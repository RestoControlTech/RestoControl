/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2, AlertCircle, Building2, Image as ImageIcon, X } from 'lucide-react';
import { Button, Input, Select } from '../../components/ui';
import { PermissionGate } from '../../components/auth/PermissionGate';
import { useSettings } from '../../hooks/useSettings';
import { useTranslation } from '../../i18n';

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const { t } = useTranslation();

  // Controlled form state initialized from persisted settings
  const [restaurantName, setRestaurantName] = useState(settings.restaurantName || '');
  const [phoneNumber, setPhoneNumber] = useState(settings.phoneNumber || '');
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');
  const [language, setLanguage] = useState(settings.language || 'en');
  const [address, setAddress] = useState(settings.address || 'Phnom Penh, Cambodia');
  const [openingHours, setOpeningHours] = useState(settings.openingHours || '11:00 AM - 10:30 PM');
  const [currency, setCurrency] = useState(settings.currency || 'USD');

  // Validation & feedback state
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [logoLoadError, setLogoLoadError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Sync state whenever persisted settings change
  useEffect(() => {
    setRestaurantName(settings.restaurantName || '');
    setPhoneNumber(settings.phoneNumber || '');
    setLogoUrl(settings.logoUrl || '');
    setLanguage(settings.language || 'en');
    setAddress(settings.address || 'Phnom Penh, Cambodia');
    setOpeningHours(settings.openingHours || '11:00 AM - 10:30 PM');
    setCurrency(settings.currency || 'USD');
  }, [settings]);

  // Reset logo load error whenever logo URL changes
  const handleLogoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoUrl(e.target.value.trim());
    setLogoLoadError(false);
    if (saveStatus.type !== 'idle') {
      setSaveStatus({ type: 'idle', message: '' });
    }
  };

  const validatePhone = (val: string): boolean => {
    // Valid phone regex allowing Cambodian (+855...) and international numbers
    // Must contain between 7 and 20 valid characters (digits, +, spaces, hyphens, parentheses)
    const trimmed = val.trim();
    if (!trimmed) return false;
    const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
    return phoneRegex.test(trimmed);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    setPhoneError(null);

    let hasError = false;

    // Validate Restaurant Name
    if (!restaurantName.trim()) {
      setNameError('Restaurant name is required.');
      hasError = true;
    }

    // Validate Phone Number
    if (!phoneNumber.trim()) {
      setPhoneError('Phone number is required.');
      hasError = true;
    } else if (!validatePhone(phoneNumber)) {
      setPhoneError('Please enter a valid phone number (e.g. +855 23 987 654 or 012 345 678).');
      hasError = true;
    }

    if (hasError) {
      setSaveStatus({
        type: 'error',
        message: 'Unable to save settings.',
      });
      return;
    }

    setIsSaving(true);

    try {
      // Persist unified settings object via store
      updateSettings({
        restaurantName: restaurantName.trim(),
        phoneNumber: phoneNumber.trim(),
        logoUrl: logoUrl.trim(),
        language,
        address: address.trim(),
        openingHours: openingHours.trim(),
        currency,
      });

      setIsSaving(false);
      setSaveStatus({
        type: 'success',
        message: 'Settings saved successfully.',
      });

      // Clear success banner after 4 seconds
      setTimeout(() => {
        setSaveStatus((prev) => (prev.type === 'success' ? { type: 'idle', message: '' } : prev));
      }, 4000);
    } catch {
      setIsSaving(false);
      setSaveStatus({
        type: 'error',
        message: 'Unable to save settings.',
      });
    }
  };

  return (
    <div id="settings-screen-root" className="space-y-6 max-w-4xl mx-auto">
      {/* Title & Header */}
      <div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">{t('settings', 'Settings')}</h2>
        <p className="text-xs text-slate-400 font-semibold tracking-wide mt-0.5">
          Restaurant Information & System Preferences
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ================================================== */}
        {/* SECTION 1: GENERAL */}
        {/* ================================================== */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-orange-600" />
            <h3 className="font-extrabold text-slate-900 text-sm tracking-wide uppercase">
              GENERAL
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Restaurant Name */}
            <div>
              <Input
                label="Restaurant Name"
                id="restaurant-name-input"
                type="text"
                value={restaurantName}
                onChange={(e) => {
                  setRestaurantName(e.target.value);
                  if (nameError) setNameError(null);
                }}
                placeholder="e.g. Kuro Bistro"
                error={nameError || undefined}
                required
              />
            </div>

            {/* Phone Number */}
            <div>
              <Input
                label="Phone Number"
                id="phone-number-input"
                type="text"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  if (phoneError) setPhoneError(null);
                }}
                placeholder="e.g. +855 23 987 654"
                error={phoneError || undefined}
                required
              />
            </div>

            {/* Language Selection */}
            <div>
              <Select
                label="Language"
                id="language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'km')}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'km', label: 'ភាសាខ្មែរ' },
                ]}
              />
              <p className="text-[10px] text-slate-400 font-medium mt-1">
                Choose between English and ភាសាខ្មែរ (Khmer)
              </p>
            </div>

            {/* Currency Preference */}
            <div>
              <Select
                label="Currency"
                id="currency-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={[
                  { value: 'USD', label: 'USD ($)' },
                  { value: 'KHR', label: 'KHR (៛)' },
                ]}
              />
              <p className="text-[10px] text-slate-400 font-medium mt-1">
                Rate: 1 USD = 4,100 KHR
              </p>
            </div>
          </div>
        </div>

        {/* ================================================== */}
        {/* SECTION 2: BRANDING */}
        {/* ================================================== */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-orange-600" />
            <h3 className="font-extrabold text-slate-900 text-sm tracking-wide uppercase">
              BRANDING
            </h3>
          </div>

          <div className="space-y-4">
            {/* Restaurant Logo URL Input */}
            <div>
              <label
                htmlFor="restaurant-logo-url-input"
                className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5"
              >
                Restaurant Logo URL
              </label>
              <div className="relative">
                <input
                  id="restaurant-logo-url-input"
                  type="url"
                  value={logoUrl}
                  onChange={handleLogoUrlChange}
                  placeholder="https://res.cloudinary.com/example/image/upload/v123/logo.png"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all pr-9"
                />
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoUrl('');
                      setLogoLoadError(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    title="Clear Logo URL"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-1">
                Paste a Cloudinary or web image URL. No local file upload needed.
              </p>
            </div>

            {/* Logo Preview Section */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Logo Preview
              </label>

              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 flex items-center gap-4">
                {/* Visual Preview Box */}
                <div
                  id="logo-preview-box"
                  className="w-20 h-20 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden shrink-0"
                >
                  {logoUrl ? (
                    logoLoadError ? (
                      <div className="text-center p-1.5">
                        <AlertCircle className="w-5 h-5 text-rose-500 mx-auto mb-1" />
                        <span className="text-[9px] font-bold text-rose-600 block leading-tight">
                          Error
                        </span>
                      </div>
                    ) : (
                      <img
                        id="restaurant-logo-preview-img"
                        src={logoUrl}
                        alt="Restaurant Logo"
                        onError={() => setLogoLoadError(true)}
                        onLoad={() => setLogoLoadError(false)}
                        className="w-full h-full object-contain p-1"
                      />
                    )
                  ) : (
                    <div className="text-center p-1.5 text-slate-400">
                      <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-40" />
                      <span className="text-[9px] font-bold block leading-tight">No logo</span>
                    </div>
                  )}
                </div>

                {/* Status / Description */}
                <div className="flex-1 min-w-0">
                  {logoUrl ? (
                    logoLoadError ? (
                      <div>
                        <p className="text-xs font-bold text-rose-600">Unable to load image</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          The URL could not be loaded. Please ensure it is a valid, publicly accessible image.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">
                            {restaurantName || 'Restaurant Logo'}
                          </span>
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono truncate mt-1">
                          {logoUrl}
                        </p>
                      </div>
                    )
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-slate-600">No logo configured</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Enter an image URL above to display your restaurant branding across POS, receipts, and menus.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================== */}
        {/* SAVE CHANGES ACTIONS BAR */}
        {/* ================================================== */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-4 gap-3">
          {/* Status Message Display */}
          <div className="min-h-[32px] flex items-center">
            {saveStatus.type === 'success' && (
              <div
                id="settings-success-alert"
                className="flex items-center gap-2 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200/60 text-xs text-emerald-700 font-bold"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{saveStatus.message}</span>
              </div>
            )}
            {saveStatus.type === 'error' && (
              <div
                id="settings-error-alert"
                className="flex items-center gap-2 bg-rose-50 px-3.5 py-1.5 rounded-xl border border-rose-200/60 text-xs text-rose-700 font-bold"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{saveStatus.message}</span>
              </div>
            )}
          </div>

          {/* Save Button */}
          <PermissionGate permission="settings.manage">
            <Button
              id="save-settings-btn"
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSaving}
              icon={<Save className="w-4 h-4" />}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </PermissionGate>
        </div>
      </form>
    </div>
  );
}
