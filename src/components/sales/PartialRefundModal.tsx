/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { RotateCcw, AlertCircle, ShoppingBag } from 'lucide-react';
import { Transaction, SaleItem, RefundRequest } from '../../types';
import { Modal, Button, Badge } from '../ui';
import { formatPrice } from '../../utils/format';
import {
  getRefundableQuantity,
  calculatePartialRefundAmount,
  validatePartialRefundQuantity,
} from '../../utils/refundUtils';

export interface PartialRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale?: Transaction | null;
  item?: SaleItem | null;
  onConfirmRefund?: (sale: Transaction, request: RefundRequest) => void;
  onConfirm?: (item: SaleItem, quantity: number, reason: string) => void;
}

export const PartialRefundModal: React.FC<PartialRefundModalProps> = ({
  isOpen,
  onClose,
  sale,
  item: initialItem,
  onConfirmRefund,
  onConfirm,
}) => {
  // If neither sale nor item is provided, nothing to display
  if (!isOpen || (!sale && !initialItem)) return null;

  const currency = sale?.currency || 'USD';
  const availableItems: SaleItem[] = useMemo(() => {
    if (initialItem) return [initialItem];
    return sale?.items && sale.items.length > 0 ? sale.items : [];
  }, [sale, initialItem]);

  // Selected item state (defaults to initialItem or the first item)
  const [selectedItemName, setSelectedItemName] = useState<string>(
    initialItem?.name || availableItems[0]?.name || ''
  );

  // Form input states
  const [quantityInput, setQuantityInput] = useState<string>('1');
  const [reason, setReason] = useState<string>('Customer Request / Return');

  // Sync / Reset state when modal opens or item/sale changes
  useEffect(() => {
    if (isOpen) {
      const defaultItem = initialItem || availableItems[0];
      if (defaultItem) {
        setSelectedItemName(defaultItem.name);
        const rem = getRefundableQuantity(defaultItem.quantity, defaultItem.refundedQuantity);
        setQuantityInput(rem > 0 ? '1' : '0');
      }
      setReason('Customer Request / Return');
    }
  }, [isOpen, initialItem, availableItems]);

  // Find currently active item
  const activeItem = useMemo(() => {
    return availableItems.find((i) => i.name === selectedItemName) || availableItems[0] || null;
  }, [availableItems, selectedItemName]);

  // Calculations using pure refundUtils
  const originalQuantity = activeItem?.quantity || 0;
  const alreadyRefunded = typeof activeItem?.refundedQuantity === 'number' ? activeItem.refundedQuantity : 0;
  const remainingQuantity = getRefundableQuantity(originalQuantity, alreadyRefunded);

  const numericQuantity = parseInt(quantityInput, 10);
  const validation = validatePartialRefundQuantity(
    Number.isNaN(numericQuantity) ? null : numericQuantity,
    remainingQuantity
  );

  const refundAmount = calculatePartialRefundAmount(
    activeItem?.unitPrice || 0,
    validation.isValid ? numericQuantity : 0
  );

  // Stepper handlers
  const handleStep = (delta: number) => {
    const current = Number.isNaN(numericQuantity) ? 0 : numericQuantity;
    const next = Math.max(1, Math.min(remainingQuantity, current + delta));
    setQuantityInput(String(next));
  };

  const handleConfirm = () => {
    if (!validation.isValid || !activeItem) return;

    if (onConfirmRefund && sale) {
      onConfirmRefund(sale, {
        items: [
          {
            name: activeItem.name,
            quantity: numericQuantity,
            unitPrice: activeItem.unitPrice,
          },
        ],
        reason: reason.trim() || undefined,
      });
    }

    if (onConfirm) {
      onConfirm(activeItem, numericQuantity, reason.trim());
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={sale ? `Partial Refund — Order ${sale.orderNumber}` : 'Partial Refund'}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Item Selector (if sale has multiple items and no specific item was forced) */}
        {!initialItem && availableItems.length > 1 && (
          <div className="space-y-1">
            <label
              htmlFor="refund-item-select"
              className="text-[10px] font-black text-slate-400 uppercase tracking-wider block"
            >
              Select Item to Refund
            </label>
            <select
              id="refund-item-select"
              value={selectedItemName}
              onChange={(e) => {
                const nextName = e.target.value;
                setSelectedItemName(nextName);
                const target = availableItems.find((i) => i.name === nextName);
                if (target) {
                  const rem = getRefundableQuantity(target.quantity, target.refundedQuantity);
                  setQuantityInput(rem > 0 ? '1' : '0');
                }
              }}
              className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500"
            >
              {availableItems.map((itm) => {
                const rem = getRefundableQuantity(itm.quantity, itm.refundedQuantity);
                return (
                  <option key={itm.name} value={itm.name}>
                    {itm.name} ({rem} remaining @ {formatPrice(itm.unitPrice, currency)})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* 1. Product / Item Name Header */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-black text-slate-800 truncate" id="refund-item-name">
                {activeItem?.name || 'Selected Item'}
              </h4>
              <p className="text-[11px] font-mono text-slate-500">
                Unit Price: {formatPrice(activeItem?.unitPrice || 0, currency)}
              </p>
            </div>
          </div>
          {remainingQuantity === 0 ? (
            <Badge variant="slate" size="sm" className="font-extrabold text-[10px]">
              Fully Refunded
            </Badge>
          ) : (
            <Badge variant="emerald" size="sm" className="font-bold text-[10px]">
              {remainingQuantity} Available
            </Badge>
          )}
        </div>

        {/* 2, 3, 4. Quantities Breakdown */}
        <div className="grid grid-cols-3 gap-2">
          {/* Original Quantity */}
          <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-2.5 text-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
              Original Qty
            </span>
            <span className="text-sm font-black font-mono text-slate-800" id="original-quantity">
              {originalQuantity}
            </span>
          </div>

          {/* Already Refunded Quantity */}
          <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-2.5 text-center">
            <span className="text-[9px] font-black text-rose-500 uppercase tracking-wider block">
              Already Refunded
            </span>
            <span className="text-sm font-black font-mono text-rose-600" id="refunded-quantity">
              {alreadyRefunded}
            </span>
          </div>

          {/* Remaining Refundable Quantity */}
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-2.5 text-center">
            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider block">
              Remaining
            </span>
            <span className="text-sm font-black font-mono text-emerald-700" id="remaining-quantity">
              {remainingQuantity}
            </span>
          </div>
        </div>

        {/* 5. Quantity Input & Stepper */}
        <div className="space-y-1.5">
          <label
            htmlFor="partial-refund-qty-input"
            className="text-[10px] font-black text-slate-400 uppercase tracking-wider block"
          >
            Quantity to Refund
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="refund-qty-decrement"
              onClick={() => handleStep(-1)}
              disabled={remainingQuantity <= 0 || numericQuantity <= 1}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-base"
              aria-label="Decrease quantity"
            >
              -
            </button>
            <input
              type="number"
              id="partial-refund-qty-input"
              value={quantityInput}
              min="1"
              max={remainingQuantity}
              disabled={remainingQuantity <= 0}
              onChange={(e) => setQuantityInput(e.target.value)}
              className="flex-1 text-center font-mono font-black text-slate-900 text-base py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              id="refund-qty-increment"
              onClick={() => handleStep(1)}
              disabled={remainingQuantity <= 0 || numericQuantity >= remainingQuantity}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-base"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        {/* Validation Error Message */}
        {!validation.isValid && (
          <div
            id="partial-refund-error"
            className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold animate-fade-in"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{validation.error}</span>
          </div>
        )}

        {/* 6. Refund Amount Display */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Refund Amount
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">
              {validation.isValid ? `${numericQuantity} × ${formatPrice(activeItem?.unitPrice || 0, currency)}` : 'Invalid quantity'}
            </span>
          </div>
          <div className="text-right">
            <span
              id="calculated-refund-amount"
              className={`text-base font-black font-mono ${validation.isValid ? 'text-rose-600' : 'text-slate-300'}`}
            >
              -{formatPrice(refundAmount, currency)}
            </span>
          </div>
        </div>

        {/* 7. Refund Reason (Optional) */}
        <div className="space-y-1">
          <label
            htmlFor="refund-reason-input"
            className="text-[10px] font-black text-slate-400 uppercase tracking-wider block"
          >
            Refund Reason (Optional)
          </label>
          <input
            type="text"
            id="refund-reason-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Customer return, wrong dish, quality issue..."
            className="w-full text-xs font-semibold text-slate-800 px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-500"
          />
        </div>

        {/* 8 & 9. Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          {/* 8. Cancel Button */}
          <Button variant="secondary" size="md" onClick={onClose} id="cancel-refund-btn">
            Cancel
          </Button>

          {/* 9. Continue / Refund Button */}
          <Button
            variant="primary"
            size="md"
            id="confirm-refund-btn"
            onClick={handleConfirm}
            disabled={!validation.isValid}
            icon={<RotateCcw className="w-4 h-4" />}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            Refund {formatPrice(refundAmount, currency)}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
