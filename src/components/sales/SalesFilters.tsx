/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RotateCcw, SlidersHorizontal, Calendar, AlertCircle, X } from 'lucide-react';
import { Tabs, SearchBar, Select, Button, Badge } from '../ui';

export interface SalesFiltersProps {
  dateTabs: Array<{ id: string; label: string }>;
  activeDateTab: string;
  onDateTabChange: (tabId: string) => void;
  customStartDate?: string;
  onCustomStartDateChange?: (val: string) => void;
  customEndDate?: string;
  onCustomEndDateChange?: (val: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  paymentFilter: string;
  onPaymentFilterChange: (payment: string) => void;
  orderTypeFilter: string;
  onOrderTypeFilterChange: (type: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  filteredCount: number;
}

export const SalesFilters: React.FC<SalesFiltersProps> = ({
  dateTabs,
  activeDateTab,
  onDateTabChange,
  customStartDate = '',
  onCustomStartDateChange,
  customEndDate = '',
  onCustomEndDateChange,
  searchQuery,
  onSearchChange,
  paymentFilter,
  onPaymentFilterChange,
  orderTypeFilter,
  onOrderTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  hasActiveFilters,
  onClearFilters,
  filteredCount,
}) => {
  return (
    <div className="space-y-3">
      {/* Date Navigation Tabs & Search / Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between border-b border-slate-100 pb-3">
        {/* Date Filter Tabs */}
        <Tabs
          tabs={dateTabs}
          activeTab={activeDateTab}
          onChange={onDateTabChange}
          variant="dark"
          className="w-full sm:w-auto"
        />

        {/* Search Input Bar */}
        <div className="w-full sm:w-72">
          <SearchBar
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="Search order #, customer, table, item..."
            size="sm"
            className="bg-white"
          />
        </div>
      </div>

      {/* Custom Date Range Picker Row (shown when 'custom' date tab is selected) */}
      {activeDateTab === 'custom' && (
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-600 shrink-0" />
            <span className="font-extrabold text-slate-700">Custom Date Range:</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-bold text-slate-500">From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => onCustomStartDateChange?.(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <span className="text-slate-400 font-bold">to</span>
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-bold text-slate-500">To:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => onCustomEndDateChange?.(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>
          {customStartDate && customEndDate && customStartDate > customEndDate && (
            <div className="flex items-center gap-1 text-[11px] font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Start date is after end date (0 matching sales)</span>
            </div>
          )}
        </div>
      )}

      {/* Multi-attribute Filter Dropdowns Row */}
      <div className="bg-white border border-slate-100 rounded-2xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Payment Method Filter */}
          <div className="w-44">
            <Select
              value={paymentFilter}
              onChange={(e) => onPaymentFilterChange(e.target.value)}
              options={[
                { value: 'all', label: 'All Payment Methods' },
                { value: 'Credit Card', label: 'Credit Card' },
                { value: 'Cash', label: 'Cash' },
                { value: 'QR Code', label: 'QR Code' },
                { value: 'Digital Wallet', label: 'Digital Wallet' },
              ]}
              className="py-1.5 text-xs bg-slate-50 border-slate-200"
            />
          </div>

          {/* Order Type Filter */}
          <div className="w-36">
            <Select
              value={orderTypeFilter}
              onChange={(e) => onOrderTypeFilterChange(e.target.value)}
              options={[
                { value: 'all', label: 'All Order Types' },
                { value: 'Dine-in', label: 'Dine-in' },
                { value: 'Takeaway', label: 'Takeaway' },
              ]}
              className="py-1.5 text-xs bg-slate-50 border-slate-200"
            />
          </div>

          {/* Payment / Order Status Filter */}
          <div className="w-36">
            <Select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'paid', label: 'Paid / Completed' },
                { value: 'refunded', label: 'Refunded' },
              ]}
              className="py-1.5 text-xs bg-slate-50 border-slate-200"
            />
          </div>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            type="button"
            onClick={onClearFilters}
            variant="secondary"
            size="sm"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            className="text-xs shrink-0 bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Active Filter Badges Bar */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 font-semibold bg-orange-50/60 border border-orange-100 px-3.5 py-2 rounded-xl">
          <span className="font-extrabold text-orange-800 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-orange-600" />
            Active Filters ({filteredCount} matching sale{filteredCount === 1 ? '' : 's'}):
          </span>
          {searchQuery && (
            <Badge variant="orange" size="xs" className="inline-flex items-center gap-1">
              <span>Search: "{searchQuery}"</span>
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="hover:text-orange-950 p-0.5 rounded-full hover:bg-orange-200/50 cursor-pointer"
                title="Clear search"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          )}
          {activeDateTab !== 'all' && (
            <Badge variant="slate" size="xs" className="inline-flex items-center gap-1">
              <span>
                {activeDateTab === 'custom'
                  ? `Date: ${customStartDate || 'Any'} → ${customEndDate || 'Any'}`
                  : `Date: ${dateTabs.find((t) => t.id === activeDateTab)?.label || activeDateTab}`}
              </span>
              <button
                type="button"
                onClick={() => {
                  onDateTabChange('all');
                  onCustomStartDateChange?.('');
                  onCustomEndDateChange?.('');
                }}
                className="hover:text-slate-950 p-0.5 rounded-full hover:bg-slate-300/50 cursor-pointer"
                title="Clear date filter"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          )}
          {paymentFilter !== 'all' && (
            <Badge variant="emerald" size="xs" className="inline-flex items-center gap-1">
              <span>Payment: {paymentFilter}</span>
              <button
                type="button"
                onClick={() => onPaymentFilterChange('all')}
                className="hover:text-emerald-950 p-0.5 rounded-full hover:bg-emerald-200/50 cursor-pointer"
                title="Clear payment filter"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          )}
          {orderTypeFilter !== 'all' && (
            <Badge variant="blue" size="xs" className="inline-flex items-center gap-1">
              <span>Type: {orderTypeFilter}</span>
              <button
                type="button"
                onClick={() => onOrderTypeFilterChange('all')}
                className="hover:text-blue-950 p-0.5 rounded-full hover:bg-blue-200/50 cursor-pointer"
                title="Clear order type filter"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          )}
          {statusFilter !== 'all' && (
            <Badge
              variant={statusFilter === 'refunded' ? 'rose' : 'emerald'}
              size="xs"
              className="inline-flex items-center gap-1"
            >
              <span>Status: {statusFilter === 'refunded' ? 'Refunded' : 'Paid'}</span>
              <button
                type="button"
                onClick={() => onStatusFilterChange('all')}
                className="p-0.5 rounded-full hover:bg-black/10 cursor-pointer"
                title="Clear status filter"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
