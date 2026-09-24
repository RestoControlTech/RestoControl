/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Plus, FolderPlus } from 'lucide-react';
import { Button } from '../ui';
import { PermissionGate } from '../auth/PermissionGate';

export interface MenuHeaderProps {
  totalCount: number;
  inStockCount: number;
  outOfStockCount: number;
  categoriesCount: number;
  onManageCategories: () => void;
  onAddProduct: () => void;
}

export const MenuHeader: React.FC<MenuHeaderProps> = ({
  totalCount,
  inStockCount,
  outOfStockCount,
  categoriesCount,
  onManageCategories,
  onAddProduct,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Menu Management</h2>
        <p className="text-xs text-slate-400 font-semibold tracking-wide mt-0.5">
          Browse, inspect, and monitor catalog products, categories, price points, and stock status.
        </p>
      </div>

      {/* Live Catalog Metrics Cards & Header Action Buttons */}
      <div className="flex items-center gap-2.5">
        <div className="bg-white border border-slate-100 px-3 py-2 rounded-2xl shadow-xs text-center min-w-[5rem]">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total</p>
          <p className="text-sm font-black text-slate-900 leading-tight">{totalCount}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-2xl shadow-xs text-center min-w-[5rem]">
          <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">In Stock</p>
          <p className="text-sm font-black text-emerald-700 leading-tight">{inStockCount}</p>
        </div>
        {outOfStockCount > 0 && (
          <div className="bg-rose-50 border border-rose-100 px-3 py-2 rounded-2xl shadow-xs text-center min-w-[5rem]">
            <p className="text-[9px] font-bold text-rose-600 uppercase tracking-wider">Out of Stock</p>
            <p className="text-sm font-black text-rose-700 leading-tight">{outOfStockCount}</p>
          </div>
        )}
        <div className="bg-amber-50 border border-amber-100 px-3 py-2 rounded-2xl shadow-xs text-center min-w-[5rem]">
          <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">Categories</p>
          <p className="text-sm font-black text-amber-700 leading-tight">{categoriesCount}</p>
        </div>

        <PermissionGate permission="menu.manage">
          <Button
            onClick={onManageCategories}
            icon={<FolderPlus className="w-4 h-4" />}
            variant="secondary"
            size="md"
            className="ml-1"
          >
            Manage Categories
          </Button>
        </PermissionGate>

        <PermissionGate permission="products.create">
          <Button
            onClick={onAddProduct}
            icon={<Plus className="w-4 h-4" />}
            variant="primary"
            size="md"
            className="ml-1"
          >
            Add Product
          </Button>
        </PermissionGate>
      </div>
    </div>
  );
};
