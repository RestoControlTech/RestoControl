/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Search } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No items found',
  description = "We couldn't find anything matching your search. Try another query.",
  icon,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center select-none ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-3 shadow-xs">
        {icon || <Search className="w-5 h-5" />}
      </div>
      <h3 className="font-extrabold text-slate-800 text-xs mb-1">{title}</h3>
      <p className="text-[10px] text-slate-400 font-medium max-w-[220px] mb-4 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <Button variant="secondary" size="xs" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
