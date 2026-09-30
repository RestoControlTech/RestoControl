/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { QrCode, ExternalLink, Plus } from 'lucide-react';
import { Table, TableStatus } from '../../types';
import { Button, Card, EmptyState } from '../../components/ui';
import { TableQRModal, AddTableModal } from '../../components/tables';
import { getTableMenuPath } from '../../utils/qr';

export interface TablesProps {
  tables: Table[];
  onToggleStatus: (tableId: string) => void;
  onViewMenu: (tableName: string) => void;
  onAddTable?: (table: { name: string; section: string; seats: number }) => {
    success: boolean;
    error?: string;
    table?: Table;
  };
  searchQuery: string;
}

export type TableFilterStatus = 'ALL' | 'Available' | 'Occupied' | 'Reserved';

export default function Tables({
  tables,
  onToggleStatus,
  onViewMenu,
  onAddTable,
  searchQuery,
}: TablesProps) {
  const [activeQRTable, setActiveQRTable] = useState<Table | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TableFilterStatus>('ALL');

  const filteredTables = tables.filter((table) => {
    // 1. Status Filter (Available, Occupied, Reserved - strictly NO 'Online')
    if (statusFilter !== 'ALL' && table.status !== statusFilter) {
      return false;
    }

    // 2. Search Query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      return (
        table.name.toLowerCase().includes(query) ||
        table.section.toLowerCase().includes(query) ||
        table.status.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const getStatusBadgeStyle = (status: TableStatus) => {
    switch (status) {
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
  const countOccupied = tables.filter((t) => t.status === 'Occupied').length;
  const countReserved = tables.filter((t) => t.status === 'Reserved').length;

  return (
    <div id="tables-screen-root" className="space-y-6">
      {/* Top Header Row: Title, Counts, and Add Table Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Tables & QR</h2>
          <p className="text-xs text-slate-400 font-semibold tracking-wide mt-0.5">
            Table layout status and active client QR ordering codes.
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

      {/* Restaurant Table State Filter Bar (Available, Occupied, Reserved) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {(['ALL', 'Available', 'Occupied', 'Reserved'] as TableFilterStatus[]).map((tab) => {
          const isActive = statusFilter === tab;
          const count =
            tab === 'ALL'
              ? tables.length
              : tab === 'Available'
              ? countAvailable
              : tab === 'Occupied'
              ? countOccupied
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
            return (
              <Card
                key={table.id}
                padding="md"
                hoverEffect
                className="flex flex-col justify-between"
              >
                {/* Table Info and Header Status badge */}
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
                    title="Click to toggle status (Available / Occupied / Reserved)"
                    className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold border uppercase tracking-wider transition-all active:scale-[0.93] cursor-pointer ${getStatusBadgeStyle(
                      table.status
                    )}`}
                  >
                    {table.status}
                  </button>
                </div>

                {/* Stylized QR code block panel - Clickable to open real QR modal */}
                <div
                  onClick={() => setActiveQRTable(table)}
                  title={`Click to view and print QR Code for ${table.name}`}
                  className="bg-slate-50/70 hover:bg-slate-100/80 transition-colors border border-slate-100/60 rounded-xl p-4 flex flex-col items-center justify-center my-4 cursor-pointer group"
                >
                  <div className="w-20 h-20 bg-white border border-slate-200/50 group-hover:border-orange-300 rounded-lg p-2.5 flex items-center justify-center shadow-xs transition-colors">
                    <QrCode className="w-full h-full text-slate-800 group-hover:text-orange-600 transition-colors" />
                  </div>
                  <p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest mt-3 group-hover:text-orange-600 transition-colors">
                    Scan to Order
                  </p>
                  <p className="text-[9px] text-slate-400/90 mt-0.5 tracking-tight font-medium lowercase select-all">
                    {relativeMenuPath}
                  </p>
                </div>

                {/* Interaction row */}
                <div className="grid grid-cols-2 gap-2 border-t border-slate-50 pt-3">
                  <Button
                    onClick={() => setActiveQRTable(table)}
                    variant="secondary"
                    size="xs"
                    icon={<QrCode className="w-3 h-3 text-slate-500" />}
                  >
                    View QR
                  </Button>
                  <Button
                    onClick={() => onViewMenu(table.name)}
                    variant="subtle-orange"
                    size="xs"
                    icon={<ExternalLink className="w-3 h-3 text-orange-500" />}
                  >
                    View Menu
                  </Button>
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
