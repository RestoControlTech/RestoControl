/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Printer, X } from 'lucide-react';
import { Order } from '../../types';
import { formatPrice, formatKHR, USD_TO_KHR_RATE } from '../../utils/format';
import { Button, Modal } from '../ui';
import { useSettings } from '../../hooks/useSettings';

export interface OrderReceiptModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  restaurantInfo?: {
    name?: string;
    phone?: string;
    address?: string;
    logoText?: string;
  };
}

export const OrderReceiptModal: React.FC<OrderReceiptModalProps> = ({
  isOpen,
  order,
  onClose,
  restaurantInfo,
}) => {
  const { settings } = useSettings();
  if (!isOpen || !order) return null;

  const info = {
    name: restaurantInfo?.name || settings.restaurantName || 'RestoControl POS',
    phone: restaurantInfo?.phone || settings.phoneNumber || '+855 23 987 654',
    address: restaurantInfo?.address || settings.address || 'Phnom Penh, Cambodia',
    logoText: restaurantInfo?.logoText || (settings.restaurantName ? settings.restaurantName.charAt(0).toUpperCase() : 'R'),
  };

  const handlePrint = () => {
    window.print();
  };

  const khrTotal = Math.round(order.total * USD_TO_KHR_RATE);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Receipt - Order ${order.orderNumber}`}
      subtitle={`Table: ${order.table} · ${order.dateTime}`}
      maxWidth="sm"
    >
      <div className="space-y-4 py-1">
        {/* Thermal Style Receipt Paper Card */}
        <div
          id="printable-receipt"
          className="bg-white border border-slate-200 rounded-2xl p-5 font-mono text-xs text-slate-800 space-y-3.5 shadow-xs select-text"
        >
          {/* Restaurant Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-3 space-y-1">
            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white font-black text-xl flex items-center justify-center mx-auto mb-1 shadow-xs">
              {info.logoText || 'R'}
            </div>
            <h2 className="font-sans font-black text-base text-slate-900 tracking-tight uppercase">
              {info.name || 'RestoControl POS'}
            </h2>
            <p className="text-[10px] text-slate-500 font-sans">
              {info.address}
            </p>
            <p className="text-[10px] text-slate-400 font-sans">
              Tel: {info.phone}
            </p>
          </div>

          {/* Order Header Info */}
          <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Receipt Ref:</span>
              <span className="font-bold text-slate-900">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date & Time:</span>
              <span>{order.dateTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Table:</span>
              <span className="font-bold text-slate-900">{order.table}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-medium text-slate-800">{order.customer}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Order Source:</span>
              <span className="font-bold uppercase">{order.orderType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Status:</span>
              <span className={`font-bold uppercase ${order.paymentStatus === 'Paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                {order.paymentStatus}
              </span>
            </div>
          </div>

          {/* Itemized Products Table */}
          <div className="space-y-2 border-b border-dashed border-slate-300 pb-3">
            <div className="grid grid-cols-12 font-bold text-[10px] uppercase text-slate-400 pb-1 border-b border-slate-100">
              <div className="col-span-5">Item</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-3 text-right">Total</div>
            </div>
            {order.items.map((item, idx) => (
              <div key={item.id || idx} className="grid grid-cols-12 text-[11px] leading-tight">
                <div className="col-span-5 font-bold truncate pr-1 text-slate-900">{item.name}</div>
                <div className="col-span-2 text-center font-bold text-slate-600">x{item.quantity}</div>
                <div className="col-span-2 text-right text-slate-500">{formatPrice(item.unitPrice)}</div>
                <div className="col-span-3 text-right font-bold text-slate-900">{formatPrice(item.lineTotal)}</div>
              </div>
            ))}
          </div>

          {/* Kitchen Note if present */}
          {order.note && (
            <div className="text-[10px] italic border-b border-dashed border-slate-300 pb-2 text-slate-600">
              Note: {order.note}
            </div>
          )}

          {/* Totals Breakdown */}
          <div className="space-y-1.5 text-xs pt-1 border-b border-dashed border-slate-300 pb-3">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>{formatPrice(order.total)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tax & Surcharge:</span>
              <span>$0.00</span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-900 pt-2">
              <span>TOTAL (USD):</span>
              <span>{formatPrice(order.total)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-orange-600">
              <span>TOTAL (KHR):</span>
              <span>{formatKHR(khrTotal)}</span>
            </div>
          </div>

          {/* Footer message */}
          <div className="text-center text-[10px] text-slate-400 font-sans pt-1 space-y-1">
            <p className="font-semibold text-slate-600">Thank you for dining with us!</p>
            <p className="text-[9px]">Please retain this receipt for your records.</p>
            <div className="pt-1 font-mono tracking-widest text-[11px] text-slate-400 select-none">
              * {order.orderNumber.replace('#', '')} *
            </div>
          </div>
        </div>

        {/* Action Controls - Excluded from Print */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 no-print">
          <Button
            onClick={onClose}
            variant="secondary"
            size="sm"
            icon={<X className="w-4 h-4" />}
          >
            Close
          </Button>
          <Button
            onClick={handlePrint}
            variant="primary"
            size="sm"
            icon={<Printer className="w-4 h-4" />}
          >
            Print Receipt
          </Button>
        </div>
      </div>
    </Modal>
  );
};
