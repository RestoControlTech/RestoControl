/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { MenuItem, Category } from '../../types';
import { EmptyState } from '../../components/ui';
import { useMenu } from '../../hooks/useMenu';
import {
  MenuHeader,
  MenuFilters,
  MenuGrid,
  MenuTable,
  AddProductModal,
  EditProductModal,
  DeleteProductModal,
  CategoryManager,
} from '../../components/menu';

const DEFAULT_CATEGORIES: Category[] = [{ id: 'all', label: 'All Items' }];

interface MenuProps {
  menuItems: MenuItem[];
  categories?: Category[];
  onToggleStock?: (itemId: string) => void;
  onAddItem?: (item: MenuItem) => void;
  onEditItem?: (item: MenuItem) => void;
  onDeleteItem?: (itemId: string) => void;
  onAddCategory?: (category: Category) => void;
  onEditCategory?: (category: Category) => void;
  onDeleteCategory?: (categoryId: string) => void;
  searchQuery?: string;
}

export default function Menu({
  menuItems,
  categories = DEFAULT_CATEGORIES,
  onToggleStock,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  searchQuery: externalSearch = '',
}: MenuProps) {
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<MenuItem | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Reusable catalog state & filter operations
  const {
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
  } = useMenu({
    menuItems,
    categories,
    externalSearch,
    onToggleStock,
    onDeleteItem,
  });

  return (
    <div id="menu-screen-root" className="space-y-6 pb-12">
      {/* Success / Error Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-3 rounded-xl flex items-center justify-between text-xs font-bold transition-all shadow-xs ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer ml-4 font-bold text-sm"
          >
            &times;
          </button>
        </div>
      )}

      {/* Header and Summary Stat Bar */}
      <MenuHeader
        totalCount={totalCount}
        inStockCount={inStockCount}
        outOfStockCount={outOfStockCount}
        categoriesCount={categoriesCount}
        onManageCategories={() => setShowCategoryModal(true)}
        onAddProduct={() => setShowAddModal(true)}
      />

      {/* Categories Tabs & Filters Toolbar */}
      <MenuFilters
        categories={categories}
        categoriesTab={categoriesTab}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={filterQuery}
        onSearchChange={setFilterQuery}
        availabilityFilter={availabilityFilter}
        onAvailabilityChange={setAvailabilityFilter}
        popularFilter={popularFilter}
        onPopularChange={setPopularFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filteredCount={filteredItems.length}
      />

      {/* Main Content Area: Grid View vs Table View vs Empty State */}
      {filteredItems.length === 0 ? (
        <EmptyState
          title="No products found"
          description={
            hasActiveFilters
              ? 'No catalog items matched your combination of search query, category, availability, or status filters.'
              : 'There are no catalog menu items in the database.'
          }
          actionText={hasActiveFilters ? 'Clear All Filters' : undefined}
          onAction={hasActiveFilters ? handleClearFilters : undefined}
          className="bg-white border border-slate-100 rounded-3xl p-10 my-4"
        />
      ) : viewMode === 'grid' ? (
        <MenuGrid
          items={filteredItems}
          onEdit={setItemToEdit}
          onDelete={onDeleteItem ? setItemToDelete : undefined}
          onToggleStock={onToggleStock ? handleToggleStockClick : undefined}
          togglingId={togglingId}
        />
      ) : (
        <MenuTable
          items={filteredItems}
          onEdit={setItemToEdit}
          onDelete={onDeleteItem ? setItemToDelete : undefined}
          onToggleStock={onToggleStock ? handleToggleStockClick : undefined}
          togglingId={togglingId}
        />
      )}

      {/* Add New Product Dialog Modal */}
      <AddProductModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(item) => onAddItem?.(item)}
        categories={categories}
      />

      {/* Edit Product Dialog Modal */}
      <EditProductModal
        isOpen={Boolean(itemToEdit)}
        item={itemToEdit}
        onClose={() => setItemToEdit(null)}
        onEdit={(item) => onEditItem?.(item)}
        categories={categories}
      />

      {/* Delete Item Confirmation Dialog */}
      <DeleteProductModal
        isOpen={Boolean(itemToDelete)}
        item={selectedProductToDelete}
        isDeleting={isDeleting}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Category Management Modal & Dialogs */}
      <CategoryManager
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        categories={categories}
        menuItems={menuItems}
        onAddCategory={onAddCategory}
        onEditCategory={onEditCategory}
        onDeleteCategory={onDeleteCategory}
        onFeedback={setFeedbackMessage}
      />
    </div>
  );
}
