/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Receipt,
  Calendar,
  User,
  Utensils,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Coins,
  ArrowLeft,
  Printer,
  RotateCcw,
} from 'lucide-react';
import { Transaction, SaleItem } from '../../types';
import { formatPrice } from '../../utils/format';
import { isSaleEligibleForRefund } from '../../utils/refundRules';
import { getRefundableQuantity } from '../../utils/refundUtils';
import { Modal, Badge, Button } from '../ui';
import { SalePaymentSummary } from './SalePaymentSummary';

export interface SaleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Transaction | null;
  onOpenReceipt?: (sale: Transaction) => void;
  onOpenRefund?: (sale: Transaction, item?: SaleItem) => void;
  onOpenFullRefund?: (sale: Transaction) => void;
}

export const SaleDetailModal: React.FC<SaleDetailModalProps> = ({
  isOpen,
  onClose,
  sale,
  onOpenReceipt,
  onOpenRefund,
  onOpenFullRefund,
}) => {
  if (!sale) return null;

  const currency = sale.currency || 'USD';
  const isRefund = sale.status === 'Refunded' || sale.paymentStatus === 'Refunded';
  const isCash = sale.paymentMethod?.toLowerCase() === 'cash';
  const isEligibleForRefund = isSaleEligibleForRefund(sale).eligible;

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
                    {onOpenRefund && isEligibleForRefund && (
                      <th className="py-2.5 px-3.5 text-right">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {sale.items.map((item, idx) => {
                    const lineTotal = item.subtotal ?? item.unitPrice * item.quantity;
                    const hasRefund = typeof item.refundedQuantity === 'number' && item.refundedQuantity > 0;
                    const remQty = getRefundableQuantity(item.quantity, item.refundedQuantity);
                    const isItemFullyRefunded = remQty === 0;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3.5 font-bold text-slate-800">
                          <span>{item.name}</span>
                          {hasRefund && (
                            <span className="text-[10px] text-rose-500 font-extrabold ml-1.5 inline-block">
                              ({item.refundedQuantity} refunded)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-mono">{item.quantity}</td>
                        <td className="py-2.5 px-3.5 text-right font-mono text-slate-600">
                          {formatPrice(item.unitPrice, currency)}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900">
                          {formatPrice(lineTotal, currency)}
                        </td>
                        {onOpenRefund && isEligibleForRefund && (
                          <td className="py-2.5 px-3.5 text-right">
                            {isItemFullyRefunded ? (
                              <span className="text-[10px] font-bold text-slate-400">Refunded</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onOpenRefund(sale, item)}
                                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                              >
                                Refund
                              </button>
                            )}
                          </td>
                        )}
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
        <SalePaymentSummary
          sale={sale}
          currency={currency}
          isRefund={isRefund}
          isCash={isCash}
        />

        {/* Modal Action Buttons: Close / Issue Refund / Print Receipt */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </Button>

          <div className="flex items-center gap-2">
            {onOpenFullRefund && isEligibleForRefund && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => onOpenFullRefund(sale)}
                icon={<RotateCcw className="w-4 h-4 text-rose-600" />}
                className="hover:border-rose-300 text-rose-700 font-bold"
                id="open-full-refund-btn"
              >
                Full Refund
              </Button>
            )}

            {onOpenRefund && isEligibleForRefund && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => onOpenRefund(sale)}
                icon={<RotateCcw className="w-4 h-4 text-slate-600" />}
                className="hover:border-slate-300 text-slate-700"
                id="open-partial-refund-btn"
              >
                {onOpenFullRefund ? 'Partial Refund' : 'Issue Refund'}
              </Button>
            )}

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
      </div>
    </Modal>
  );
};
