/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button, Input } from '../../components/ui';

interface LoginProps {
  onLoginSuccess?: (session: { name: string; role: string }) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('admin@restaurant.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // If already authenticated, redirect to dashboard or requested page
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please provide both username/email and password/PIN.');
      return;
    }

    setIsLoading(true);

    const result = login(email, password);

    setIsLoading(false);

    if (result.success) {
      if (onLoginSuccess) {
        onLoginSuccess({ name: email, role: 'admin' });
      }
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } else {
      setError(result.error || 'Invalid credentials. Try admin@restaurant.com (admin123) or staff@restaurant.com (staff123)');
    }
  };

  const insertDigit = (digit: string) => {
    setError(null);
    if (password.length < 12) {
      setPassword(prev => prev + digit);
    }
  };

  const deleteDigit = () => {
    setPassword(prev => prev.slice(0, -1));
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
          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">RESTOCONTROL TERMINAL</p>
        </div>

        {/* System Terminal status indicator banner */}
        <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-center mb-6">
          <div className="flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-100 py-1.5 px-3.5 rounded-xl text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>TERMINAL: POS-01</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 bg-emerald-50/60 border border-emerald-100/40 py-1.5 px-3.5 rounded-xl text-emerald-700">
            <span>TOUCH READY</span>
          </div>
        </div>

        {/* Quick Credentials Helper Pills for Easy Demo / Touch */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => {
              setEmail('admin@restaurant.com');
              setPassword('admin123');
              setError(null);
            }}
            className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200/50 transition-colors cursor-pointer"
          >
            Fill Admin
          </button>
          <button
            type="button"
            onClick={() => {
              setEmail('staff@restaurant.com');
              setPassword('staff123');
              setError(null);
            }}
            className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/50 transition-colors cursor-pointer"
          >
            Fill Staff
          </button>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email / Username field */}
          <Input
            label="Email or Staff ID"
            sublabel="MOCK AUTH"
            id="username"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@restaurant.com or staff@restaurant.com"
            icon={<User className="w-4 h-4" />}
            required
          />

          {/* Password / PIN code field */}
          <Input
            label="Password"
            sublabel="DEMO: admin123 / staff123"
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            icon={<Lock className="w-4 h-4" />}
            iconRight={
              <button
                type="button"
                id="toggle-pin-visibility"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-lg active:scale-95 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            className="tracking-normal"
            required
          />

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
            <a href="#forgot" onClick={(e) => { e.preventDefault(); setError('Demo Credentials: admin@restaurant.com (admin123) or staff@restaurant.com (staff123)'); }} className="text-orange-600 hover:text-orange-700">Forgot password?</a>
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
                className="h-10 bg-stone-50 hover:bg-stone-100 border border-stone-200/40 text-sm font-black text-stone-700 rounded-xl transition-all active:scale-[0.93] flex items-center justify-center shadow-xs cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={deleteDigit}
              className="h-10 bg-stone-100/50 hover:bg-stone-100 border border-stone-200/40 text-xs font-black text-stone-500 rounded-xl transition-all active:scale-[0.93] flex items-center justify-center cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => insertDigit('0')}
              className="h-10 bg-stone-50 hover:bg-stone-100 border border-stone-200/40 text-sm font-black text-stone-700 rounded-xl transition-all active:scale-[0.93] flex items-center justify-center shadow-xs cursor-pointer"
            >
              0
            </button>
            <button
              type="submit"
              className="h-10 bg-orange-100 text-orange-700 hover:bg-orange-200 font-black text-xs rounded-xl transition-all active:scale-[0.93] flex items-center justify-center cursor-pointer"
            >
              Submit
            </button>
          </div>

          {/* Sign In Primary CTA Button */}
          <Button
            type="submit"
            id="btn-login-submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            className="mt-2"
          >
            <span>Sign In to Station</span>
            <span className="text-sm font-normal">→</span>
          </Button>

        </form>

        {/* Info Disclaimer Footer block */}
        <div className="mt-6 p-3 bg-stone-50 border border-stone-100 rounded-2xl text-[10px] text-stone-400 font-semibold leading-relaxed text-center">
          Role assignments and shift permissions are authenticated through RestoControl mock session store.
        </div>

      </div>

      {/* Gateway Telemetry and stats sub-label footer */}
      <footer className="mt-5 flex flex-col items-center gap-1 text-[10px] text-stone-400 font-bold uppercase tracking-wider text-center">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Frontend Mock Auth Active</span>
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
