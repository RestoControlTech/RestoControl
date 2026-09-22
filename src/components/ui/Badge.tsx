/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export type BadgeVariant =
  | 'orange'
  | 'blue'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'teal'
  | 'slate'
  | 'red';

export type BadgeSize = 'xs' | 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  dotPulse?: boolean;
  uppercase?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
  orange: {
    container: 'bg-orange-50 text-orange-600 border-orange-100/50',
    dot: 'bg-orange-500 ring-orange-100',
  },
  blue: {
    container: 'bg-blue-50 text-blue-700 border-blue-200/40',
    dot: 'bg-blue-500 ring-blue-100',
  },
  emerald: {
    container: 'bg-emerald-50 text-emerald-700 border-emerald-200/40',
    dot: 'bg-emerald-500 ring-emerald-100',
  },
  amber: {
    container: 'bg-amber-50 text-amber-700 border-amber-200/40',
    dot: 'bg-amber-500 ring-amber-100',
  },
  rose: {
    container: 'bg-rose-50 text-rose-700 border-rose-200/40',
    dot: 'bg-rose-500 ring-rose-100',
  },
  teal: {
    container: 'bg-teal-50 text-teal-700 border-teal-200/40',
    dot: 'bg-teal-500 ring-teal-100',
  },
  slate: {
    container: 'bg-slate-50 text-slate-600 border-slate-200/60',
    dot: 'bg-slate-400 ring-slate-100',
  },
  red: {
    container: 'bg-red-50 text-red-700 border-red-100/45',
    dot: 'bg-red-500 ring-red-100',
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  xs: 'text-[8px] font-black px-1.5 py-0.5 rounded leading-none',
  sm: 'text-[9px] font-extrabold px-2 py-0.5 rounded-lg leading-tight tracking-wider',
  md: 'text-[10px] font-bold px-2.5 py-1 rounded-lg leading-tight',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'slate',
  size = 'sm',
  dot = false,
  dotPulse = false,
  uppercase = true,
  children,
  className = '',
  ...props
}) => {
  const styles = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 border font-sans select-none ${styles.container} ${sizeStyles[size]} ${uppercase ? 'uppercase tracking-wider' : ''} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ring-2 ${styles.dot} ${dotPulse ? 'animate-pulse' : ''}`}
        />
      )}
      <span>{children}</span>
    </span>
  );
};
