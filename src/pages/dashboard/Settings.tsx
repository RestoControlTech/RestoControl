/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Save, CheckCircle2, CloudLightning } from 'lucide-react';
import { Button, Input, Select, Card, Badge } from '../../components/ui';
import { PermissionGate } from '../../components/auth/PermissionGate';

export default function Settings() {
  const [activeSubTab, setActiveSubTab] = useState('profile');
  const [restaurantName, setRestaurantName] = useState('Kuro Bistro');
  const [phone, setPhone] = useState('+855 23 987 654');
  const [address, setAddress] = useState('Phnom Penh, Cambodia');
  const [openingHours, setOpeningHours] = useState('11:00 AM - 10:30 PM');
  const [language, setLanguage] = useState('en');
  const [currency, setCurrency] = useState('USD');
  const [saveStatus, setSaveStatus] = useState('All changes up to date');
  const [isSaving, setIsSaving] = useState(false);

  const subTabs = [
    { id: 'profile', label: 'Restaurant Profile' },
    { id: 'lang', label: 'Language' },
    { id: 'curr', label: 'Currency' },
    { id: 'receipt', label: 'Receipt' },
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus('Saving changes...');
    setTimeout(() => {
      setIsSaving(false);
      setSaveStatus('All changes saved successfully');
      setTimeout(() => setSaveStatus('All changes up to date'), 3000);
    }, 1000);
  };

  return (
    <div id="settings-screen-root" className="space-y-6">
      
      {/* Title */}
      <div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Settings</h2>
        <p className="text-xs text-slate-400 font-semibold tracking-wide mt-0.5">Restaurant Profile & System Preferences</p>
      </div>

      {/* Main Settings split columns layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Side Settings navigation and telemetry column */}
        <div className="space-y-4 lg:col-span-1 shrink-0">
          
          <Card padding="sm" className="space-y-1">
            {subTabs.map(tab => {
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                    isActive
                      ? 'bg-orange-50 text-orange-600'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </Card>

          {/* Cloud Backup Status panel card */}
          <Card padding="md" className="flex items-center gap-3.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CloudLightning className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Cloud Backup</p>
              <p className="text-[11px] font-extrabold text-slate-700 mt-1 leading-none">Today, 14:32</p>
            </div>
          </Card>

        </div>

        {/* Right Settings panel details edit form column */}
        <div className="lg:col-span-3 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          
          <div className="border-b border-slate-50 pb-4 mb-6">
            <h3 className="font-extrabold text-slate-900 text-sm">Restaurant Profile</h3>
            <p className="text-[11px] text-slate-400 font-semibold tracking-wide mt-1">Manage your restaurant information and basic preferences.</p>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Restaurant Logo branding box row */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Restaurant Logo</label>
              
              <div className="flex items-center gap-4 bg-slate-50 border border-slate-100/60 p-4 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                  K
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <span>Kuro Bistro</span>
                    <Badge variant="orange" size="xs">
                      Active Branding
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium mt-1 leading-none">PNG or SVG, max 2MB.</p>
                </div>
                
                <PermissionGate permission="settings.manage">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => alert('Launching Logo File Uploader...')}
                    >
                      Upload Logo
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="xs"
                      onClick={() => alert('Removing active branding...')}
                    >
                      Remove
                    </Button>
                  </div>
                </PermissionGate>
              </div>
            </div>

            {/* Basic details inputs row */}
            <div className="space-y-3 pt-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Basic Details</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Restaurant Name"
                  id="rname"
                  type="text"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  required
                />
                <Input
                  label="Phone Number"
                  id="rphone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Address"
                  id="raddress"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
                <Input
                  label="Opening Hours"
                  id="rhours"
                  type="text"
                  value={openingHours}
                  onChange={(e) => setOpeningHours(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Currency & Language row */}
            <div className="space-y-3 pt-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Currency & Language</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Default Language"
                  id="rlang"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  options={[
                    { value: 'en', label: 'English (US)' },
                    { value: 'jp', label: 'Japanese (JP)' },
                  ]}
                />
                <div className="space-y-1">
                  <Select
                    label="Primary Currency"
                    id="rcurr"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    options={[
                      { value: 'USD', label: 'USD ($)' },
                      { value: 'KHR', label: 'KHR (៛)' },
                    ]}
                  />
                  <p className="text-[10px] text-slate-400 font-bold leading-none pl-1">Exchange rate: 1 USD = 4,100 KHR</p>
                </div>
              </div>
            </div>

            {/* Save Changes bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-4 gap-3">
              
              {/* Save status notification */}
              <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100/50 text-[10px] text-emerald-700 font-bold shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{saveStatus}</span>
              </div>

              {/* Submit Save changes button */}
              <PermissionGate permission="settings.manage">
                <Button
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

      </div>

    </div>
  );
}
