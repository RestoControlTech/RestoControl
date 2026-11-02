/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { QrCode, ExternalLink, Plus, DollarSign } from 'lucide-react';
import { Table, TableStatus, Order, PaymentConfirmation } from '../../types';
import { Button, Card, EmptyState } from '../../components/ui';
import { TableQRModal, AddTableModal } from '../../components/tables';
import { getTableMenuPath } from '../../utils/qr';
import { formatPrice } from '../../utils/format';

export interface TablesProps {
  tables: Table[];
  orders?: Order[];
  onToggleStatus: (tableId: string) => void;
  onViewMenu: (tableName: string) => void;
  onPayTable?: (tableId: string, paymentInfo?: Partial<PaymentConfirmation>) => void;
  onOpenInPOS?: (tableId: string) => void;
  onAddTable?: (table: { name: string; section: string; seats: number }) => {
    success: boolean;
    error?: string;
    table?: Table;
  };
  searchQuery: string;
}

export type TableFilterStatus = 'ALL' | 'Available' | 'Busy' | 'Occupied' | 'Reserved';

export default function Tables({
  tables,
  orders = [],
  onToggleStatus,
  onViewMenu,
  onPayTable,
  onOpenInPOS,
  onAddTable,
  searchQuery,
}: TablesProps) {
  const [activeQRTable, setActiveQRTable] = useState<Table | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TableFilterStatus>('ALL');

  // Helper to compute table total from orders or stored amount
  const getTableTotal = (table: Table): number => {
    if (typeof table.totalAmount === 'number' && table.totalAmount > 0) {
      return table.totalAmount;
    }
    if (!orders || orders.length === 0) {
      return table.totalAmount || 0;
    }
    const cleanId = table.id.toLowerCase().replace(/[\s-_]+/g, '');
    const cleanName = table.name.trim().toLowerCase().replace(/[\s-_]+/g, '');
    const unpaid = orders.filter((o) => {
      const oTableClean = o.table.trim().toLowerCase().replace(/[\s-_]+/g, '');
      const oIdClean = (o.tableId || '').toLowerCase().replace(/[\s-_]+/g, '');
      const matches = oTableClean === cleanName || (oIdClean && oIdClean === cleanId);
      const isUnpaid = o.paymentStatus === 'UNPAID' || o.paymentStatus === 'Unpaid' || o.paymentStatus === 'Pending';
      return matches && isUnpaid && o.status !== 'Cancelled';
    });
    const sum = unpaid.reduce((acc, o) => acc + (o.total || 0), 0);
    return Math.round(sum * 100) / 100;
  };

  const filteredTables = tables.filter((table) => {
    // 1. Status Filter (Available, Busy/Occupied, Reserved - strictly NO 'Online')
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'Busy' || statusFilter === 'Occupied') {
        if (table.status !== 'Busy' && table.status !== 'Occupied') return false;
      } else if (table.status !== statusFilter) {
        return false;
      }
    }

    // 2. Search Query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const displayStatus = (table.status === 'Occupied' || table.status === 'Busy') ? 'busy occupied' : table.status.toLowerCase();
      return (
        table.name.toLowerCase().includes(query) ||
        table.section.toLowerCase().includes(query) ||
        displayStatus.includes(query)
      );
    }

    return true;
  });

  const getStatusBadgeStyle = (status: TableStatus) => {
    switch (status) {
      case 'Busy':
      case 'Occupied':
        return 'bg-orange-50 border-orange-200 text-orange-600';
      case 'Reserved':
        return 'bg-blue-50 border-blue-200 text-blue-600';
      case 'Available':
      default:
        return 'bg-emerald-50 border-emerald-200 text-emerald-600';
    }
  };

  const countAvailable = tables.filter((t) => t.status === 'Available').length;
  const countBusy = tables.filter((t) => t.status === 'Busy' || t.status === 'Occupied').length;
  const countReserved = tables.filter((t) => t.status === 'Reserved').length;

  return (
    <div id="tables-screen-root" className="space-y-6">
      {/* Top Header Row: Title, Counts, and Add Table Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Tables & QR</h2>
          <p className="text-xs text-slate-400 font-semibold tracking-wide mt-0.5">
            Table layout status, active customer QR orders, and table bill synchronization.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onAddTable && (
            <Button
              id="btn-add-table"
              onClick={() => setIsAddModalOpen(true)}
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              className="font-bold text-xs shadow-xs"
            >
              Add Table
            </Button>
          )}
        </div>
      </div>

      {/* Restaurant Table State Filter Bar (Available, Busy, Reserved) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {(['ALL', 'Available', 'Busy', 'Reserved'] as TableFilterStatus[]).map((tab) => {
          const isActive = statusFilter === tab;
          const count =
            tab === 'ALL'
              ? tables.length
              : tab === 'Available'
              ? countAvailable
              : tab === 'Busy'
              ? countBusy
              : countReserved;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span>{tab === 'ALL' ? 'All Tables' : tab}</span>
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-slate-800 text-orange-400' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid containing tables cards or EmptyState */}
      {filteredTables.length === 0 ? (
        <EmptyState
          title="No tables found"
          description={
            searchQuery
              ? `No tables match "${searchQuery}".`
              : statusFilter !== 'ALL'
              ? `No tables currently in ${statusFilter} state.`
              : 'No tables have been configured yet.'
          }
          actionText={statusFilter !== 'ALL' ? 'Show All Tables' : undefined}
          onAction={() => setStatusFilter('ALL')}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredTables.map((table) => {
            const relativeMenuPath = getTableMenuPath(table.id);
            const isBusy = table.status === 'Busy' || table.status === 'Occupied';
            const tableTotal = getTableTotal(table);
            const isOrange = isBusy || Boolean(table.isActive) || tableTotal > 0;
            const displayBadgeText = isBusy ? 'Busy' : table.status;

            return (
              <Card
                key={table.id}
                padding="md"
                hoverEffect
                className={`flex flex-col justify-between transition-all duration-200 ${
                  isOrange
                    ? 'bg-orange-50/70 border-2 border-orange-400 ring-1 ring-orange-300/60 shadow-md shadow-orange-100/50'
                    : 'bg-white border border-slate-200/80 shadow-xs'
                }`}
              >
                {/* Table Info and Header Status badge */}
                <div>
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm tracking-tight leading-snug">
                        {table.name}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5 leading-none">
                        {table.section} ·{' '}
                        <span className="font-medium text-slate-400">{table.seats} Seats</span>
                      </p>
                    </div>

                    {/* Clickable Status toggle */}
                    <button
                      type="button"
                      onClick={() => onToggleStatus(table.id)}
                      title="Click to toggle status (Available / Busy / Reserved)"
                      className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold border uppercase tracking-wider transition-all active:scale-[0.93] cursor-pointer ${getStatusBadgeStyle(
                        table.status
                      )}`}
                    >
                      {displayBadgeText}
                    </button>
                  </div>

                  {/* Stylized QR code block panel - Clickable to open real QR modal */}
                  <div
                    onClick={() => setActiveQRTable(table)}
                    title={`Click to view and print QR Code for ${table.name}`}
                    className={`border rounded-xl p-3.5 flex flex-col items-center justify-center my-3 cursor-pointer group transition-colors ${
                      isOrange
                        ? 'bg-orange-100/40 border-orange-200/70 hover:bg-orange-100/70'
                        : 'bg-slate-50/70 border-slate-100/60 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="w-18 h-18 bg-white border border-slate-200/50 group-hover:border-orange-300 rounded-lg p-2 flex items-center justify-center shadow-xs transition-colors">
                      <QrCode className="w-full h-full text-slate-800 group-hover:text-orange-600 transition-colors" />
                    </div>
                    <p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest mt-2 group-hover:text-orange-600 transition-colors">
                      Scan to Order
                    </p>
                    <p className="text-[9px] text-slate-400/90 mt-0.5 tracking-tight font-medium lowercase select-all">
                      {relativeMenuPath}
                    </p>
                  </div>

                  {/* Displayed Outstanding Table Amount */}
                  <div
                    className={`px-3.5 py-2.5 rounded-xl border flex items-center justify-between transition-all ${
                      isOrange
                        ? 'bg-orange-600 border-orange-600 text-white shadow-sm'
                        : 'bg-slate-50/80 border-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider ${
                          isOrange ? 'text-orange-100' : 'text-slate-400'
                        }`}
                      >
                        Outstanding Total
                      </span>
                      <span
                        className={`text-base font-black tabular-nums tracking-tight ${
                          isOrange ? 'text-white' : 'text-slate-800'
                        }`}
                      >
                        {formatPrice(tableTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interaction row */}
                <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 mt-3">
                  <Button
                    onClick={() => setActiveQRTable(table)}
                    variant="secondary"
                    size="xs"
                    icon={<QrCode className="w-3 h-3 text-slate-500" />}
                  >
                    View QR
                  </Button>
                  {isOrange && onOpenInPOS ? (
                    <Button
                      onClick={() => onOpenInPOS(table.id)}
                      variant="primary"
                      size="xs"
                      icon={<DollarSign className="w-3 h-3" />}
                    >
                      POS Checkout
                    </Button>
                  ) : (
                    <Button
                      onClick={() => onViewMenu(table.name)}
                      variant="subtle-orange"
                      size="xs"
                      icon={<ExternalLink className="w-3 h-3 text-orange-500" />}
                    >
                      View Menu
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Real Table QR Code Modal */}
      <TableQRModal
        isOpen={!!activeQRTable}
        table={activeQRTable}
        onClose={() => setActiveQRTable(null)}
        onOpenMenu={(tableId) => {
          const targetTable = tables.find((t) => t.id === tableId) || activeQRTable;
          setActiveQRTable(null);
          if (targetTable) {
            onViewMenu(targetTable.name);
          }
        }}
      />

      {/* Add Table Modal */}
      {isAddModalOpen && onAddTable && (
        <AddTableModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddTable={onAddTable}
          existingTables={tables}
        />
      )}
    </div>
  );
}
