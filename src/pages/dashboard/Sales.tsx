/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Download, ArrowRight, Eye, CreditCard, Banknote, QrCode, Smartphone, Printer } from 'lucide-react';
import { Transaction } from '../../types';
import { formatPrice } from '../../utils/format';
import { filterSales } from '../../utils/salesFilters';
import { calculateSalesSummary } from '../../utils/salesSummary';
import {
  Button,
  Badge,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  EmptyState,
} from '../../components/ui';
import { PermissionGate } from '../../components/auth/PermissionGate';
import {
  SaleDetailModal,
  SaleReceiptModal,
  SalesFilters,
  SalesSummary,
  PartialRefundModal,
  FullRefundModal,
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
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('all');
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
      orderType: orderTypeFilter,
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
    orderTypeFilter,
    statusFilter,
  ]);

  // Dynamic KPI analytics calculations derived directly from the filtered sales dataset
  const salesSummary = useMemo(() => {
    return calculateSalesSummary(filteredSales);
  }, [filteredSales]);

  const hasActiveFilters = Boolean(
    localSearch ||
    externalSearch ||
    activeDateTab !== 'all' ||
    customStartDate ||
    customEndDate ||
    paymentFilter !== 'all' ||
    orderTypeFilter !== 'all' ||
    statusFilter !== 'all'
  );

  const handleClearFilters = () => {
    setLocalSearch('');
    setActiveDateTab('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setPaymentFilter('all');
    setOrderTypeFilter('all');
    setStatusFilter('all');
  };

  const getPaymentMethodIcon = (method?: string) => {
    switch (method) {
      case 'Cash':
        return <Banknote className="w-3 h-3 text-emerald-600" />;
      case 'QR Code':
        return <QrCode className="w-3 h-3 text-blue-600" />;
      case 'Digital Wallet':
        return <Smartphone className="w-3 h-3 text-purple-600" />;
      case 'Credit Card':
      case 'Debit Card':
      default:
        return <CreditCard className="w-3 h-3 text-orange-600" />;
    }
  };

  return (
    <div id="sales-screen-root" className="space-y-6 pb-12">
      {/* Title & export actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Sales History</h2>
          <p className="text-xs text-slate-400 font-semibold tracking-wide mt-0.5">
            Historical transactions, payment summaries, and daily receipts.
          </p>
        </div>
        <PermissionGate permission="sales.view">
          <Button
            onClick={() => alert('Compiling CSV logs. Downloading Sales Summary Report...')}
            icon={<Download className="w-4 h-4" />}
            variant="primary"
            size="md"
          >
            Export CSV
          </Button>
        </PermissionGate>
      </div>

      {/* KPI Stats Analytics Panels */}
      <SalesSummary summary={salesSummary} isFiltered={hasActiveFilters} />

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
        orderTypeFilter={orderTypeFilter}
        onOrderTypeFilterChange={setOrderTypeFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
        filteredCount={filteredSales.length}
      />

      {/* Completed Sales List Table */}
      {filteredSales.length === 0 ? (
        <EmptyState
          title="No sales records found"
          description={
            hasActiveFilters
              ? 'No completed sales matched your filter criteria. Try resetting your filters or search.'
              : 'There are currently no completed sales in the transaction history.'
          }
          className="bg-white border border-slate-100 rounded-3xl p-10 my-4"
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Sale / Order #</TableHeaderCell>
              <TableHeaderCell>Date & Time</TableHeaderCell>
              <TableHeaderCell>Type & Table</TableHeaderCell>
              <TableHeaderCell>Customer</TableHeaderCell>
              <TableHeaderCell>Items Summary</TableHeaderCell>
              <TableHeaderCell>Payment Method</TableHeaderCell>
              <TableHeaderCell>Total</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredSales.map((sale) => {
              const isRefund = sale.status === 'Refunded';
              return (
                <TableRow
                  key={sale.id}
                  onClick={() => setSelectedTx(sale)}
                  className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                >
                  {/* 1. Sale / Order Number */}
                  <TableCell>
                    <div className="font-extrabold text-slate-800 text-xs">{sale.orderNumber}</div>
                    <div className="text-[10px] text-slate-400 font-semibold leading-none mt-0.5">
                      #{sale.id.replace('tx-', 'TX-')}
                    </div>
                  </TableCell>

                  {/* 2. Date & Time */}
                  <TableCell className="text-slate-500 font-bold text-xs whitespace-nowrap">
                    {sale.dateTime}
                  </TableCell>

                  {/* 3. Order Type & Table */}
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                      <div>
                        <span className="font-extrabold text-slate-800 text-xs">{sale.table || 'Pickup'}</span>
                        <span className="text-[10px] text-slate-400 font-semibold ml-1.5">({sale.type})</span>
                      </div>
                    </div>
                  </TableCell>

                  {/* 4. Customer Name */}
                  <TableCell className="text-xs font-bold text-slate-700">
                    {sale.customerName || 'Walk-in Guest'}
                  </TableCell>

                  {/* 5. Items Summary */}
                  <TableCell className="text-xs text-slate-600 max-w-[13rem] truncate font-medium">
                    {sale.itemSummary || (sale.items ? `${sale.items.length} item(s)` : 'Order items')}
                  </TableCell>

                  {/* 6. Payment Method */}
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      {getPaymentMethodIcon(sale.paymentMethod)}
                      <span>{sale.paymentMethod || 'Credit Card'}</span>
                    </div>
                  </TableCell>

                  {/* 7. Total Amount & Currency */}
                  <TableCell className={`font-black text-xs whitespace-nowrap ${isRefund ? 'text-red-500' : 'text-slate-900'}`}>
                    {formatPrice(sale.amount, sale.currency || 'USD')}
                    <span className="text-[9px] font-bold text-slate-400 ml-1">{sale.currency || 'USD'}</span>
                  </TableCell>

                  {/* 8. Status */}
                  <TableCell>
                    <Badge variant={isRefund ? 'red' : 'emerald'} size="xs" className="font-extrabold text-[9px]">
                      {isRefund ? 'Refunded' : 'Completed'}
                    </Badge>
                  </TableCell>

                  {/* 9. Action Buttons */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTx(sale);
                        }}
                        className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                        title="View sale details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReceiptToView(sale);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Print / View Receipt"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Table Footer Pagination */}
      <div className="bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400 font-bold select-none">
        <span>
          Showing {filteredSales.length} of {completedSales.length} completed transaction{completedSales.length === 1 ? '' : 's'}
        </span>

        <div className="flex items-center gap-1 font-mono font-black text-xs">
          <button className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-600 shadow-xs cursor-pointer">1</button>
          <button className="px-2 py-1 rounded text-slate-400 hover:bg-slate-100 cursor-pointer">2</button>
          <span className="px-1 text-slate-300">...</span>
          <button className="px-2.5 py-1 rounded hover:bg-slate-100 text-slate-500 flex items-center gap-0.5 ml-1.5 font-sans text-[10px] font-black uppercase cursor-pointer">
            <span>Next</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

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
