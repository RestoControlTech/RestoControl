/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CreditCard, Banknote, QrCode, Smartphone } from 'lucide-react';
import { Transaction } from '../../types';
import { formatPrice } from '../../utils/format';
import { Badge } from '../ui';

export interface SalePaymentSummaryProps {
  sale: Transaction;
  currency: string;
  isRefund: boolean;
  isCash: boolean;
}

export const SalePaymentSummary: React.FC<SalePaymentSummaryProps> = ({
  sale,
  currency,
  isRefund,
  isCash,
}) => {
  const getPaymentMethodIcon = (method?: string) => {
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
      {/* Financial Breakdown Card */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2 text-xs">
        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
          Financial Breakdown
        </h5>

        {sale.subtotal !== undefined && (
          <div className="flex justify-between text-slate-500 font-semibold">
            <span>Subtotal:</span>
            <span className="font-mono">{formatPrice(sale.subtotal, currency)}</span>
          </div>
        )}

        {/* Tax only shown if the existing system uses it */}
        {sale.tax !== undefined && sale.tax > 0 && (
          <div className="flex justify-between text-slate-500 font-semibold">
            <span>Tax / Service:</span>
            <span className="font-mono">{formatPrice(sale.tax, currency)}</span>
          </div>
        )}

        {/* Total Refunded line if partial refund has occurred */}
        {sale.refundedAmount !== undefined && sale.refundedAmount > 0 && (
          <div className="flex justify-between text-rose-600 font-bold border-t border-slate-100 pt-1">
            <span>Already Refunded:</span>
            <span className="font-mono">-{formatPrice(sale.refundedAmount, currency)}</span>
          </div>
        )}

        <div className="border-t border-slate-200/80 pt-2 flex justify-between items-center text-sm font-black text-slate-900">
          <span>Total ({currency}):</span>
          <span
            className={`font-mono text-base ${
              isRefund ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {formatPrice(sale.amount, currency)}
          </span>
        </div>
      </div>

      {/* Payment Information Card */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2 text-xs">
        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
          Payment Information
        </h5>

        <div className="flex justify-between items-center text-slate-600 font-semibold">
          <span>Method:</span>
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            {getPaymentMethodIcon(sale.paymentMethod)}
            {sale.paymentMethod || 'Credit Card'}
          </span>
        </div>

        <div className="flex justify-between items-center text-slate-600 font-semibold">
          <span>Payment Status:</span>
          <Badge
            variant={isRefund ? 'red' : 'emerald'}
            size="xs"
            className="font-bold text-[9px]"
          >
            {sale.paymentStatus || (isRefund ? 'Refunded' : 'Paid')}
          </Badge>
        </div>

        <div className="flex justify-between items-center text-slate-600 font-semibold">
          <span>Amount Paid:</span>
          <span className="font-mono font-bold text-slate-800">
            {formatPrice(sale.amountPaid ?? Math.max(0, sale.amount), currency)}
          </span>
        </div>

        {/* Cash details (Cash received & Change) if applicable */}
        {isCash && sale.cashReceived !== undefined && (
          <div className="flex justify-between items-center text-slate-600 font-semibold">
            <span>Cash Received:</span>
            <span className="font-mono font-bold text-emerald-700">
              {formatPrice(sale.cashReceived, currency)}
            </span>
          </div>
        )}

        {isCash && sale.change !== undefined && (
          <div className="flex justify-between items-center text-slate-600 font-semibold border-t border-slate-200/50 pt-1.5 mt-1">
            <span>Change Returned:</span>
            <span className="font-mono font-black text-slate-800">
              {formatPrice(sale.change, currency)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
