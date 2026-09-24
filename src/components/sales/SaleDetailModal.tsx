/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Receipt,
  Calendar,
  User,
  CreditCard,
  Utensils,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Banknote,
  QrCode,
  Smartphone,
  Coins,
  ArrowLeft,
  Printer,
} from 'lucide-react';
import { Transaction } from '../../types';
import { formatPrice } from '../../utils/format';
import { Modal, Badge, Button } from '../ui';

export interface SaleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Transaction | null;
  onOpenReceipt?: (sale: Transaction) => void;
}

export const SaleDetailModal: React.FC<SaleDetailModalProps> = ({
  isOpen,
  onClose,
  sale,
  onOpenReceipt,
}) => {
  if (!sale) return null;

  const currency = sale.currency || 'USD';
  const isRefund = sale.status === 'Refunded' || sale.paymentStatus === 'Refunded';
  const isCash = sale.paymentMethod?.toLowerCase() === 'cash';

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Sale Details: ${sale.orderNumber}`}
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* 1. Header Banner & Order Status */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                isRefund ? 'bg-rose-100 text-rose-600' : 'bg-orange-100 text-orange-600'
              }`}
            >
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-base">{sale.orderNumber}</h3>
                <span className="text-[10px] font-mono text-slate-400 font-bold">
                  (ID: #{sale.id.replace('tx-', 'TX-')})
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{sale.dateTime}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Badge
              variant={isRefund ? 'red' : 'emerald'}
              size="md"
              className="font-black text-xs px-2.5 py-1"
            >
              {isRefund ? (
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Refunded
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {sale.status === 'Completed' ? 'Completed' : 'Paid (Receipt)'}
                </span>
              )}
            </Badge>
          </div>
        </div>

        {/* 2. Order Metadata Information Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white border border-slate-100 rounded-2xl p-3.5 text-xs">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Order Type
            </span>
            <span className="font-extrabold text-slate-800 flex items-center gap-1">
              <Utensils className="w-3.5 h-3.5 text-orange-500" />
              {sale.type}
            </span>
          </div>

          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Table / Location
            </span>
            <span className="font-extrabold text-slate-800 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {sale.table || 'Pickup'}
            </span>
          </div>

          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Customer
            </span>
            <span className="font-extrabold text-slate-800 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              {sale.customerName || 'Walk-in Guest'}
            </span>
          </div>

          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Currency
            </span>
            <span className="font-extrabold text-slate-800 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              {currency === 'KHR' ? 'KHR (៛)' : 'USD ($)'}
            </span>
          </div>
        </div>

        {/* 3. Purchased Items Section */}
        <div className="space-y-2">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Purchased Items & Breakdown
          </h4>

          {sale.items && sale.items.length > 0 ? (
            <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3.5">Product Name</th>
                    <th className="py-2.5 px-3.5 text-center">Qty</th>
                    <th className="py-2.5 px-3.5 text-right">Unit Price</th>
                    <th className="py-2.5 px-3.5 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {sale.items.map((item, idx) => {
                    const lineTotal = item.subtotal ?? item.unitPrice * item.quantity;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3.5 font-bold text-slate-800">{item.name}</td>
                        <td className="py-2.5 px-3.5 text-center font-mono">{item.quantity}</td>
                        <td className="py-2.5 px-3.5 text-right font-mono text-slate-600">
                          {formatPrice(item.unitPrice, currency)}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900">
                          {formatPrice(lineTotal, currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs">
              <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider mb-1">
                Items Summary
              </span>
              <p className="font-bold text-slate-800">{sale.itemSummary || 'Order items summary'}</p>
            </div>
          )}
        </div>

        {/* 4. Financial & Payment Information Split Cards */}
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

        {/* Modal Action Buttons: Close / Return to Sales History & Print Receipt */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Sales History
          </Button>

          {onOpenReceipt && (
            <Button
              variant="primary"
              size="md"
              onClick={() => onOpenReceipt(sale)}
              icon={<Printer className="w-4 h-4" />}
            >
              Print Receipt
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
