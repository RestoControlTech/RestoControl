/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface LoadingStateProps {
  count?: number;
  type?: 'grid' | 'list' | 'table';
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  count = 4,
  type = 'grid',
  className = '',
}) => {
  const items = Array.from({ length: count }, (_, i) => i);

  if (type === 'list') {
    return (
      <div className={`space-y-3 ${className}`}>
        {items.map((idx) => (
          <div
            key={idx}
            className="bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-3 animate-pulse"
          >
            <div className="w-10 h-10 bg-slate-200 rounded-lg shrink-0"></div>
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-slate-200 rounded w-1/3"></div>
              <div className="h-2.5 bg-slate-100 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 ${className}`}>
      {items.map((idx) => (
        <div
          key={idx}
          className="bg-white border border-slate-100 rounded-xl overflow-hidden p-2 flex flex-col justify-between animate-pulse"
        >
          <div className="w-full aspect-[4/3] bg-slate-200 rounded-lg mb-2"></div>
          <div className="h-3.5 bg-slate-200 rounded w-3/4 mb-1.5"></div>
          <div className="h-2.5 bg-slate-100 rounded w-1/2 mb-3"></div>
          <div className="flex items-center justify-between pt-1">
            <div className="h-3.5 bg-slate-200 rounded w-10"></div>
            <div className="w-7 h-7 bg-slate-200 rounded-lg"></div>
          </div>
        </div>
      ))}
    </div>
  );
};
