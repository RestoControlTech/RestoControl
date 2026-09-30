/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ShoppingBag,
  Trash2,
  Receipt,
  ArrowRight,
  Plus,
  Minus,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { CartItem, Table, OrderStatus } from '../../types';
import { TABLES_DATA } from '../../data/mockData';
import { formatPrice } from '../../utils/format';
import { Button, Card, Badge } from '../ui';

export interface TicketPanelProps {
  cart: CartItem[];
  tables?: Table[];
  selectedTableId?: string;
  orderNote?: string;
  orderStatus?: OrderStatus;
  orderNumber?: string;
  orderSource?: string;
  isExistingOrder?: boolean;
  paymentStatus?: string;
  onTableChange?: (tableId: string) => void;
  onOrderNoteChange?: (note: string) => void;
  onIncreaseQuantity: (productId: string) => void;
  onDecreaseQuantity: (productId: string) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onProceedOrder?: () => void;
  className?: string;
}

export const TicketPanel: React.FC<TicketPanelProps> = ({
  cart,
  tables = TABLES_DATA,
  selectedTableId = 't1',
  orderNote = '',
  orderStatus = 'Draft',
  orderNumber,
  orderSource,
  isExistingOrder = false,
  paymentStatus,
  onTableChange,
  onOrderNoteChange,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onRemoveItem,
  onClearCart,
  onProceedOrder,
  className = '',
}) => {
  // Calculations (Tax = 0, Service Charge = 0 -> Total = Subtotal)
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const grandTotal = subtotal;

  // Validation Logic: Table selection is mandatory
  const isTableValid = Boolean(selectedTableId && selectedTableId.trim().length > 0);
  const canProceed = cart.length > 0 && isTableValid;

  // Find currently selected table object
  const activeTable = tables.find((t) => t.id === selectedTableId);

  return (
    <Card
      padding="none"
      className={`flex flex-col bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden ${className}`}
    >
      {/* Ticket Header with Order Status Badge */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-slate-900 text-xs tracking-tight">
                Current Ticket
              </h3>
              <Badge variant="slate" size="sm" className="font-black text-[9px] px-1.5 py-0 uppercase">
                {orderStatus}
              </Badge>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold">
              {activeTable ? activeTable.name : 'No Table Selected'}
            </p>
          </div>
        </div>

        {cart.length > 0 && (
          <Button
            variant="ghost"
            size="xs"
            onClick={onClearCart}
            icon={<Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />}
            className="text-slate-400 hover:text-red-600 font-bold"
            title="Clear all ticket items"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Order & Table Information Section */}
      <div className="p-3.5 bg-slate-50/40 border-b border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
            Order Information
          </span>
          {activeTable && (
            <span className="bg-orange-50 text-orange-700 text-[10px] font-black px-2 py-0.5 rounded-md border border-orange-200/60">
              {activeTable.name}
            </span>
          )}
        </div>

        {/* Existing Order Info Banner */}
        {isExistingOrder && (
          <div className="bg-orange-50 border border-orange-200/80 rounded-xl px-3 py-2 flex items-center justify-between text-[11px] font-bold text-orange-950 shadow-xs">
            <div className="flex items-center gap-1.5">
              <span className="bg-orange-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                {orderSource || 'QR'} ORDER
              </span>
              <span className="font-extrabold">{orderNumber}</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100/90 px-2 py-0.5 rounded">
              {paymentStatus || 'UNPAID'}
            </span>
          </div>
        )}

        {/* 1. Table Number Selection Field */}
        <div>
          <label
            htmlFor="pos-table-select"
            className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1"
          >
            Table Number <span className="text-orange-500">*</span>
          </label>
          <div className="relative">
            <select
              id="pos-table-select"
              value={selectedTableId}
              onChange={(e) => onTableChange?.(e.target.value)}
              className={`w-full bg-white border rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-colors cursor-pointer ${
                !selectedTableId
                  ? 'border-red-300 focus:ring-red-400 bg-red-50/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <option value="">Select a Table Number</option>
              {tables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name} ({table.section} · {table.seats} Seats)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2. Order Note Input */}
        <div>
          <label
            htmlFor="pos-order-note"
            className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1"
          >
            Order Note <span className="text-slate-300 font-normal lowercase">(optional)</span>
          </label>
          <div className="relative flex items-center">
            <input
              id="pos-order-note"
              type="text"
              value={orderNote}
              onChange={(e) => onOrderNoteChange?.(e.target.value)}
              placeholder="e.g. Extra spicy, no onions, allergies..."
              className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl pl-7 pr-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-colors"
            />
            <FileText className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Validation Alert (if no table selected) */}
        {!isTableValid && (
          <div
            id="table-validation-alert"
            className="flex items-center gap-2 p-2 rounded-xl bg-red-50 border border-red-100 text-red-700 text-[11px] font-bold"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
            <span>Please select a table number to proceed.</span>
          </div>
        )}
      </div>

      {/* Ticket Items List Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[180px] max-h-[380px]">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-10 text-center text-slate-400 select-none">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mb-2.5">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <p className="font-extrabold text-slate-700 text-xs">
              No items in ticket
            </p>
            <p className="text-[10px] text-slate-400 font-medium max-w-[200px] mt-0.5 leading-relaxed">
              Click on dishes from the catalog to add items to this order.
            </p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.productId}
              className="group flex items-center justify-between gap-2.5 p-2.5 rounded-2xl bg-slate-50/60 hover:bg-slate-50 border border-slate-100/60 transition-colors"
            >
              {/* Thumbnail + Name + Unit Price */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-10 h-10 rounded-xl object-cover bg-white shrink-0 border border-slate-100 shadow-xs"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-extrabold text-slate-800 text-xs truncate leading-snug">
                    {item.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                    {formatPrice(item.price)} each
                  </p>
                </div>
              </div>

              {/* Quantity Controls & Line Total */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Plus / Minus Step Controls */}
                <div className="flex items-center gap-1 bg-white border border-slate-200/80 rounded-lg p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => onDecreaseQuantity(item.productId)}
                    disabled={item.quantity <= 1}
                    className={`w-5 h-5 rounded flex items-center justify-center font-bold text-xs transition-all ${
                      item.quantity <= 1
                        ? 'text-slate-300 cursor-not-allowed opacity-50'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer active:scale-90'
                    }`}
                    title="Decrease quantity"
                  >
                    <Minus className="w-3 h-3" />
                  </button>

                  <span className="w-5 text-center text-xs font-black text-slate-800 tabular-nums">
                    {item.quantity}
                  </span>

                  <button
                    type="button"
                    onClick={() => onIncreaseQuantity(item.productId)}
                    className="w-5 h-5 rounded flex items-center justify-center font-bold text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer active:scale-90 transition-all"
                    title="Increase quantity"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Line Total */}
                <span className="font-black text-slate-900 text-xs w-14 text-right tabular-nums">
                  {formatPrice(item.lineTotal)}
                </span>

                {/* Delete / Remove Item Button */}
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.productId)}
                  className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Remove item from ticket"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Ticket Footer Calculations Summary (Subtotal & Total Due only - No Tax / Service Charge) */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/40 space-y-2">
        <div className="flex justify-between text-[11px] text-slate-500 font-bold">
          <span>Subtotal ({itemCount} items)</span>
          <span className="text-slate-800 tabular-nums">{formatPrice(subtotal)}</span>
        </div>

        <div className="border-t border-slate-100 pt-2 flex justify-between items-baseline">
          <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
            Total Due
          </span>
          <span className="font-black text-base text-slate-900 tabular-nums">
            {formatPrice(grandTotal)}
          </span>
        </div>

        {/* Action Button */}
        <Button
          variant="primary"
          size="md"
          fullWidth
          disabled={!canProceed}
          onClick={onProceedOrder}
          className="mt-2 font-black"
          iconRight={<ArrowRight className="w-4 h-4" />}
          title={
            !canProceed
              ? cart.length === 0
                ? 'Add items to cart to proceed'
                : 'Select a table number to proceed'
              : undefined
          }
        >
          {isExistingOrder
            ? `Take Payment (${formatPrice(grandTotal)})`
            : `Proceed to Order (${formatPrice(grandTotal)})`}
        </Button>
      </div>
    </Card>
  );
};

export default TicketPanel;
