/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MenuItem } from '../../types';
import { Button } from '../ui';
import { PermissionGate } from '../auth/PermissionGate';

export interface AvailabilityToggleProps {
  item: MenuItem;
  onToggleStock?: (item: MenuItem) => void;
  isToggling?: boolean;
}

export const AvailabilityToggle: React.FC<AvailabilityToggleProps> = ({
  item,
  onToggleStock,
  isToggling = false,
}) => {
  if (!onToggleStock) return null;

  return (
    <PermissionGate permission="products.update">
      <Button
        onClick={() => onToggleStock(item)}
        variant={item.inStock ? 'secondary' : 'subtle-orange'}
        size="xs"
        disabled={isToggling}
      >
        {isToggling ? 'Updating...' : item.inStock ? 'Set Unavailable' : 'Set Available'}
      </Button>
    </PermissionGate>
  );
};
