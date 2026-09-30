/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Transaction } from '../../types';
import { filterSales } from '../../utils/salesFilters';
import {
  SaleDetailModal,
  SaleReceiptModal,
  SalesFilters,
  PartialRefundModal,
  FullRefundModal,
  SalesTable,
} from '../../components/sales';
import { usePartialRefund } from '../../hooks/usePartialRefund';
import { useFullRefund } from '../../hooks/useFullRefund';

interface SalesProps {
  transactions: Transaction[];
  searchQuery?: string;
  onRefundSale?: (refundTx: Transaction, updatedSale: Transaction) => void;
}

export default function Sales({
  transactions,
  searchQuery: externalSearch = '',
  onRefundSale,
}: SalesProps) {
  const [localSales, setLocalSales] = useState<Transaction[]>(transactions);
  const [activeDateTab, setActiveDateTab] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [localSearch, setLocalSearch] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [receiptToView, setReceiptToView] = useState<Transaction | null>(null);

  // Synchronize if prop changes from parent
  React.useEffect(() => {
    setLocalSales(transactions);
  }, [transactions]);

  // Hook managing partial refund modal state and execution
  const {
    saleToRefund,
    itemToRefund,
    isRefundModalOpen,
    openRefundModal,
    closeRefundModal,
    handleConfirmRefund,
  } = usePartialRefund({
    onRefundSuccess: (refundTransaction, updatedSale) => {
      setLocalSales((prev) => [
        refundTransaction,
        ...prev.map((t) => (t.id === updatedSale.id ? updatedSale : t)),
      ]);
      if (selectedTx && selectedTx.id === updatedSale.id) {
        setSelectedTx(updatedSale);
      }
      if (onRefundSale) {
        onRefundSale(refundTransaction, updatedSale);
      }
    },
  });

  // Hook managing full refund modal state and execution
  const {
    saleToFullRefund,
    isFullRefundModalOpen,
    fullRefundError,
    openFullRefundModal,
    closeFullRefundModal,
    handleConfirmFullRefund,
  } = useFullRefund({
    onRefundSuccess: (refundTransaction, updatedSale) => {
      setLocalSales((prev) => [
        refundTransaction,
        ...prev.map((t) => (t.id === updatedSale.id ? updatedSale : t)),
      ]);
      if (selectedTx && selectedTx.id === updatedSale.id) {
        setSelectedTx(updatedSale);
      }
      if (onRefundSale) {
        onRefundSale(refundTransaction, updatedSale);
      }
    },
  });

  // Multi-attribute filter states
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const dateFilters = [
    { id: 'all', label: 'All' },
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'custom', label: 'Custom' },
  ];

  // Completed sales representation (completed / paid transactions, excluding draft or cancelled tickets)
  const completedSales = useMemo(() => {
    return localSales.filter(
      (tx) => tx.status === 'Receipt' || tx.status === 'Completed' || tx.status === 'Refunded'
    );
  }, [localSales]);

  // Filtered sales based on date range, search query, and filter criteria
  const filteredSales = useMemo(() => {
    return filterSales(completedSales, {
      searchQuery: localSearch || externalSearch,
      paymentMethod: paymentFilter,
      status: statusFilter,
      dateRangePreset: activeDateTab,
      customStart: customStartDate,
      customEnd: customEndDate,
    });
  }, [
    completedSales,
    activeDateTab,
    customStartDate,
    customEndDate,
    externalSearch,
    localSearch,
    paymentFilter,
    statusFilter,
  ]);

  const hasActiveFilters = Boolean(
    localSearch ||
    externalSearch ||
    activeDateTab !== 'all' ||
    customStartDate ||
    customEndDate ||
    paymentFilter !== 'all' ||
    statusFilter !== 'all'
  );

  const handleClearFilters = () => {
    setLocalSearch('');
    setActiveDateTab('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setPaymentFilter('all');
    setStatusFilter('all');
  };

  return (
    <div id="sales-screen-root" className="space-y-6 pb-12">
      {/* Title */}
      <div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Sale History</h2>
        <p className="text-xs text-slate-400 font-semibold tracking-wide mt-0.5">
          Historical completed sales, payment details, and receipts.
        </p>
      </div>

      {/* Sales Filtering & Search Component */}
      <SalesFilters
        dateTabs={dateFilters}
        activeDateTab={activeDateTab}
        onDateTabChange={setActiveDateTab}
        customStartDate={customStartDate}
        onCustomStartDateChange={setCustomStartDate}
        customEndDate={customEndDate}
        onCustomEndDateChange={setCustomEndDate}
        searchQuery={localSearch}
        onSearchChange={setLocalSearch}
        paymentFilter={paymentFilter}
        onPaymentFilterChange={setPaymentFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
        filteredCount={filteredSales.length}
      />

      {/* Completed Sales List Table */}
      <SalesTable
        sales={filteredSales}
        totalCompletedCount={completedSales.length}
        hasActiveFilters={hasActiveFilters}
        onSelectSale={(sale) => setSelectedTx(sale)}
        onViewReceipt={(sale) => setReceiptToView(sale)}
        onOpenRefund={(sale) => openFullRefundModal(sale)}
      />

      {/* Sale Detail View Modal */}
      <SaleDetailModal
        isOpen={Boolean(selectedTx)}
        onClose={() => setSelectedTx(null)}
        sale={selectedTx}
        onOpenReceipt={(sale) => setReceiptToView(sale)}
        onOpenRefund={(sale, item) => openRefundModal(sale, item)}
        onOpenFullRefund={(sale) => openFullRefundModal(sale)}
      />

      {/* Sale Receipt View & Print Modal */}
      <SaleReceiptModal
        isOpen={Boolean(receiptToView)}
        onClose={() => setReceiptToView(null)}
        sale={receiptToView}
      />

      {/* Partial Refund Workflow Modal */}
      <PartialRefundModal
        isOpen={isRefundModalOpen}
        onClose={closeRefundModal}
        sale={saleToRefund}
        item={itemToRefund}
        onConfirmRefund={handleConfirmRefund}
      />

      {/* Full Refund Confirmation Modal */}
      <FullRefundModal
        isOpen={isFullRefundModalOpen}
        onClose={closeFullRefundModal}
        sale={saleToFullRefund}
        onConfirm={handleConfirmFullRefund}
        errorMessage={fullRefundError}
      />
    </div>
  );
}
