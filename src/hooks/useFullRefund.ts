/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import { Transaction } from '../types';
import { applyFullRefundToSale } from '../utils/refundRules';

export interface UseFullRefundOptions {
  onRefundSuccess?: (refundTx: Transaction, updatedSale: Transaction) => void;
  onError?: (error: string) => void;
}

export function useFullRefund(options?: UseFullRefundOptions) {
  const [saleToFullRefund, setSaleToFullRefund] = useState<Transaction | null>(null);
  const [isFullRefundModalOpen, setIsFullRefundModalOpen] = useState<boolean>(false);
  const [fullRefundError, setFullRefundError] = useState<string | null>(null);

  const openFullRefundModal = useCallback((sale: Transaction) => {
    setSaleToFullRefund(sale);
    setFullRefundError(null);
    setIsFullRefundModalOpen(true);
  }, []);

  const closeFullRefundModal = useCallback(() => {
    setIsFullRefundModalOpen(false);
    setSaleToFullRefund(null);
    setFullRefundError(null);
  }, []);

  const handleConfirmFullRefund = useCallback(
    (sale: Transaction, reason?: string): boolean => {
      try {
        setFullRefundError(null);
        const { updatedSale, refundTransaction } = applyFullRefundToSale(sale, reason);

        if (options?.onRefundSuccess) {
          options.onRefundSuccess(refundTransaction, updatedSale);
        }

        closeFullRefundModal();
        return true;
      } catch (err: any) {
        const errorMsg = err?.message || 'Failed to process full refund.';
        setFullRefundError(errorMsg);
        if (options?.onError) {
          options.onError(errorMsg);
        }
        return false;
      }
    },
    [options, closeFullRefundModal]
  );

  return {
    saleToFullRefund,
    isFullRefundModalOpen,
    fullRefundError,
    openFullRefundModal,
    closeFullRefundModal,
    handleConfirmFullRefund,
  };
}
