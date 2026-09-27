/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MenuItem } from '../../types';
import { MenuCard } from './MenuCard';

export interface MenuGridProps {
  items: MenuItem[];
  onEdit: (item: MenuItem) => void;
  onDelete?: (itemId: string) => void;
  onToggleStock?: (item: MenuItem) => void;
  togglingId?: string | null;
}

export const MenuGrid: React.FC<MenuGridProps> = ({
  items,
  onEdit,
  onDelete,
  onToggleStock,
  togglingId,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <MenuCard
          key={item.id}
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleStock={onToggleStock}
          isToggling={togglingId === item.id}
        />
      ))}
    </div>
  );
};
