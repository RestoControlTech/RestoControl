/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Sparkles, Save, CheckCircle2, CloudLightning } from 'lucide-react';

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
          
          <div className="bg-white rounded-2xl border border-slate-100 p-2.5 space-y-1 shadow-xs">
            {subTabs.map(tab => {
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                    isActive
                      ? 'bg-orange-50 text-orange-600'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Cloud Backup Status panel card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex items-center gap-3.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CloudLightning className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Cloud Backup</p>
              <p className="text-[11px] font-extrabold text-slate-700 mt-1 leading-none">Today, 14:32</p>
            </div>
          </div>

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
                    <span className="inline-block text-[8px] font-black bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded leading-none">Active Branding</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium mt-1 leading-none">PNG or SVG, max 2MB.</p>
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => alert('Launching Logo File Uploader...')}
                    className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/60 py-1.5 px-3.5 rounded-lg text-[10px] font-black transition-colors active:scale-95"
                  >
                    Upload Logo
                  </button>
                  <button
                    type="button"
                    onClick={() => alert('Removing active branding...')}
                    className="text-red-500 hover:text-red-600 border border-red-100 hover:bg-red-50 py-1.5 px-3.5 rounded-lg text-[10px] font-black transition-colors active:scale-95"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>

            {/* Basic details inputs row */}
            <div className="space-y-3 pt-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Basic Details</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="rname" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Restaurant Name</label>
                  <input
                    id="rname"
                    type="text"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-orange-500 focus:bg-white"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="rphone" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                  <input
                    id="rphone"
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-orange-500 focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="raddress" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Address</label>
                  <input
                    id="raddress"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-orange-500 focus:bg-white"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="rhours" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Opening Hours</label>
                  <input
                    id="rhours"
                    type="text"
                    value={openingHours}
                    onChange={(e) => setOpeningHours(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-orange-500 focus:bg-white"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Currency & Language row */}
            <div className="space-y-3 pt-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Currency & Language</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="rlang" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Default Language</label>
                  <select
                    id="rlang"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-orange-500 focus:bg-white"
                  >
                    <option value="en">English (US)</option>
                    <option value="jp">Japanese (JP)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="rcurr" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Primary Currency</label>
                  <select
                    id="rcurr"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-orange-500 focus:bg-white"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="KHR">KHR (៛)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 font-bold leading-none pl-1">Exchange rate: 1 USD = 4,100 KHR</p>
                </div>
              </div>
            </div>

            {/* Save Changes bar matching bottom part of Image 17 */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-4 gap-3">
              
              {/* Save status notification */}
              <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100/50 text-[10px] text-emerald-700 font-bold shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{saveStatus}</span>
              </div>

              {/* Submit Save changes button */}
              <button
                type="submit"
                disabled={isSaving}
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs py-2.5 px-5 rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>

            </div>

          </form>

        </div>

      </div>

    </div>
  );
}
