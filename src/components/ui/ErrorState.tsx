/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  retryText?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load content',
  message = 'An unexpected error occurred. Please check your connection and try again.',
  icon,
  retryText = 'Retry Loading',
  onRetry,
  isRetrying = false,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center select-none ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-3 border border-red-100 shadow-xs">
        {icon || <AlertTriangle className="w-5 h-5" />}
      </div>
      <h3 className="font-extrabold text-slate-800 text-xs mb-1">{title}</h3>
      <p className="text-[10px] text-slate-400 font-medium max-w-[220px] mb-4 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="dark"
          size="sm"
          onClick={onRetry}
          isLoading={isRetrying}
          icon={!isRetrying ? <RefreshCw className="w-3.5 h-3.5" /> : undefined}
        >
          {retryText}
        </Button>
      )}
    </div>
  );
};
