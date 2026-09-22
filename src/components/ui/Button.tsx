/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 
  | 'primary' 
  | 'secondary' 
  | 'outline' 
  | 'ghost' 
  | 'danger' 
  | 'success' 
  | 'dark' 
  | 'warning'
  | 'subtle-orange';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-orange-600 hover:bg-orange-500 text-white shadow-md active:scale-95 border border-transparent',
  secondary: 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100 active:scale-95',
  outline: 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/60 active:scale-95',
  ghost: 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent active:scale-95',
  danger: 'text-red-500 hover:text-red-600 border border-red-100 hover:bg-red-50 active:scale-95',
  success: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100/40 active:scale-95',
  warning: 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-100/40 active:scale-95',
  dark: 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm active:scale-95 border border-transparent',
  'subtle-orange': 'bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-100/40 active:scale-95',
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'py-1 px-2.5 text-[9px] font-black rounded-lg gap-1',
  sm: 'py-1.5 px-3 text-[10px] font-bold rounded-lg gap-1',
  md: 'py-2.5 px-4 text-xs font-bold rounded-xl gap-1.5',
  lg: 'py-3 px-5 text-xs font-bold rounded-xl gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  iconRight,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-sans tracking-tight transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children && <span>{children}</span>}
      {!isLoading && iconRight && <span className="shrink-0">{iconRight}</span>}
    </button>
  );
});

Button.displayName = 'Button';
