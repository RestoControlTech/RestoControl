/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { RotateCcw, AlertTriangle, AlertCircle, ShoppingBag } from 'lucide-react';
import { Transaction } from '../../types';
import { Modal, Button, Badge } from '../ui';
import { formatPrice } from '../../utils/format';
import {
  getFullRefundAmount,
  getFullRefundQuantity,
  canApplyFullRefund,
} from '../../utils/refundUtils';

export interface FullRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Transaction | null;
  onConfirm?: (sale: Transaction, reason?: string) => boolean | void;
  errorMessage?: string | null;
}

export const FullRefundModal: React.FC<FullRefundModalProps> = ({
  isOpen,
  onClose,
  sale,
  onConfirm,
  errorMessage,
}) => {
  if (!isOpen || !sale) return null;

  const currency = sale.currency || 'USD';
  const originalAmount = typeof sale.amount === 'number' ? sale.amount : 0;
  const alreadyRefundedAmount = typeof sale.refundedAmount === 'number' ? sale.refundedAmount : 0;
  const remainingRefundableAmount = getFullRefundAmount(originalAmount, alreadyRefundedAmount);
  const isEligible = canApplyFullRefund(originalAmount, alreadyRefundedAmount) && remainingRefundableAmount > 0;

  const [reason, setReason] = useState<string>('Customer Request — Full Refund');

  // Reset reason when modal opens
  useEffect(() => {
    if (isOpen) {
      setReason('Customer Request — Full Refund');
    }
  }, [isOpen, sale.id]);

  const handleConfirm = () => {
    if (!isEligible) return;
    if (onConfirm) {
      const result = onConfirm(sale, reason.trim() || undefined);
      if (result === false) return;
    }
    onClose();
  };

  const items = sale.items || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Full Refund — Order ${sale.orderNumber}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Error Alert if provided */}
        {errorMessage && (
          <div
            id="full-refund-error-banner"
            className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Warning / Informational Callout */}
        {isEligible ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-bold">Full Refund Confirmation</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                This will refund the entire remaining refundable amount ({formatPrice(remainingRefundableAmount, currency)}).
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-slate-500" />
            <span className="font-semibold">
              This sale has already been fully refunded. No remaining refundable balance available.
            </span>
          </div>
        )}

        {/* 1. Sale / Order Details Header */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Order Number
            </span>
            <span className="font-extrabold text-slate-800" id="full-refund-order-number">
              {sale.orderNumber}
            </span>
            {sale.customerName && (
              <span className="text-slate-500 font-semibold block text-[11px]">
                {sale.customerName} • {sale.table}
              </span>
            )}
          </div>
          <div>
            {isEligible ? (
              <Badge variant="emerald" size="sm" className="font-bold text-[10px]">
                Refund Eligible
              </Badge>
            ) : (
              <Badge variant="slate" size="sm" className="font-extrabold text-[10px]">
                Fully Refunded
              </Badge>
            )}
          </div>
        </div>

        {/* 2. Item Name(s) Being Refunded */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block px-1">
            Items to Refund
          </span>
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-white text-xs">
            {items.length > 0 ? (
              items.map((item, idx) => {
                const remQty = getFullRefundQuantity(item.quantity, item.refundedQuantity);
                const isFullyRef = remQty === 0;

                return (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <ShoppingBag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <div className="truncate">
                        <span className="font-bold text-slate-800 block truncate">{item.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          @ {formatPrice(item.unitPrice, currency)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {isFullyRef ? (
                        <span className="text-[10px] font-bold text-slate-400">0 remaining (Refunded)</span>
                      ) : (
                        <span className="font-mono font-bold text-slate-800 text-xs">
                          Refund {remQty} of {item.quantity}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-slate-500 font-semibold text-xs">
                {sale.itemSummary || 'All order items'}
              </div>
            )}
          </div>
        </div>

        {/* 3, 4, 5. Financial Summary Breakdown Cards */}
        <div className="grid grid-cols-3 gap-2">
          {/* 3. Original Amount */}
          <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-2.5 text-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
              Original Amount
            </span>
            <span className="text-sm font-black font-mono text-slate-800" id="original-amount">
              {formatPrice(originalAmount, currency)}
            </span>
          </div>

          {/* 4. Already Refunded Amount */}
          <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-2.5 text-center">
            <span className="text-[9px] font-black text-rose-500 uppercase tracking-wider block">
              Already Refunded
            </span>
            <span className="text-sm font-black font-mono text-rose-600" id="already-refunded-amount">
              {formatPrice(alreadyRefundedAmount, currency)}
            </span>
          </div>

          {/* 5. Remaining Refundable Amount */}
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-2.5 text-center">
            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider block">
              Remaining
            </span>
            <span className="text-sm font-black font-mono text-emerald-700" id="remaining-refundable-amount">
              {formatPrice(remainingRefundableAmount, currency)}
            </span>
          </div>
        </div>

        {/* 6. Full Refund Amount (Prominent Banner) */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Full Refund Amount
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">
              Entire remaining refundable balance
            </span>
          </div>
          <div className="text-right">
            <span
              id="full-refund-amount"
              className={`text-base font-black font-mono ${isEligible ? 'text-rose-600' : 'text-slate-300'}`}
            >
              -{formatPrice(remainingRefundableAmount, currency)}
            </span>
          </div>
        </div>

        {/* 7. Optional Refund Reason */}
        <div className="space-y-1">
          <label
            htmlFor="full-refund-reason-input"
            className="text-[10px] font-black text-slate-400 uppercase tracking-wider block"
          >
            Refund Reason (Optional)
          </label>
          <input
            type="text"
            id="full-refund-reason-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={!isEligible}
            placeholder="e.g., Customer dissatisfaction, entire order cancelled..."
            className="w-full text-xs font-semibold text-slate-800 px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* 8 & 9. Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          {/* 8. Cancel Button */}
          <Button variant="secondary" size="md" onClick={onClose} id="cancel-full-refund-btn">
            Cancel
          </Button>

          {/* 9. Confirm Full Refund Button */}
          <Button
            variant="primary"
            size="md"
            id="confirm-full-refund-btn"
            onClick={handleConfirm}
            disabled={!isEligible}
            icon={<RotateCcw className="w-4 h-4" />}
            className="bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirm Full Refund ({formatPrice(remainingRefundableAmount, currency)})
          </Button>
        </div>
      </div>
    </Modal>
  );
};
