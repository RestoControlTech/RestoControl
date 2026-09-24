/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { MenuItem, Category } from '../types';

export interface UseMenuOptions {
  menuItems: MenuItem[];
  categories: Category[];
  externalSearch?: string;
  onToggleStock?: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => void;
}

export type AvailabilityFilterType = 'all' | 'available' | 'unavailable';
export type PopularFilterType = 'all' | 'popular' | 'regular';
export type SortByType = 'default' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'availability';

export function useMenu({
  menuItems,
  categories,
  externalSearch = '',
  onToggleStock,
  onDeleteItem,
}: UseMenuOptions) {
  // Navigation & View state
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Search & Filter state
  const [filterQuery, setFilterQuery] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilterType>('all');
  const [popularFilter, setPopularFilter] = useState<PopularFilterType>('all');
  const [sortBy, setSortBy] = useState<SortByType>('default');

  // Delete product state
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Availability toggling state (debounce lock)
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Feedback notification banner state
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Category navigation tabs with counts
  const categoriesTab = useMemo(() => [
    { id: 'all', label: 'All Items', count: menuItems.length },
    ...categories
      .filter((c) => c.id !== 'all')
      .map((c) => ({
        id: c.id,
        label: c.label,
        count: menuItems.filter((i) => i.category === c.id).length,
      })),
  ], [categories, menuItems]);

  // Selected item to delete
  const selectedProductToDelete = useMemo(() => {
    return menuItems.find((i) => i.id === itemToDelete) || null;
  }, [menuItems, itemToDelete]);

  // Handle confirming item deletion
  const handleConfirmDelete = () => {
    if (!itemToDelete) return;

    if (!selectedProductToDelete) {
      setFeedbackMessage({ text: 'Error: Target product was not found or has already been deleted.', type: 'error' });
      setItemToDelete(null);
      return;
    }

    setIsDeleting(true);
    const deletedName = selectedProductToDelete.name;
    onDeleteItem?.(itemToDelete);

    setIsDeleting(false);
    setItemToDelete(null);
    setFeedbackMessage({ text: `Product "${deletedName}" was successfully deleted from the catalog.`, type: 'success' });
  };

  // Handle stock availability toggle
  const handleToggleStockClick = (item: MenuItem) => {
    if (togglingId === item.id) return; // Prevent double clicking / rapid toggling

    setTogglingId(item.id);
    const nextStatus = !item.inStock;

    onToggleStock?.(item.id);

    setFeedbackMessage({
      text: `Product "${item.name}" availability updated to ${nextStatus ? 'Available (In Stock)' : 'Unavailable (Out of Stock)'}.`,
      type: 'success',
    });

    setTimeout(() => {
      setTogglingId(null);
    }, 300);
  };

  // Check if any filter or search query is currently active
  const hasActiveFilters =
    Boolean(filterQuery) ||
    Boolean(externalSearch) ||
    activeTab !== 'all' ||
    availabilityFilter !== 'all' ||
    popularFilter !== 'all' ||
    sortBy !== 'default';

  // Clear all filters back to default
  const handleClearFilters = () => {
    setFilterQuery('');
    setActiveTab('all');
    setAvailabilityFilter('all');
    setPopularFilter('all');
    setSortBy('default');
  };

  // Filter and sort items based on current active criteria
  const filteredItems = useMemo(() => {
    return menuItems
      .filter((item) => {
        const overallQuery = externalSearch.toLowerCase().trim();
        const subQuery = filterQuery.toLowerCase().trim();
        const query = subQuery || overallQuery;

        if (query) {
          const idStr = item.id.toLowerCase();
          const displayIdStr = `#${item.id.replace('food-', 'd')}`.toLowerCase();
          const nameStr = item.name.toLowerCase();
          const descStr = item.description.toLowerCase();
          const catStr = item.category.toLowerCase();
          const tagStr = (item.tag || '').toLowerCase();
          const badgeStr = (item.badge || '').toLowerCase();

          const matchesQuery =
            idStr.includes(query) ||
            displayIdStr.includes(query) ||
            nameStr.includes(query) ||
            descStr.includes(query) ||
            catStr.includes(query) ||
            tagStr.includes(query) ||
            badgeStr.includes(query);

          if (!matchesQuery) return false;
        }

        // Category Tab Filter
        if (activeTab !== 'all' && item.category !== activeTab) {
          return false;
        }

        // Availability Filter
        if (availabilityFilter === 'available' && !item.inStock) {
          return false;
        }
        if (availabilityFilter === 'unavailable' && item.inStock) {
          return false;
        }

        // Popular Status Filter
        const isItemPopular = Boolean(
          item.badge === 'POPULAR' || item.tag === 'Popular' || item.category === 'popular'
        );
        if (popularFilter === 'popular' && !isItemPopular) {
          return false;
        }
        if (popularFilter === 'regular' && isItemPopular) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name-asc') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'name-desc') {
          return b.name.localeCompare(a.name);
        }
        if (sortBy === 'price-asc') {
          return a.price - b.price;
        }
        if (sortBy === 'price-desc') {
          return b.price - a.price;
        }
        if (sortBy === 'availability') {
          if (a.inStock === b.inStock) return 0;
          return a.inStock ? -1 : 1;
        }
        return 0;
      });
  }, [menuItems, externalSearch, filterQuery, activeTab, availabilityFilter, popularFilter, sortBy]);

  // Derived catalog counts
  const totalCount = menuItems.length;
  const inStockCount = menuItems.filter((i) => i.inStock).length;
  const outOfStockCount = menuItems.filter((i) => !i.inStock).length;
  const categoriesCount = new Set(menuItems.map((i) => i.category)).size;

  return {
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    filterQuery,
    setFilterQuery,
    availabilityFilter,
    setAvailabilityFilter,
    popularFilter,
    setPopularFilter,
    sortBy,
    setSortBy,
    itemToDelete,
    setItemToDelete,
    selectedProductToDelete,
    isDeleting,
    handleConfirmDelete,
    togglingId,
    handleToggleStockClick,
    feedbackMessage,
    setFeedbackMessage,
    categoriesTab,
    hasActiveFilters,
    handleClearFilters,
    filteredItems,
    totalCount,
    inStockCount,
    outOfStockCount,
    categoriesCount,
  };
}
