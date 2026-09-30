/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  TrendingUp,
  Receipt,
  CreditCard,
  Banknote,
  QrCode,
  Smartphone,
} from 'lucide-react';
import { Card } from '../ui';
import { formatPrice } from '../../utils/format';
import { SalesSummaryData } from '../../utils/salesSummary';

export interface SalesSummaryProps {
  summary: SalesSummaryData;
  currency?: string;
  isFiltered?: boolean;
}

export const SalesSummary: React.FC<SalesSummaryProps> = ({
  summary,
  currency = 'USD',
  isFiltered = false,
}) => {
  const {
    totalRevenue,
    completedCount,
    paymentSummary,
  } = summary;

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'Cash':
        return <Banknote className="w-3.5 h-3.5 text-emerald-600" />;
      case 'QR Code':
        return <QrCode className="w-3.5 h-3.5 text-blue-600" />;
      case 'Digital Wallet':
        return <Smartphone className="w-3.5 h-3.5 text-purple-600" />;
      case 'Credit Card':
      case 'Debit Card':
      default:
        return <CreditCard className="w-3.5 h-3.5 text-orange-600" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Primary KPI Analytics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* KPI 1: Revenue */}
        <Card padding="lg" className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {isFiltered ? 'Filtered Revenue' : 'Total Revenue'}
            </p>
            <h4 className="text-lg font-black text-slate-800 tracking-tight">
              {formatPrice(totalRevenue, currency)}
            </h4>
            <span className="text-[9px] text-emerald-600 font-extrabold flex items-center gap-0.5 leading-none">
              <TrendingUp className="w-3 h-3" />
              <span>Paid transactions</span>
            </span>
          </div>
          <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </Card>

        {/* KPI 2: Completed Sales Count */}
        <Card padding="lg" className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {isFiltered ? 'Filtered Sales' : 'Completed Sales'}
            </p>
            <h4 className="text-lg font-black text-slate-800 tracking-tight">
              {completedCount} {completedCount === 1 ? 'order' : 'orders'}
            </h4>
            <span className="text-[10px] text-emerald-600 font-extrabold leading-none">
              {completedCount > 0 ? '100% completed' : 'No sales matching'}
            </span>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* 2. Payment Method Breakdown */}
      <Card padding="md" className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-slate-500" />
            <h5 className="text-xs font-black text-slate-800 tracking-tight">Payment Summary</h5>
          </div>
          <span className="text-[10px] text-slate-400 font-bold">
            {paymentSummary.reduce((sum, item) => sum + item.count, 0)} payments
          </span>
        </div>

        <div className="space-y-2">
          {paymentSummary.map((item) => (
            <div key={item.method} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <div className="flex items-center gap-1.5">
                  {getPaymentIcon(item.method)}
                  <span>{item.method}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">({item.count})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-900">{formatPrice(item.revenue, currency)}</span>
                  <span className="text-[10px] text-slate-400 font-semibold w-8 text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-orange-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(item.percentage, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
