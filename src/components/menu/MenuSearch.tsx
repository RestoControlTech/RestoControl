/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SearchBar } from '../ui';

export interface MenuSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const MenuSearch: React.FC<MenuSearchProps> = ({
  value,
  onChange,
  placeholder = 'Search by name, ID (#D1), description, tag...',
  className = 'w-full bg-slate-50',
}) => {
  return (
    <SearchBar
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      size="sm"
      className={className}
    />
  );
};
