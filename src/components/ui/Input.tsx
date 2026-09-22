/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  sublabel?: string;
  error?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  sublabel,
  error,
  icon,
  iconRight,
  id,
  className = '',
  required,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="space-y-1 w-full">
      {(label || sublabel) && (
        <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          {label && (
            <label htmlFor={inputId} className="cursor-pointer">
              {label} {required && <span className="text-orange-500">*</span>}
            </label>
          )}
          {sublabel && <span>{sublabel}</span>}
        </div>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          className={`w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white transition-colors ${icon ? 'pl-9' : ''} ${iconRight ? 'pr-9' : ''} ${error ? 'border-red-300 focus:ring-red-400' : ''} ${className}`}
          {...props}
        />
        {iconRight && (
          <div className="absolute right-3 flex items-center justify-center">
            {iconRight}
          </div>
        )}
      </div>
      {error && (
        <p className="text-[10px] text-red-500 font-bold mt-0.5">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
