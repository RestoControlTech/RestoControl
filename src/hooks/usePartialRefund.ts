/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import { Transaction, SaleItem, RefundRequest } from '../types';
import { applyPartialRefundToSale } from '../utils/refundRules';

export interface UsePartialRefundOptions {
  onRefundSuccess?: (refundTx: Transaction, updatedSale: Transaction) => void;
}

export function usePartialRefund(options?: UsePartialRefundOptions) {
  const [saleToRefund, setSaleToRefund] = useState<Transaction | null>(null);
  const [itemToRefund, setItemToRefund] = useState<SaleItem | null>(null);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState<boolean>(false);

  const openRefundModal = useCallback((sale: Transaction, item?: SaleItem | null) => {
    setSaleToRefund(sale);
    setItemToRefund(item || null);
    setIsRefundModalOpen(true);
  }, []);

  const closeRefundModal = useCallback(() => {
    setIsRefundModalOpen(false);
    setSaleToRefund(null);
    setItemToRefund(null);
  }, []);

  const handleConfirmRefund = useCallback(
    (sale: Transaction, request: RefundRequest) => {
      const { updatedSale, refundTransaction } = applyPartialRefundToSale(sale, request);

      if (options?.onRefundSuccess) {
        options.onRefundSuccess(refundTransaction, updatedSale);
      }

      closeRefundModal();
      return { updatedSale, refundTransaction };
    },
    [options, closeRefundModal]
  );

  return {
    saleToRefund,
    itemToRefund,
    isRefundModalOpen,
    openRefundModal,
    closeRefundModal,
    handleConfirmRefund,
  };
}
