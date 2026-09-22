/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Lock, User, Eye, EyeOff, Terminal, Sparkles } from 'lucide-react';
import { validatePin } from '../../auth/authHelper';

interface LoginProps {
  onLoginSuccess: (session: { name: string; role: string }) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('4091');
  const [pin, setPin] = useState('4091');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const session = validatePin(pin);
    if (session) {
      onLoginSuccess({ name: session.name, role: session.role });
    } else {
      setError('Invalid PIN or credentials. Try PIN: 4091 (Manager), 9999 (Cashier) or 8888 (Kitchen)');
    }
  };

  const insertDigit = (digit: string) => {
    setError(null);
    if (pin.length < 6) {
      setPin(prev => prev + digit);
    }
  };

  const deleteDigit = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div id="login-screen-root" className="min-h-screen bg-stone-100/50 flex flex-col items-center justify-center p-4 select-none font-sans antialiased">
      
      {/* Login Card Core Frame */}
      <div id="login-box" className="w-full max-w-[420px] bg-white rounded-3xl p-8 border border-stone-200/60 shadow-xl transition-all">
        
        {/* Kuro Bistro Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-extrabold text-xl shadow-md mb-3.5">
            K
          </div>
          <h2 className="text-lg font-bold text-stone-900 leading-tight">Kuro Bistro</h2>
          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">UNDER RESTOCONTROL</p>
        </div>

        {/* System Terminal status indicator banner */}
        <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-center mb-6">
          <div className="flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-100 py-1.5 px-3.5 rounded-xl text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>TERMINAL: BAR-02</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 bg-emerald-50/60 border border-emerald-100/40 py-1.5 px-3.5 rounded-xl text-emerald-700">
            <span>TOUCH READY</span>
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email / Username field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-stone-500">
              <label htmlFor="username">Username or Email</label>
              <span className="text-emerald-600 text-[10px] font-bold">STAFF ID OK</span>
            </div>
            <div className="relative flex items-center">
              <User className="w-4 h-4 absolute left-3.5 text-stone-400" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. staff@kurobistro.com or 4091"
                className="w-full bg-stone-50 border border-stone-200/80 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-stone-800 placeholder-stone-400/90 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 transition-colors"
                required
              />
            </div>
          </div>

          {/* Password / PIN code field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-stone-500">
              <label htmlFor="pin">Password or PIN</label>
              <span className="text-stone-400 text-[10px] font-bold">4-6 DIGIT PIN</span>
            </div>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 absolute left-3.5 text-stone-400" />
              <input
                id="pin"
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••••"
                className="w-full bg-stone-50 border border-stone-200/80 rounded-xl py-2.5 pl-10 pr-11 text-xs font-semibold tracking-widest text-stone-800 placeholder-stone-400 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 transition-colors"
                required
              />
              <button
                type="button"
                id="toggle-pin-visibility"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3.5 p-1 text-stone-400 hover:text-stone-600 rounded-lg active:scale-95"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Optional Station Memory Checkbox & link row */}
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                defaultChecked 
                className="rounded border-stone-300 text-orange-600 focus:ring-orange-500/20"
              />
              <span>Remember this station</span>
            </label>
            <a href="#forgot" onClick={(e) => { e.preventDefault(); setError('Contact system administrator for recovery support.'); }} className="text-orange-600 hover:text-orange-700">Forgot credentials?</a>
          </div>

          {/* Error Prompt block */}
          {error && (
            <div id="login-error-container" className="bg-red-50 text-red-700 text-xs font-bold p-3 rounded-xl border border-red-100/45 leading-relaxed text-center">
              {error}
            </div>
          )}

          {/* Numeric keypad interface directly inside login card for touch POS screens */}
          <div id="touch-keypad" className="grid grid-cols-3 gap-1.5 pt-3 border-t border-stone-100/70">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => insertDigit(num)}
                className="h-10 bg-stone-50 hover:bg-stone-100 border border-stone-200/40 text-sm font-black text-stone-700 rounded-xl transition-all active:scale-[0.93] flex items-center justify-center shadow-xs"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={deleteDigit}
              className="h-10 bg-stone-100/50 hover:bg-stone-100 border border-stone-200/40 text-xs font-black text-stone-500 rounded-xl transition-all active:scale-[0.93] flex items-center justify-center"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => insertDigit('0')}
              className="h-10 bg-stone-50 hover:bg-stone-100 border border-stone-200/40 text-sm font-black text-stone-700 rounded-xl transition-all active:scale-[0.93] flex items-center justify-center shadow-xs"
            >
              0
            </button>
            <button
              type="submit"
              className="h-10 bg-orange-100 text-orange-700 hover:bg-orange-200 font-black text-xs rounded-xl transition-all active:scale-[0.93] flex items-center justify-center"
            >
              Submit
            </button>
          </div>

          {/* Sign In Primary CTA Button */}
          <button
            type="submit"
            id="btn-login-submit"
            className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-xs tracking-wide transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
          >
            <span>Sign In to Station</span>
            <span className="text-sm font-normal">→</span>
          </button>

        </form>

        {/* Info Disclaimer Footer block */}
        <div className="mt-6 p-3 bg-stone-50 border border-stone-100 rounded-2xl text-[10px] text-stone-400 font-semibold leading-relaxed text-center">
          Role assignments and shift permissions are authenticated through Kuro Bistro cloud server.
        </div>

      </div>

      {/* Gateway Telemetry and stats sub-label footer */}
      <footer className="mt-5 flex flex-col items-center gap-1 text-[10px] text-stone-400 font-bold uppercase tracking-wider text-center">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>POS Gateway Active</span>
          <span className="text-stone-300">•</span>
          <span>v2.4 Production</span>
        </div>
        <div className="text-stone-300 font-medium tracking-normal capitalize mt-0.5">
          © 2026 Kuro Bistro Hospitality Group
        </div>
      </footer>

    </div>
  );
}
