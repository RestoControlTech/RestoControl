/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Printer, X, Receipt } from 'lucide-react';
import { Order } from '../../types';
import { formatPrice, formatKHR, USD_TO_KHR_RATE } from '../../utils/format';
import { Button, Modal } from '../ui';

export interface OrderReceiptModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
}

export const OrderReceiptModal: React.FC<OrderReceiptModalProps> = ({
  isOpen,
  order,
  onClose,
}) => {
  if (!isOpen || !order) return null;

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
      maxWidth="md"
    >
      <div id="printable-receipt-container" className="space-y-4 py-2">
        {/* Thermal Style Receipt Paper Card */}
        <div className="bg-amber-50/40 border border-slate-200 rounded-2xl p-6 font-mono text-xs text-slate-800 space-y-4 shadow-inner">
          {/* Restaurant Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-3 space-y-1">
            <h2 className="font-sans font-black text-lg text-slate-900 tracking-tight uppercase">RestoControl POS</h2>
            <p className="text-[10px] text-slate-500 font-sans">Restaurant POS Station & Dining Receipt</p>
            <p className="text-[10px] text-slate-400 font-sans">123 Culinary Ave, Suite 400</p>
          </div>

          {/* Order Header Info */}
          <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-3">
            <div className="flex justify-between">
              <span>Receipt Ref:</span>
              <span className="font-bold">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date & Time:</span>
              <span>{order.dateTime}</span>
            </div>
            <div className="flex justify-between">
              <span>Table / Station:</span>
              <span className="font-bold">{order.table}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer:</span>
              <span>{order.customer}</span>
            </div>
            <div className="flex justify-between">
              <span>Order Type:</span>
              <span className="uppercase">{order.orderType}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Status:</span>
              <span className="font-bold uppercase">{order.paymentStatus}</span>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="space-y-2 border-b border-dashed border-slate-300 pb-3">
            <div className="grid grid-cols-12 font-bold text-[10px] uppercase text-slate-500 pb-1">
              <div className="col-span-6">Item</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-4 text-right">Price</div>
            </div>
            {order.items.map((item, idx) => (
              <div key={item.id || idx} className="grid grid-cols-12 text-[11px]">
                <div className="col-span-6 font-bold truncate pr-1">{item.name}</div>
                <div className="col-span-2 text-center font-bold">x{item.quantity}</div>
                <div className="col-span-4 text-right font-bold">{formatPrice(item.lineTotal)}</div>
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
          <div className="space-y-1.5 text-xs pt-1">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>{formatPrice(order.total)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tax & Charges:</span>
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
          <div className="text-center text-[10px] text-slate-400 font-sans border-t border-dashed border-slate-300 pt-3">
            <p>Thank you for dining with RestoControl!</p>
            <p className="mt-0.5">Please retain this receipt for your records.</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
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
