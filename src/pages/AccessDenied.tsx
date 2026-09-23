/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button, Card } from '../components/ui';

export interface AccessDeniedProps {
  permission?: string;
  onNavigateHome?: () => void;
}

export default function AccessDenied({ permission, onNavigateHome }: AccessDeniedProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div
      id="access-denied-page-root"
      className="min-h-[500px] flex items-center justify-center p-4 select-none font-sans antialiased"
      role="region"
      aria-labelledby="access-denied-heading"
    >
      <Card
        padding="lg"
        className="w-full max-w-md flex flex-col items-center text-center shadow-lg border border-slate-100/80 p-8 sm:p-10"
      >
        {/* Warning Icon Badge */}
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mb-5 border border-amber-100/60 shadow-xs">
          <ShieldAlert className="w-8 h-8" aria-hidden="true" />
        </div>

        {/* Title */}
        <h1
          id="access-denied-heading"
          className="text-xl font-black text-slate-900 tracking-tight leading-tight"
        >
          Access Denied
        </h1>

        {/* Primary description */}
        <p className="text-xs font-bold text-slate-600 mt-2">
          You don't have permission to access this page.
        </p>

        {/* Supporting text */}
        <p className="text-[11px] text-slate-400 font-medium max-w-xs mt-1 leading-relaxed">
          Please contact an administrator if you believe you need access.
        </p>

        {permission && (
          <div className="mt-3 inline-flex items-center gap-1 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg text-[10px] text-slate-500 font-mono">
            <span>Required permission:</span>
            <span className="font-bold text-slate-700">{permission}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-6 w-full sm:w-auto">
          <Button
            type="button"
            variant="primary"
            size="md"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={handleBack}
            className="w-full sm:w-auto font-bold px-6"
          >
            Back to Dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
}
