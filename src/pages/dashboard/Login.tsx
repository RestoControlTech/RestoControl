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

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // If already authenticated, redirect to dashboard or requested page
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/pos';
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
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/pos';
      navigate(from, { replace: true });
    } else {
      setError(result.error || 'Invalid email or password. Please try again.');
    }
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

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email / Username field */}
          <Input
            label="Email or Staff ID"
            id="username"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. staff@kurobistro.com"
            icon={<User className="w-4 h-4" />}
            required
          />

          {/* Password / PIN code field */}
          <Input
            label="Password"
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
            <a href="#forgot" onClick={(e) => { e.preventDefault(); setError('Please contact your administrator to reset your password.'); }} className="text-orange-600 hover:text-orange-700">Forgot password?</a>
          </div>

          {/* Error Prompt block */}
          {error && (
            <div id="login-error-container" className="bg-red-50 text-red-700 text-xs font-bold p-3 rounded-xl border border-red-100/45 leading-relaxed text-center">
              {error}
            </div>
          )}

          {/* Sign In Primary CTA Button */}
          <Button
            type="submit"
            id="btn-login-submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            className="mt-4"
          >
            <span>Sign In to Station</span>
            <span className="text-sm font-normal">→</span>
          </Button>

        </form>

      </div>

      {/* Gateway Telemetry and stats sub-label footer */}
      <footer className="mt-5 flex flex-col items-center gap-1 text-[10px] text-stone-400 font-bold uppercase tracking-wider text-center">
        <div className="text-stone-300 font-medium tracking-normal capitalize mt-0.5">
          © 2026 Kuro Bistro Hospitality Group
        </div>
      </footer>

    </div>
  );
}
