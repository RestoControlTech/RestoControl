/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { Category, MenuItem } from '../../types';
import {
  Modal,
  Input,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  Badge,
  ConfirmDialog,
} from '../ui';
import { PermissionGate } from '../auth/PermissionGate';

export interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  menuItems: MenuItem[];
  onAddCategory?: (category: Category) => void;
  onEditCategory?: (category: Category) => void;
  onDeleteCategory?: (categoryId: string) => void;
  onFeedback: (message: { text: string; type: 'success' | 'error' }) => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  isOpen,
  onClose,
  categories,
  menuItems,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onFeedback,
}) => {
  const [catName, setCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catErrors, setCatErrors] = useState<{ name?: string }>({});
  const [categoryDeleteWarning, setCategoryDeleteWarning] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; label: string } | null>(null);

  const resetCategoryForm = () => {
    setCatName('');
    setEditingCatId(null);
    setCatErrors({});
  };

  const handleClose = () => {
    resetCategoryForm();
    onClose();
  };

  const validateCategoryForm = () => {
    const errors: { name?: string } = {};
    if (!catName.trim()) {
      errors.name = 'Category name is required';
    } else {
      const isDuplicate = categories.some(
        (c) =>
          c.id !== editingCatId &&
          (c.label.toLowerCase() === catName.trim().toLowerCase() ||
            c.id.toLowerCase() === catName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-'))
      );
      if (isDuplicate) {
        errors.name = 'A category with this name already exists';
      }
    }
    setCatErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCategoryFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCategoryForm()) return;

    if (editingCatId) {
      onEditCategory?.({
        id: editingCatId,
        label: catName.trim(),
      });
      onFeedback({ text: `Category "${catName.trim()}" updated successfully.`, type: 'success' });
    } else {
      const slugId = catName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
      onAddCategory?.({
        id: slugId,
        label: catName.trim(),
      });
      onFeedback({ text: `Category "${catName.trim()}" added successfully.`, type: 'success' });
    }

    resetCategoryForm();
  };

  const handleStartEditCategory = (cat: Category) => {
    setEditingCatId(cat.id);
    setCatName(cat.label);
    setCatErrors({});
  };

  const handleAttemptDeleteCategory = (cat: Category) => {
    const assignedProductsCount = menuItems.filter((i) => i.category === cat.id).length;
    if (assignedProductsCount > 0) {
      setCategoryDeleteWarning(
        `Cannot delete category "${cat.label}" because ${assignedProductsCount} product(s) currently use this category. You must move or reassign these products first.`
      );
    } else {
      setCategoryToDelete({ id: cat.id, label: cat.label });
    }
  };

  const handleConfirmDeleteCategory = () => {
    if (!categoryToDelete) return;
    onDeleteCategory?.(categoryToDelete.id);
    onFeedback({ text: `Category "${categoryToDelete.label}" was deleted successfully.`, type: 'success' });
    setCategoryToDelete(null);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Category Management"
        maxWidth="md"
      >
        <div className="space-y-6">
          {/* Add / Edit Category Form - ONLY Category Name */}
          <form onSubmit={handleCategoryFormSubmit} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3" noValidate>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              {editingCatId ? `Edit Category (${editingCatId})` : 'Add New Category'}
            </h4>

            <Input
              label="Category Name"
              type="text"
              value={catName}
              onChange={(e) => {
                setCatName(e.target.value);
                if (catErrors.name) setCatErrors({});
              }}
              placeholder="e.g. Appetizers / Desserts"
              error={catErrors.name}
              required
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/60">
              {editingCatId && (
                <Button type="button" variant="secondary" size="sm" onClick={resetCategoryForm}>
                  Cancel Edit
                </Button>
              )}
              <Button type="submit" variant="primary" size="sm">
                {editingCatId ? 'Save Category' : '+ Add Category'}
              </Button>
            </div>
          </form>

          {/* Existing Categories Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Catalog Categories ({categories.filter((c) => c.id !== 'all').length})
            </h4>

            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Category</TableHeaderCell>
                  <TableHeaderCell>Slug ID</TableHeaderCell>
                  <TableHeaderCell>Product Count</TableHeaderCell>
                  <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categories.filter((c) => c.id !== 'all').length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-slate-400 text-xs font-medium">
                      No categories created yet. Add your first category above.
                    </TableCell>
                  </TableRow>
                ) : (
                  categories
                    .filter((c) => c.id !== 'all')
                    .map((cat) => {
                    const count = menuItems.filter((i) => i.category === cat.id).length;
                    return (
                      <TableRow key={cat.id}>
                        <TableCell>
                          <span className="font-extrabold text-slate-800 text-xs">
                            {cat.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="slate" size="xs" className="font-mono text-[10px]">
                            {cat.id}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-xs font-black ${
                              count > 0 ? 'text-emerald-700' : 'text-slate-400'
                            }`}
                          >
                            {count} {count === 1 ? 'item' : 'items'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <PermissionGate permission="menu.manage">
                              <button
                                type="button"
                                onClick={() => handleStartEditCategory(cat)}
                                className="p-1 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit category"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </PermissionGate>
                            <PermissionGate permission="menu.manage">
                              <button
                                type="button"
                                onClick={() => handleAttemptDeleteCategory(cat)}
                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete category"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </PermissionGate>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Modal>

      {/* Warning Modal when attempting to delete a category in use */}
      <Modal
        isOpen={Boolean(categoryDeleteWarning)}
        onClose={() => setCategoryDeleteWarning(null)}
        title="Cannot Delete Category"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">{categoryDeleteWarning}</p>
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button variant="primary" size="sm" onClick={() => setCategoryDeleteWarning(null)}>
              Understood
            </Button>
          </div>
        </div>
      </Modal>

      {/* Category Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(categoryToDelete)}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleConfirmDeleteCategory}
        title="Delete Category"
        message={
          categoryToDelete
            ? `Are you sure you want to delete category "${categoryToDelete.label}"? This category currently has 0 products.`
            : 'Are you sure you want to delete this category?'
        }
        confirmText="Delete Category"
        variant="danger"
      />
    </>
  );
};
