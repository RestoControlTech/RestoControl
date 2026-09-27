/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LayoutGrid, List, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Category } from '../../types';
import { Tabs, Select, Button, Badge } from '../ui';
import { MenuSearch } from './MenuSearch';
import { AvailabilityFilterType, PopularFilterType, SortByType } from '../../hooks/useMenu';

export interface MenuFiltersProps {
  categories: Category[];
  categoriesTab: Array<{ id: string; label: string; count: number }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  availabilityFilter: AvailabilityFilterType;
  onAvailabilityChange: (val: AvailabilityFilterType) => void;
  popularFilter: PopularFilterType;
  onPopularChange: (val: PopularFilterType) => void;
  sortBy: SortByType;
  onSortChange: (val: SortByType) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  viewMode: 'grid' | 'table';
  onViewModeChange: (mode: 'grid' | 'table') => void;
  filteredCount: number;
}

export const MenuFilters: React.FC<MenuFiltersProps> = ({
  categories,
  categoriesTab,
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  availabilityFilter,
  onAvailabilityChange,
  popularFilter,
  onPopularChange,
  sortBy,
  onSortChange,
  hasActiveFilters,
  onClearFilters,
  viewMode,
  onViewModeChange,
  filteredCount,
}) => {
  return (
    <div className="space-y-4">
      {/* Category Navigation Tabs */}
      <div className="border-b border-slate-100 pb-3">
        <Tabs
          tabs={categoriesTab}
          activeTab={activeTab}
          onChange={onTabChange}
          variant="orange"
          className="w-full"
        />
      </div>

      {/* Search, Filters, and View Mode Toolbar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-3.5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input Bar */}
        <div className="flex-1 min-w-[14rem]">
          <MenuSearch value={searchQuery} onChange={onSearchChange} />
        </div>

        {/* Filter Controls & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Availability Filter Dropdown */}
          <div className="w-36">
            <Select
              value={availabilityFilter}
              onChange={(e) => onAvailabilityChange(e.target.value as AvailabilityFilterType)}
              options={[
                { value: 'all', label: 'All Stock Status' },
                { value: 'available', label: 'In Stock Only' },
                { value: 'unavailable', label: 'Out of Stock' },
              ]}
              className="py-1.5 text-xs bg-slate-50 border-slate-200"
            />
          </div>

          {/* Popular Status Filter Dropdown */}
          <div className="w-36">
            <Select
              value={popularFilter}
              onChange={(e) => onPopularChange(e.target.value as PopularFilterType)}
              options={[
                { value: 'all', label: 'All Products' },
                { value: 'popular', label: 'Popular Only' },
                { value: 'regular', label: 'Regular Only' },
              ]}
              className="py-1.5 text-xs bg-slate-50 border-slate-200"
            />
          </div>

          {/* Sort By Dropdown */}
          <div className="w-40">
            <Select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortByType)}
              options={[
                { value: 'default', label: 'Sort: Default' },
                { value: 'name-asc', label: 'Name: A to Z' },
                { value: 'name-desc', label: 'Name: Z to A' },
                { value: 'price-asc', label: 'Price: Low to High' },
                { value: 'price-desc', label: 'Price: High to Low' },
                { value: 'availability', label: 'In Stock First' },
              ]}
              className="py-1.5 text-xs bg-slate-50 border-slate-200"
            />
          </div>

          {/* Reset Filters Button */}
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

          {/* View Mode Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center shrink-0 border border-slate-200/60 ml-auto md:ml-0">
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Filter Badges Bar */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 font-semibold bg-orange-50/60 border border-orange-100 px-3.5 py-2 rounded-xl">
          <span className="font-extrabold text-orange-800 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-orange-600" />
            Active Filters ({filteredCount} matching result{filteredCount === 1 ? '' : 's'}):
          </span>
          {searchQuery && (
            <Badge variant="orange" size="xs" className="flex items-center gap-1">
              Search: "{searchQuery}"
            </Badge>
          )}
          {activeTab !== 'all' && (
            <Badge variant="slate" size="xs" className="capitalize">
              Category: {categories.find((c) => c.id === activeTab)?.label || activeTab}
            </Badge>
          )}
          {availabilityFilter !== 'all' && (
            <Badge variant="emerald" size="xs">
              Status: {availabilityFilter === 'available' ? 'In Stock' : 'Out of Stock'}
            </Badge>
          )}
          {popularFilter !== 'all' && (
            <Badge variant="blue" size="xs">
              Type: {popularFilter === 'popular' ? 'Popular' : 'Regular'}
            </Badge>
          )}
          {sortBy !== 'default' && (
            <Badge variant="slate" size="xs">
              Sort: {sortBy}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
