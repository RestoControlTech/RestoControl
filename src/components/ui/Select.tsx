/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { forwardRef } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  sublabel?: string;
  error?: string;
  options?: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  sublabel,
  error,
  options,
  children,
  id,
  className = '',
  required,
  ...props
}, ref) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="space-y-1 w-full">
      {(label || sublabel) && (
        <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          {label && (
            <label htmlFor={selectId} className="cursor-pointer">
              {label} {required && <span className="text-orange-500">*</span>}
            </label>
          )}
          {sublabel && <span>{sublabel}</span>}
        </div>
      )}
      <select
        ref={ref}
        id={selectId}
        required={required}
        className={`w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white transition-colors ${error ? 'border-red-300 focus:ring-red-400' : ''} ${className}`}
        {...props}
      >
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
      {error && (
        <p className="text-[10px] text-red-500 font-bold mt-0.5">{error}</p>
      )}
    </div>
  );
});

Select.displayName = 'Select';
