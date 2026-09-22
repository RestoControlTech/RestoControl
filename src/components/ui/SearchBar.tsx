/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  containerClassName?: string;
  autoFocus?: boolean;
}

const sizeStyles = {
  sm: 'py-1.5 pl-9 pr-8 text-xs',
  md: 'py-2 pl-10 pr-8 text-xs',
  lg: 'py-2.5 pl-10 pr-9 text-xs',
};

const iconSizes = {
  sm: 'w-3.5 h-3.5 left-3',
  md: 'w-4 h-4 left-3.5',
  lg: 'w-4 h-4 left-3.5',
};

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  onClear,
  size = 'md',
  className = '',
  containerClassName = '',
  autoFocus = false,
}) => {
  return (
    <div className={`relative flex items-center w-full ${containerClassName}`}>
      <Search
        className={`absolute text-slate-400 pointer-events-none ${iconSizes[size]}`}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`w-full bg-slate-50 border border-slate-100 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:bg-white focus:border-slate-200 transition-all ${sizeStyles[size]} ${className}`}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            onClear?.();
          }}
          className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-lg active:scale-90 transition-colors"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
