/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Banknote,
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Receipt,
  DollarSign,
  Printer,
} from 'lucide-react';
import { OrderDraft, PaymentMethod, PaymentStatus, PaymentCurrency, PaymentConfirmation } from '../../types';
import { formatPrice, formatKHR, formatCurrency, USD_TO_KHR_RATE } from '../../utils/format';
import { Modal, Button, Badge } from '../ui';

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderDraft: OrderDraft;
  onPaymentSuccess?: (confirmation: PaymentConfirmation) => void;
  onResetOrder?: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  orderDraft,
  onPaymentSuccess,
  onResetOrder,
}) => {
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [currency, setCurrency] = useState<PaymentCurrency>('USD');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [confirmation, setConfirmation] = useState<PaymentConfirmation | null>(null);

  // Calculate amount due based on selected currency
  const isKHR = currency === 'KHR';
  const dueAmount = isKHR
    ? Math.round(orderDraft.total * USD_TO_KHR_RATE)
    : orderDraft.total;

  // Initialize cash received when modal opens or currency/total changes
  useEffect(() => {
    if (isOpen) {
      setCashReceived('');
      setStatus('idle');
      setConfirmation(null);
    }
  }, [isOpen]);

  const numCashReceived = parseFloat(cashReceived) || 0;
  const isCash = method === 'cash';

  // Cash Validation calculations
  const isCashEmpty = isCash && cashReceived.trim() === '';
  const isCashInvalid = isCash && !isCashEmpty && (numCashReceived <= 0 || isNaN(numCashReceived));
  const isInsufficientCash = isCash && !isCashEmpty && !isCashInvalid && numCashReceived < dueAmount;
  const change = Math.max(0, numCashReceived - dueAmount);

  // Overall Payment Validation
  const hasItems = orderDraft.items.length > 0;
  const hasValidTotal = orderDraft.total > 0;
  const isPaymentValid =
    hasItems &&
    hasValidTotal &&
    (!isCash || (!isCashEmpty && !isCashInvalid && !isInsufficientCash));

  // Handle switching currency (clean input)
  const handleCurrencyChange = (newCurrency: PaymentCurrency) => {
    setCurrency(newCurrency);
    setCashReceived('');
  };

  // Handle mock payment confirmation
  const handleConfirmPayment = () => {
    if (!isPaymentValid) return;

    setStatus('processing');

    const tempOrderNum = orderDraft.orderNumber || `#1027`;
    const confirmData: PaymentConfirmation = {
      orderNumber: tempOrderNum,
      method,
      currency,
      amount: orderDraft.total,
      currencyAmount: dueAmount,
      cashReceived: isCash ? numCashReceived : undefined,
      change: isCash ? change : undefined,
      tableName: orderDraft.tableName,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setConfirmation(confirmData);
    setStatus('success');
    onPaymentSuccess?.(confirmData);
  };

  // Handle closing modal (Cancel flow: keeps cart and draft intact)
  const handleCancel = () => {
    setStatus('idle');
    setConfirmation(null);
    onClose();
  };

  // Handle new order after success
  const handleNewOrder = () => {
    setStatus('idle');
    setConfirmation(null);
    onResetOrder?.();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={status === 'success' ? 'Payment Completed' : 'POS Checkout & Payment'}
      subtitle={
        status === 'success'
          ? 'Transaction recorded locally'
          : `Table: ${orderDraft.tableName || 'N/A'}`
      }
      maxWidth="lg"
    >
      {status === 'success' && confirmation ? (
        /* ==================== SUCCESS STATE ==================== */
        <div id="payment-success-view" className="space-y-6 py-2">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Payment Successful
              </span>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
                {formatCurrency(confirmation.currencyAmount, confirmation.currency)}
              </h2>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                Paid via {confirmation.method.toUpperCase()} ({confirmation.currency}) · Reference {confirmation.orderNumber}
              </p>
            </div>
          </div>

          {/* Receipt Summary Card */}
          <div
            id="printable-receipt"
            className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3 font-mono text-xs select-text"
          >
            {/* Branding Header */}
            <div className="text-center border-b border-dashed border-slate-300 pb-2 space-y-0.5">
              <h3 className="font-sans font-black text-sm text-slate-900 tracking-tight uppercase">
                RestoControl POS
              </h3>
              <p className="text-[10px] text-slate-500 font-sans">
                Station Payment Receipt
              </p>
            </div>

            {/* Metadata */}
            <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Order Ref:</span>
                <span className="font-extrabold text-slate-900">{confirmation.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date/Time:</span>
                <span>{confirmation.timestamp}</span>
              </div>
              {orderDraft.tableName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Table:</span>
                  <span className="font-extrabold text-slate-800">{orderDraft.tableName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-extrabold text-slate-800 uppercase">{confirmation.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Currency:</span>
                <span className="font-extrabold text-slate-800">{confirmation.currency === 'KHR' ? 'KHR (៛)' : 'USD ($)'}</span>
              </div>

              {confirmation.currency === 'KHR' && (
                <div className="flex justify-between text-slate-400 text-[10px]">
                  <span>Exchange Rate:</span>
                  <span>1 USD = {USD_TO_KHR_RATE.toLocaleString()} KHR</span>
                </div>
              )}
            </div>

            {/* Itemized list if present */}
            {orderDraft.items && orderDraft.items.length > 0 && (
              <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-2.5">
                <div className="grid grid-cols-12 font-bold text-[10px] uppercase text-slate-400 pb-1 border-b border-slate-100">
                  <div className="col-span-5">Item</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-2 text-right">Price</div>
                  <div className="col-span-3 text-right">Total</div>
                </div>
                {orderDraft.items.map((item, idx) => (
                  <div key={item.id || idx} className="grid grid-cols-12 text-[11px] leading-tight">
                    <div className="col-span-5 font-bold truncate pr-1 text-slate-900">{item.name}</div>
                    <div className="col-span-2 text-center font-bold text-slate-600">x{item.quantity}</div>
                    <div className="col-span-2 text-right text-slate-500">{formatPrice(item.unitPrice)}</div>
                    <div className="col-span-3 text-right font-bold text-slate-900">{formatPrice(item.lineTotal)}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Financial Details */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between font-bold text-slate-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(confirmation.currencyAmount, confirmation.currency)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                <span>TOTAL:</span>
                <span>{formatCurrency(confirmation.currencyAmount, confirmation.currency)}</span>
              </div>

              {confirmation.method === 'cash' && (
                <>
                  <div className="border-t border-dashed border-slate-200 pt-1.5 flex justify-between font-bold text-slate-600">
                    <span>Amount Received:</span>
                    <span className="font-black text-slate-900">
                      {formatCurrency(confirmation.cashReceived || 0, confirmation.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-700">
                    <span>Change Returned:</span>
                    <span className="font-black text-emerald-600 text-sm">
                      {formatCurrency(confirmation.change || 0, confirmation.currency)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-slate-400 font-sans border-t border-dashed border-slate-300 pt-2">
              <p>Thank you for your visit!</p>
              <p className="mt-0.5">Please retain this receipt for your records.</p>
            </div>
          </div>

          {/* Action Buttons - Hidden during print */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 no-print">
            <Button
              variant="outline"
              size="md"
              onClick={() => window.print()}
              icon={<Printer className="w-4 h-4" />}
            >
              Print Receipt
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleNewOrder}
              iconRight={<RotateCcw className="w-4 h-4" />}
            >
              New Order
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={handleCancel}
            >
              Back to POS
            </Button>
          </div>
        </div>
      ) : (
        /* ==================== ACTIVE PAYMENT FLOW ==================== */
        <div id="payment-checkout-view" className="space-y-5">
          {/* Order Summary Card (Subtotal & Total Amount Due Only - No Tax / Service Charge) */}
          <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60 text-xs">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-orange-500" />
                <span className="font-extrabold text-slate-700">
                  Order Summary ({orderDraft.items.length} items)
                </span>
              </div>
              <Badge variant="orange" size="xs">
                {orderDraft.tableName || 'Table'}
              </Badge>
            </div>

            <div className="flex justify-between text-xs font-bold text-slate-600">
              <span>Subtotal</span>
              <span className="tabular-nums font-black text-slate-800">
                {formatCurrency(dueAmount, currency)}
              </span>
            </div>

            <div className="border-t border-slate-200/80 pt-2 flex items-baseline justify-between">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Total Amount Due
              </span>
              <div className="text-right">
                <span className="text-2xl font-black text-slate-900 tracking-tight tabular-nums block">
                  {formatCurrency(dueAmount, currency)}
                </span>
                {isKHR && (
                  <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                    ({formatPrice(orderDraft.total)} @ {USD_TO_KHR_RATE.toLocaleString()} KHR/USD)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 1. Currency Selection Row */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                Payment Currency
              </label>
              <span className="text-[10px] font-bold text-slate-400">
                Rate: 1 USD = {USD_TO_KHR_RATE.toLocaleString()} KHR
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 bg-slate-100/80 p-1 rounded-xl">
              <button
                type="button"
                id="currency-select-usd"
                onClick={() => handleCurrencyChange('USD')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  currency === 'USD'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>USD ($)</span>
              </button>

              <button
                type="button"
                id="currency-select-khr"
                onClick={() => handleCurrencyChange('KHR')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  currency === 'KHR'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="font-serif font-black text-orange-600 text-sm leading-none">៛</span>
                <span>KHR (៛ Riel)</span>
              </button>
            </div>
          </div>

          {/* 2. Payment Method Selector */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Cash Option */}
              <button
                type="button"
                id="payment-method-cash"
                onClick={() => setMethod('cash')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  method === 'cash'
                    ? 'border-orange-500 bg-orange-50/40 text-orange-700 shadow-xs ring-1 ring-orange-400/50'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                }`}
              >
                <Banknote className="w-5 h-5 mb-1 text-orange-600" />
                <span className="text-xs font-black">Cash</span>
                <span className="text-[9px] text-slate-400 font-bold mt-0.5">Physical Bill</span>
              </button>

              {/* Card Option */}
              <button
                type="button"
                id="payment-method-card"
                onClick={() => setMethod('card')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  method === 'card'
                    ? 'border-orange-500 bg-orange-50/40 text-orange-700 shadow-xs ring-1 ring-orange-400/50'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                }`}
              >
                <CreditCard className="w-5 h-5 mb-1 text-orange-600" />
                <span className="text-xs font-black">Card</span>
                <span className="text-[9px] text-slate-400 font-bold mt-0.5">Debit / Credit</span>
              </button>

              {/* QR Option */}
              <button
                type="button"
                id="payment-method-qr"
                onClick={() => setMethod('qr')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  method === 'qr'
                    ? 'border-orange-500 bg-orange-50/40 text-orange-700 shadow-xs ring-1 ring-orange-400/50'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                }`}
              >
                <QrCode className="w-5 h-5 mb-1 text-orange-600" />
                <span className="text-xs font-black">QR Pay</span>
                <span className="text-[9px] text-slate-400 font-bold mt-0.5">KHQR / Scan</span>
              </button>
            </div>
          </div>

          {/* 3. Payment Method Specific Body */}
          <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-4 space-y-3">
            {isCash && (
              /* Cash Calculation Area */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="cash-received-input" className="text-xs font-extrabold text-slate-700">
                    Amount Received ({currency})
                  </label>
                  <span className="text-[11px] font-bold text-slate-400">
                    Due: <strong className="text-slate-900">{formatCurrency(dueAmount, currency)}</strong>
                  </span>
                </div>

                <div className="relative flex items-center">
                  <span className="absolute left-3.5 font-black text-slate-400 text-sm pointer-events-none">
                    {currency === 'KHR' ? '៛' : '$'}
                  </span>
                  <input
                    id="cash-received-input"
                    type="number"
                    step={isKHR ? '100' : '0.01'}
                    min="0"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder={isKHR ? 'e.g. 50000' : 'e.g. 20.00'}
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent tabular-nums"
                  />
                </div>

                {/* Validation Messages & Change Due Display */}
                <div className="pt-2 border-t border-slate-200/60">
                  {isCashEmpty ? (
                    <p className="text-[11px] font-bold text-slate-400">
                      Enter the cash amount received from the customer.
                    </p>
                  ) : isCashInvalid ? (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-red-50 border border-red-200/60 text-red-700 text-xs font-bold">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <span>Enter a valid payment amount.</span>
                    </div>
                  ) : isInsufficientCash ? (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-800 text-xs font-bold">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Insufficient payment (Short by{' '}
                        {formatCurrency(dueAmount - numCashReceived, currency)})
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-between bg-emerald-50/60 border border-emerald-100 rounded-xl p-3">
                      <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wide">
                        Change Due
                      </span>
                      <span className="text-xl font-black text-emerald-600 tabular-nums">
                        {formatCurrency(change, currency)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {method === 'card' && (
              /* Card Terminal Mock */
              <div className="text-center py-4 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 mx-auto">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-black text-slate-900">Card Payment Terminal</h4>
                <p className="text-[11px] text-slate-500 font-medium max-w-xs mx-auto">
                  Charge customer <strong className="text-slate-900">{formatCurrency(dueAmount, currency)}</strong> on the POS terminal. Click confirm below once authorized.
                </p>
              </div>
            )}

            {method === 'qr' && (
              /* QR Code Mock */
              <div className="text-center py-3 space-y-2">
                <div className="w-28 h-28 bg-white border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center mx-auto p-2 shadow-xs">
                  <QrCode className="w-16 h-16 text-slate-800" />
                  <span className="text-[8px] font-black tracking-widest text-slate-400 mt-1 uppercase">
                    Scan to Pay
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">
                    Scan with Mobile Banking App
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Total Amount: <strong className="text-slate-900">{formatCurrency(dueAmount, currency)}</strong>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Validation Warning if Cart is Empty */}
          {!hasItems && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-bold">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>Cart is empty. Add dishes to ticket to proceed.</span>
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Button
              variant="secondary"
              size="md"
              onClick={handleCancel}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              size="md"
              disabled={!isPaymentValid}
              onClick={handleConfirmPayment}
              iconRight={<ArrowRight className="w-4 h-4" />}
            >
              Confirm Payment ({formatCurrency(dueAmount, currency)})
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default PaymentModal;
