/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const paddingStyles = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5 sm:p-6',
};

export const Card: React.FC<CardProps> = ({
  hoverEffect = false,
  padding = 'md',
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-white border border-slate-100 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.015)] transition-all ${
        hoverEffect ? 'hover:border-slate-200 group' : ''
      } ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
