/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { Printer, X } from 'lucide-react';
import { Transaction } from '../../types';
import { formatPrice } from '../../utils/format';
import { Modal, Button, Badge } from '../ui';

export interface SaleReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Transaction | null;
  restaurantInfo?: {
    name?: string;
    phone?: string;
    address?: string;
    logoText?: string;
  };
}

export const SaleReceiptModal: React.FC<SaleReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  restaurantInfo = {
    name: 'Kuro Bistro',
    phone: '+855 23 987 654',
    address: 'Phnom Penh, Cambodia',
    logoText: 'K',
  },
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!sale) return null;

  const currency = sale.currency || 'USD';
  const isRefund = sale.status === 'Refunded' || sale.paymentStatus === 'Refunded';
  const isCash = sale.paymentMethod?.toLowerCase() === 'cash';

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Scoped Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible !important;
          }
          #printable-receipt {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 80mm !important;
            margin: 0 auto !important;
            padding: 12px !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: monospace, sans-serif !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Official Receipt: ${sale.orderNumber}`}
        maxWidth="sm"
      >
        <div className="space-y-4">
          {/* Printable Receipt Paper Container */}
          <div
            id="printable-receipt"
            ref={printAreaRef}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs font-mono text-slate-800 text-xs select-text"
          >
            {/* 1. Restaurant / Business Branding Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300 space-y-1">
              {/* Logo / Monogram */}
              <div className="w-10 h-10 rounded-xl bg-orange-600 text-white font-black text-xl flex items-center justify-center mx-auto mb-1.5 shadow-xs">
                {restaurantInfo.logoText || 'K'}
              </div>
              <h3 className="font-black text-base tracking-tight text-slate-900 font-sans">
                {restaurantInfo.name || 'Kuro Bistro'}
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                {restaurantInfo.address}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                Tel: {restaurantInfo.phone}
              </p>
            </div>

            {/* 2. Order & Customer Metadata */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Receipt No:</span>
                <span className="font-bold text-slate-900">{sale.orderNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Date/Time:</span>
                <span>{sale.dateTime}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Order Type:</span>
                <span className="font-bold">{sale.type}</span>
              </div>
              {sale.table && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Table:</span>
                  <span className="font-bold">{sale.table}</span>
                </div>
              )}
              {sale.customerName && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold">{sale.customerName}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-slate-500">Status:</span>
                <Badge
                  variant={isRefund ? 'red' : 'emerald'}
                  size="xs"
                  className="font-bold text-[9px]"
                >
                  {isRefund ? 'REFUNDED' : 'PAID'}
                </Badge>
              </div>
            </div>

            {/* 3. Itemized Products Table */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1.5">
              <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                <span className="col-span-6">Item</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-2 text-right">Price</span>
                <span className="col-span-2 text-right">Total</span>
              </div>

              {sale.items && sale.items.length > 0 ? (
                <div className="space-y-1.5 pt-0.5 text-[11px]">
                  {sale.items.map((item, idx) => {
                    const lineTotal = item.subtotal ?? item.unitPrice * item.quantity;
                    return (
                      <div key={idx} className="grid grid-cols-12 items-start leading-tight">
                        <span className="col-span-6 font-semibold text-slate-800 break-words pr-1">
                          {item.name}
                        </span>
                        <span className="col-span-2 text-center text-slate-600">
                          {item.quantity}
                        </span>
                        <span className="col-span-2 text-right text-slate-600">
                          {formatPrice(item.unitPrice, currency)}
                        </span>
                        <span className="col-span-2 text-right font-bold text-slate-900">
                          {formatPrice(lineTotal, currency)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] font-medium text-slate-700 py-1">
                  {sale.itemSummary || 'Purchased items'}
                </p>
              )}
            </div>

            {/* 4. Financial & Payment Summary */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              {sale.subtotal !== undefined && (
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatPrice(sale.subtotal, currency)}</span>
                </div>
              )}

              {/* Tax only if the existing system uses it */}
              {sale.tax !== undefined && sale.tax > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax:</span>
                  <span>{formatPrice(sale.tax, currency)}</span>
                </div>
              )}

              {/* Total Row */}
              <div className="flex justify-between items-center font-black text-sm text-slate-900 pt-1.5 border-t border-slate-200">
                <span>TOTAL ({currency}):</span>
                <span className={isRefund ? 'text-rose-600' : 'text-slate-900'}>
                  {formatPrice(sale.amount, currency)}
                </span>
              </div>
            </div>

            {/* 5. Payment Tender Breakdown */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-bold text-slate-900">{sale.paymentMethod || 'Credit Card'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-bold text-slate-900">
                  {formatPrice(sale.amountPaid ?? Math.max(0, sale.amount), currency)}
                </span>
              </div>
              {isCash && sale.cashReceived !== undefined && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Cash Tendered:</span>
                  <span>{formatPrice(sale.cashReceived, currency)}</span>
                </div>
              )}
              {isCash && sale.change !== undefined && (
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Change:</span>
                  <span>{formatPrice(sale.change, currency)}</span>
                </div>
              )}
            </div>

            {/* 6. Footer Notice & Thank You */}
            <div className="text-center pt-3 space-y-1.5 text-[10px] text-slate-500">
              <p className="font-semibold">Thank you for dining with us!</p>
              <p className="text-[9px] text-slate-400">Please retain receipt for your records.</p>
              <div className="pt-1 font-mono tracking-widest text-[11px] text-slate-400 select-none">
                * {sale.orderNumber.replace('#', '')} *
              </div>
            </div>
          </div>

          {/* Action Buttons (Excluded from Print) */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 no-print">
            <Button variant="secondary" size="md" onClick={onClose} icon={<X className="w-4 h-4" />}>
              Close
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handlePrint}
              icon={<Printer className="w-4 h-4" />}
            >
              Print Receipt
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
