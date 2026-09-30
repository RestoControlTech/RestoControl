/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  X,
  ShoppingBag,
  Clock,
  User,
  UtensilsCrossed,
  CreditCard,
  Receipt,
  ArrowLeft,
  FileText,
  DollarSign,
  CheckCircle,
} from 'lucide-react';
import { Order, OrderStatus, PaymentStatusType } from '../../types';
import { formatPrice, formatKHR, USD_TO_KHR_RATE } from '../../utils/format';
import { Button, Badge, BadgeVariant } from '../ui';

import { PermissionGate } from '../auth/PermissionGate';
import { Printer, Edit3 } from 'lucide-react';

export interface OrderDetailsModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onUpdateStatus?: (orderId: string, nextStatus: OrderStatus) => void;
  onPrintReceipt?: (order: Order) => void;
  onEditNote?: (order: Order) => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  order,
  onClose,
  onUpdateStatus,
  onPrintReceipt,
  onEditNote,
}) => {
  if (!isOpen || !order) return null;

  // Badge Variant Mappings for Order Status
  const getOrderStatusBadgeVariant = (status: OrderStatus | string): BadgeVariant => {
    switch (status) {
      case 'NEW':
      case 'Pending':
      case 'Draft':
        return 'amber';
      case 'PREPARING':
      case 'Preparing':
      case 'Cooking':
        return 'blue';
      case 'READY':
      case 'Ready':
        return 'emerald';
      case 'Served':
      case 'Completed':
      case 'COMPLETED':
        return 'slate';
      case 'Cancelled':
        return 'rose';
      default:
        return 'slate';
    }
  };

  // Badge Variant Mappings for Payment Status
  const getPaymentBadgeVariant = (payStatus: PaymentStatusType): BadgeVariant => {
    switch (payStatus) {
      case 'Paid':
        return 'emerald';
      case 'Pending':
      case 'Unpaid':
        return 'amber';
      case 'Refunded':
        return 'rose';
      default:
        return 'slate';
    }
  };

  const totalItemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const khrTotal = Math.round(order.total * USD_TO_KHR_RATE);

  const isTerminal = order.status === 'Completed' || order.status === 'Cancelled';

  return (
    <div
      id="order-details-modal-root"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden my-8 transition-all transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              title="Back to Order List"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-orange-400" />
                  <span>Order {order.orderNumber}</span>
                </h3>
                <Badge variant={getOrderStatusBadgeVariant(order.status)} size="xs" className="font-extrabold uppercase">
                  {order.status}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Submitted {order.dateTime}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onPrintReceipt && (
              <button
                type="button"
                onClick={() => onPrintReceipt(order)}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                title="Print Order Receipt"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Receipt</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              title="Close Order Details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Metadata Grid (Table, Customer, Order Type, Payment Status) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Table</p>
              <p className="text-sm font-black text-slate-900 mt-0.5 flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5 text-orange-500" />
                <span>{order.table}</span>
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer</p>
              <p className="text-sm font-black text-slate-900 mt-0.5 flex items-center gap-1 truncate">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{order.customer || 'Walk-in'}</span>
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order Type</p>
              <p className="text-sm font-black text-slate-900 mt-0.5 flex items-center gap-1">
                <UtensilsCrossed className="w-3.5 h-3.5 text-orange-500" />
                <span>{order.orderType}</span>
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Status</p>
              <div className="mt-1">
                <Badge variant={getPaymentBadgeVariant(order.paymentStatus)} size="xs" className="font-extrabold">
                  <CreditCard className="w-2.5 h-2.5 mr-1 inline" />
                  {order.paymentStatus}
                </Badge>
              </div>
            </div>
          </div>

          {/* Kitchen Note if present or Edit Note action */}
          <div className="bg-orange-50/80 border border-orange-100 p-3.5 rounded-2xl flex items-start justify-between gap-2.5 text-orange-900">
            <div className="flex items-start gap-2.5">
              <FileText className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black uppercase text-orange-600 tracking-wider">Kitchen Note</p>
                <p className="text-xs font-semibold text-orange-800 mt-0.5">
                  {order.note ? order.note : 'No special notes recorded.'}
                </p>
              </div>
            </div>

            {onEditNote && !isTerminal && (
              <PermissionGate permission="orders.update">
                <button
                  type="button"
                  onClick={() => onEditNote(order)}
                  className="p-1.5 bg-white hover:bg-orange-100 text-orange-700 rounded-xl border border-orange-200/80 text-[10px] font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 shadow-2xs"
                  title="Edit Kitchen Note"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit Note</span>
                </button>
              </PermissionGate>
            )}
          </div>

          {/* Ordered Products Itemized Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-extrabold text-slate-900 text-xs tracking-tight uppercase">
                Ordered Products ({totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'})
              </h4>
              <span className="text-[10px] font-bold text-slate-400">Unit Price & Line Totals</span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-white">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-2 bg-slate-50 p-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <div className="col-span-6">Product</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-right">Unit Price</div>
                <div className="col-span-2 text-right">Line Total</div>
              </div>

              {/* Items List */}
              {order.items.map((item, idx) => (
                <div key={item.id || idx} className="grid grid-cols-12 gap-2 p-3.5 items-center text-xs text-slate-800 font-bold hover:bg-slate-50/60 transition-colors">
                  <div className="col-span-6 font-extrabold text-slate-900 truncate">
                    {item.name}
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-2 py-0.5 rounded-md">
                      {item.quantity}x
                    </span>
                  </div>
                  <div className="col-span-2 text-right text-slate-500 font-semibold">
                    {formatPrice(item.unitPrice)}
                  </div>
                  <div className="col-span-2 text-right font-black text-slate-900">
                    {formatPrice(item.lineTotal)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment & Total Financial Breakdown */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
              <span>Subtotal</span>
              <span className="font-extrabold text-white">{formatPrice(order.total)}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
              <span>Tax & Service Charge</span>
              <span className="font-extrabold text-slate-400">$0.00</span>
            </div>
            <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-orange-400">Total Bill</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Rate: 1 USD = 4,100 KHR</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-white">{formatPrice(order.total)}</p>
                <p className="text-xs font-extrabold text-orange-300 mt-0.5">{formatKHR(khrTotal)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant={getOrderStatusBadgeVariant(order.status)} size="sm" className="font-black uppercase">
              Status: {order.status}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {onPrintReceipt && (
              <Button
                onClick={() => onPrintReceipt(order)}
                variant="outline"
                size="sm"
                icon={<Printer className="w-4 h-4" />}
              >
                Print Receipt
              </Button>
            )}

            {/* Status Transition Action Buttons */}
            {onUpdateStatus && order.status === 'Draft' && (
              <Button
                onClick={() => onUpdateStatus(order.id, 'Pending')}
                variant="subtle-orange"
                size="sm"
              >
                Submit Order
              </Button>
            )}
            {onUpdateStatus && (order.status === 'Pending' || order.status === 'NEW') && (
              <Button
                onClick={() => onUpdateStatus(order.id, 'Preparing')}
                variant="subtle-orange"
                size="sm"
              >
                Start Preparing
              </Button>
            )}
            {onUpdateStatus && (order.status === 'Preparing' || order.status === 'PREPARING' || order.status === 'Cooking') && (
              <Button
                onClick={() => onUpdateStatus(order.id, 'Ready')}
                variant="success"
                size="sm"
              >
                Mark Ready
              </Button>
            )}
            {onUpdateStatus && (order.status === 'Ready' || order.status === 'READY' || order.status === 'Served') && (
              <Button
                onClick={() => onUpdateStatus(order.id, 'Completed')}
                variant="secondary"
                size="sm"
              >
                Complete Order
              </Button>
            )}

            {/* Cancel / Void Order Action - Admin Protected via PermissionGate */}
            {onUpdateStatus && !isTerminal && (
              <PermissionGate permission="orders.cancel">
                <Button
                  onClick={() => onUpdateStatus(order.id, 'Cancelled')}
                  variant="danger"
                  size="sm"
                >
                  Cancel Order
                </Button>
              </PermissionGate>
            )}

            <Button
              onClick={onClose}
              variant="dark"
              size="sm"
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
