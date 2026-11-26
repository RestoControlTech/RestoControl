/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  CreditCard,
  Banknote,
  QrCode,
  Smartphone,
  Printer,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { Transaction } from '../../types';
import { BackendSaleListItemDto, BackendSalesPaginationDto } from '../../services/salesApi';
import { formatPrice } from '../../utils/format';
import {
  Badge,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  EmptyState,
} from '../ui';

export interface SalesTableProps {
  sales: Transaction[];
  rawSalesById?: Record<string, BackendSaleListItemDto>;
  totalCompletedCount: number;
  hasActiveFilters: boolean;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  pagination?: BackendSalesPaginationDto;
  onPageChange?: (page: number) => void;
  onSelectSale: (sale: Transaction) => void;
  onViewReceipt: (sale: Transaction) => void;
  onOpenRefund?: (sale: Transaction) => void;
}

function formatSaleDateTime(value: string): string {
  if (!value) return '—';
  // Preserve human-readable legacy strings like 'Just Now'
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadge(
  sale: Transaction,
  raw?: BackendSaleListItemDto
): { label: string; variant: 'emerald' | 'red' | 'amber' | 'slate' } {
  if (sale.status === 'Refunded') {
    return { label: 'Refunded', variant: 'red' };
  }
  if (raw) {
    if (raw.status === 'CANCELLED') {
      return { label: 'Cancelled', variant: 'red' };
    }
    if (raw.paymentStatus === 'PARTIALLY_PAID') {
      return { label: 'Partially Paid', variant: 'amber' };
    }
    if (raw.paymentStatus === 'UNPAID') {
      return { label: 'Unpaid', variant: 'slate' };
    }
    if (raw.status === 'ACTIVE') {
      return { label: 'Active', variant: 'amber' };
    }
    return { label: 'Completed', variant: 'emerald' };
  }
  return { label: 'Completed', variant: 'emerald' };
}

export const SalesTable: React.FC<SalesTableProps> = ({
  sales,
  rawSalesById,
  totalCompletedCount,
  hasActiveFilters,
  isLoading = false,
  error = null,
  onRetry,
  pagination,
  onPageChange,
  onSelectSale,
  onViewReceipt,
  onOpenRefund,
}) => {
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
        return <CreditCard className="w-3 h-3 text-orange-600" />;
      default:
        return null;
    }
  };

  const totalCount = pagination ? pagination.total : totalCompletedCount;
  const currentPage = pagination ? pagination.page : 1;
  const totalPages = pagination ? Math.max(1, pagination.totalPages) : 1;
  const canGoPrev = pagination ? pagination.hasPreviousPage && !isLoading : false;
  const canGoNext = pagination ? pagination.hasNextPage && !isLoading : false;

  return (
    <>
      {error && (
        <div
          id="sales-error-banner"
          className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2.5 text-rose-800 font-bold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          {onRetry && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onRetry}
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              className="bg-white border-rose-200 text-rose-700 hover:bg-rose-100 shrink-0"
            >
              Retry
            </Button>
          )}
        </div>
      )}

      {/* Completed Sales List Table */}
      {isLoading && sales.length === 0 ? (
        <div
          id="sales-loading-state"
          className="bg-white border border-slate-100 rounded-3xl p-12 my-4 flex flex-col items-center justify-center gap-3 text-slate-500"
        >
          <div className="w-7 h-7 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Loading sales history...
          </p>
        </div>
      ) : sales.length === 0 && !error ? (
        <EmptyState
          title="No sales records found"
          description={
            hasActiveFilters
              ? 'No completed sales matched your filter criteria. Try resetting your filters or search.'
              : 'There are currently no completed sales in the transaction history.'
          }
          className="bg-white border border-slate-100 rounded-3xl p-10 my-4"
        />
      ) : sales.length > 0 ? (
        <div className={isLoading ? 'opacity-60 transition-opacity' : ''}>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Sale ID</TableHeaderCell>
                <TableHeaderCell>Items</TableHeaderCell>
                <TableHeaderCell>Total</TableHeaderCell>
                <TableHeaderCell>Payment</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell className="text-right">Actions</TableHeaderCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {sales.map((sale) => {
                const raw = rawSalesById?.[sale.id];
                const isRefund = sale.status === 'Refunded';
                const statusBadge = getStatusBadge(sale, raw);
                const txSubId = raw?.transactionNumber || `#${sale.id.replace('tx-', 'TX-')}`;

                return (
                  <TableRow
                    key={sale.id}
                    onClick={() => onSelectSale(sale)}
                    className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                  >
                    {/* 1. Date */}
                    <TableCell className="text-slate-600 font-bold text-xs whitespace-nowrap">
                      {formatSaleDateTime(sale.dateTime)}
                    </TableCell>

                    {/* 2. Sale ID */}
                    <TableCell>
                      <div className="font-extrabold text-slate-800 text-xs">{sale.orderNumber}</div>
                      <div className="text-[10px] text-slate-400 font-semibold leading-none mt-0.5">
                        {txSubId}
                        {sale.table ? ` • ${sale.table}` : ''}
                        {sale.customerName ? ` • ${sale.customerName}` : ''}
                      </div>
                    </TableCell>

                    {/* 3. Items */}
                    <TableCell className="text-xs text-slate-600 max-w-[14rem] truncate font-medium">
                      {sale.itemSummary ||
                        (sale.items && sale.items.length > 0
                          ? `${sale.items.length} item(s)`
                          : '—')}
                    </TableCell>

                    {/* 4. Total */}
                    <TableCell
                      className={`font-black text-xs whitespace-nowrap ${
                        isRefund ? 'text-red-500' : 'text-slate-900'
                      }`}
                    >
                      {formatPrice(sale.amount, sale.currency || 'USD')}
                      <span className="text-[9px] font-bold text-slate-400 ml-1">
                        {sale.currency || 'USD'}
                      </span>
                    </TableCell>

                    {/* 5. Payment */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        {getPaymentMethodIcon(sale.paymentMethod)}
                        <span>{sale.paymentMethod || '—'}</span>
                      </div>
                    </TableCell>

                    {/* 6. Status */}
                    <TableCell>
                      <Badge variant={statusBadge.variant} size="xs" className="font-extrabold text-[9px]">
                        {statusBadge.label}
                      </Badge>
                    </TableCell>

                    {/* 7. Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSale(sale);
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
                            onViewReceipt(sale);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Print / View Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {onOpenRefund && !isRefund && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenRefund(sale);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Refund"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {/* Table Footer Pagination */}
      <div className="bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400 font-bold select-none">
        <span>
          Showing {sales.length} of {totalCount} completed transaction{totalCount === 1 ? '' : 's'}
        </span>

        <div className="flex items-center gap-2 font-sans text-xs">
          <button
            type="button"
            disabled={!canGoPrev}
            onClick={() => onPageChange?.(currentPage - 1)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 font-bold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Previous</span>
          </button>

          <span className="font-mono text-[11px] text-slate-600 px-1.5">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            disabled={!canGoNext}
            onClick={() => onPageChange?.(currentPage + 1)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 font-bold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
          >
            <span>Next</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </>
  );
};
