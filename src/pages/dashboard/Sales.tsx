/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Transaction } from '../../types';
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
import { useSalesHistory } from '../../hooks/useSalesHistory';

interface SalesProps {
  transactions?: Transaction[];
  searchQuery?: string;
  onRefundSale?: (refundTx: Transaction, updatedSale: Transaction) => void;
}

export default function Sales({
  searchQuery: externalSearch = '',
  onRefundSale,
}: SalesProps) {
  const [activeDateTab, setActiveDateTab] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [localSearch, setLocalSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [receiptToView, setReceiptToView] = useState<Transaction | null>(null);

  const effectiveSearch = localSearch || externalSearch;

  // Debounce search input to avoid excessive requests on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(effectiveSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [effectiveSearch]);

  // Reset pagination to page 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, activeDateTab, customStartDate, customEndDate, paymentFilter, statusFilter]);

  const {
    sales,
    rawSalesById,
    pagination,
    isLoading,
    error,
    retry,
    selectedSale,
    selectedRawDetail,
    isDetailLoading,
    detailError,
    openSaleDetail,
    retrySaleDetail,
    closeSaleDetail,
  } = useSalesHistory({
    search: debouncedSearch,
    datePreset: activeDateTab,
    customStartDate,
    customEndDate,
    paymentMethod: paymentFilter,
    status: statusFilter,
    page: currentPage,
    limit: 20,
  });

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
      if (onRefundSale) {
        onRefundSale(refundTransaction, updatedSale);
      }
      retry();
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
      if (onRefundSale) {
        onRefundSale(refundTransaction, updatedSale);
      }
      retry();
    },
  });

  const dateFilters = [
    { id: 'all', label: 'All' },
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'custom', label: 'Custom' },
  ];

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
    setDebouncedSearch('');
    setActiveDateTab('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setPaymentFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
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
        filteredCount={pagination.total}
      />

      {/* Completed Sales List Table */}
      <SalesTable
        sales={sales}
        rawSalesById={rawSalesById}
        totalCompletedCount={pagination.total}
        hasActiveFilters={hasActiveFilters}
        isLoading={isLoading}
        error={error}
        onRetry={retry}
        pagination={pagination}
        onPageChange={setCurrentPage}
        onSelectSale={(sale) => openSaleDetail(sale)}
        onViewReceipt={(sale) => setReceiptToView(sale)}
        onOpenRefund={(sale) => openFullRefundModal(sale)}
      />

      {/* Sale Detail View Modal */}
      <SaleDetailModal
        isOpen={Boolean(selectedSale)}
        onClose={closeSaleDetail}
        sale={selectedSale}
        rawDetail={selectedRawDetail || (selectedSale ? rawSalesById[selectedSale.id] : null)}
        isLoading={isDetailLoading}
        error={detailError}
        onRetryDetail={retrySaleDetail}
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
