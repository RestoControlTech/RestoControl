/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { MenuItem } from '../../types';
import { formatPrice } from '../../utils/format';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  Badge,
} from '../ui';
import { PermissionGate } from '../auth/PermissionGate';
import { AvailabilityToggle } from './AvailabilityToggle';
import { getOptimizedCloudinaryUrl, DEFAULT_PRODUCT_IMAGE } from '../../services/cloudinary';

export interface MenuTableProps {
  items: MenuItem[];
  onEdit: (item: MenuItem) => void;
  onDelete?: (itemId: string) => void;
  onToggleStock?: (item: MenuItem) => void;
  togglingId?: string | null;
}

export const MenuTable: React.FC<MenuTableProps> = ({
  items,
  onEdit,
  onDelete,
  onToggleStock,
  togglingId,
}) => {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Item #</TableHeaderCell>
          <TableHeaderCell>Product</TableHeaderCell>
          <TableHeaderCell>Category</TableHeaderCell>
          <TableHeaderCell>Price</TableHeaderCell>
          <TableHeaderCell>Tag / Ribbon</TableHeaderCell>
          <TableHeaderCell>Availability</TableHeaderCell>
          <TableHeaderCell className="text-right">Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-extrabold text-slate-400 text-[10px]">
              #{item.id.replace('food-', 'D')}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-3">
                <img
                  src={getOptimizedCloudinaryUrl(item.image, { width: 90, height: 90, crop: 'fill' }) || DEFAULT_PRODUCT_IMAGE}
                  alt={item.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                  }}
                  className={`w-9 h-9 rounded-xl object-cover shrink-0 border border-slate-100 ${
                    item.inStock ? '' : 'opacity-40 grayscale'
                  }`}
                  loading="lazy"
                />
                <div>
                  <h4 className="font-extrabold text-slate-800 text-xs">{item.name}</h4>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="slate" size="xs" className="font-bold text-[10px] capitalize">
                {item.category}
              </Badge>
            </TableCell>
            <TableCell className="font-black text-slate-900 text-xs">
              {formatPrice(item.price)}
            </TableCell>
            <TableCell>
              {item.badge ? (
                <Badge variant="orange" size="xs" className="font-extrabold text-[9px] uppercase">
                  {item.badge}
                </Badge>
              ) : (
                <span className="text-[10px] text-slate-300 font-semibold">—</span>
              )}
            </TableCell>
            <TableCell>
              {item.inStock ? (
                <Badge variant="emerald" size="xs" className="font-extrabold text-[9px]">
                  In Stock
                </Badge>
              ) : (
                <Badge variant="rose" size="xs" className="font-extrabold text-[9px]">
                  Out of Stock
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1.5">
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
                  isToggling={togglingId === item.id}
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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
