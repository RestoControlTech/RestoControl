/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowRight, Eye, CreditCard, Banknote, QrCode, Smartphone, Printer, RotateCcw } from 'lucide-react';
import { Transaction } from '../../types';
import { formatPrice } from '../../utils/format';
import {
  Badge,
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
  totalCompletedCount: number;
  hasActiveFilters: boolean;
  onSelectSale: (sale: Transaction) => void;
  onViewReceipt: (sale: Transaction) => void;
  onOpenRefund?: (sale: Transaction) => void;
}

export const SalesTable: React.FC<SalesTableProps> = ({
  sales,
  totalCompletedCount,
  hasActiveFilters,
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
      default:
        return <CreditCard className="w-3 h-3 text-orange-600" />;
    }
  };

  return (
    <>
      {/* Completed Sales List Table */}
      {sales.length === 0 ? (
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
              const isRefund = sale.status === 'Refunded';
              return (
                <TableRow
                  key={sale.id}
                  onClick={() => onSelectSale(sale)}
                  className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                >
                  {/* 1. Date */}
                  <TableCell className="text-slate-600 font-bold text-xs whitespace-nowrap">
                    {sale.dateTime}
                  </TableCell>

                  {/* 2. Sale ID */}
                  <TableCell>
                    <div className="font-extrabold text-slate-800 text-xs">{sale.orderNumber}</div>
                    <div className="text-[10px] text-slate-400 font-semibold leading-none mt-0.5">
                      #{sale.id.replace('tx-', 'TX-')}
                      {sale.table ? ` • ${sale.table}` : ''}
                      {sale.customerName ? ` • ${sale.customerName}` : ''}
                    </div>
                  </TableCell>

                  {/* 3. Items */}
                  <TableCell className="text-xs text-slate-600 max-w-[14rem] truncate font-medium">
                    {sale.itemSummary || (sale.items && sale.items.length > 0 ? `${sale.items.length} item(s)` : 'Order items')}
                  </TableCell>

                  {/* 4. Total */}
                  <TableCell className={`font-black text-xs whitespace-nowrap ${isRefund ? 'text-red-500' : 'text-slate-900'}`}>
                    {formatPrice(sale.amount, sale.currency || 'USD')}
                    <span className="text-[9px] font-bold text-slate-400 ml-1">{sale.currency || 'USD'}</span>
                  </TableCell>

                  {/* 5. Payment */}
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      {getPaymentMethodIcon(sale.paymentMethod)}
                      <span>{sale.paymentMethod || 'Credit Card'}</span>
                    </div>
                  </TableCell>

                  {/* 6. Status */}
                  <TableCell>
                    <Badge variant={isRefund ? 'red' : 'emerald'} size="xs" className="font-extrabold text-[9px]">
                      {isRefund ? 'Refunded' : 'Completed'}
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
      )}

      {/* Table Footer Pagination */}
      <div className="bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400 font-bold select-none">
        <span>
          Showing {sales.length} of {totalCompletedCount} completed transaction{totalCompletedCount === 1 ? '' : 's'}
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
    </>
  );
};
