/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { MenuItem } from '../../types';
import { formatPrice } from '../../utils/format';
import { Card, Badge } from '../ui';
import { PermissionGate } from '../auth/PermissionGate';
import { AvailabilityToggle } from './AvailabilityToggle';

export interface MenuCardProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete?: (itemId: string) => void;
  onToggleStock?: (item: MenuItem) => void;
  isToggling?: boolean;
}

export const MenuCard: React.FC<MenuCardProps> = ({
  item,
  onEdit,
  onDelete,
  onToggleStock,
  isToggling = false,
}) => {
  return (
    <Card padding="sm" hoverEffect className="flex gap-3.5 bg-white border border-slate-100 rounded-2xl">
      {/* Left Image Box */}
      <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-50 shrink-0 border border-slate-100">
        <img
          src={item.image}
          alt={item.name}
          className={`w-full h-full object-cover transition-transform duration-300 ${
            item.inStock ? 'group-hover:scale-105' : 'opacity-40 grayscale'
          }`}
        />
        <span className="absolute bottom-1 right-1 bg-stone-900/80 text-white font-extrabold text-[8px] px-1 py-0.5 rounded shadow-xs">
          #{item.id.replace('food-', 'D')}
        </span>

        {/* Overlay badge if Out of Stock */}
        {!item.inStock && (
          <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center p-1">
            <span className="bg-red-600 text-white font-black text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded shadow-xs text-center leading-tight">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Right Food Details */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start justify-between gap-1.5">
            <div className="min-w-0">
              {item.badge && (
                <Badge variant="orange" size="xs" className="mb-1 uppercase font-extrabold text-[9px]">
                  {item.badge}
                </Badge>
              )}
              <h3 className="font-extrabold text-slate-800 text-xs truncate leading-snug">{item.name}</h3>
            </div>
            <span className="font-black text-slate-900 text-xs shrink-0">{formatPrice(item.price)}</span>
          </div>
          <p className="text-[10px] text-slate-500 line-clamp-1 mt-1 leading-relaxed">{item.description}</p>
        </div>

        {/* Status Stock & Action Toolbar */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-2">
          <div className="flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${item.inStock ? 'bg-emerald-500 shadow-xs' : 'bg-red-500'}`}></span>
            <span className={`text-[10px] font-extrabold ${item.inStock ? 'text-emerald-700' : 'text-red-600'}`}>
              {item.inStock ? 'In Stock' : 'Out of Stock'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <PermissionGate permission="products.update">
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="p-1 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors active:scale-90 cursor-pointer"
                title="Edit product"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </PermissionGate>

            <AvailabilityToggle
              item={item}
              onToggleStock={onToggleStock}
              isToggling={isToggling}
            />

            {onDelete && (
              <PermissionGate permission="products.delete">
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors active:scale-90 cursor-pointer"
                  title="Delete item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </PermissionGate>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
