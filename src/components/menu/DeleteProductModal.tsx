/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MenuItem } from '../../types';
import { ConfirmDialog } from '../ui';

export interface DeleteProductModalProps {
  isOpen: boolean;
  item: MenuItem | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteProductModal: React.FC<DeleteProductModalProps> = ({
  isOpen,
  item,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={() => {
        if (!isDeleting) onClose();
      }}
      onConfirm={onConfirm}
      title="Delete Product"
      message={
        item
          ? `Are you sure you want to delete "${item.name}" (#${item.id.replace('food-', 'D')})? This action cannot be undone and will immediately remove it from the menu catalog and POS system.`
          : 'Are you sure you want to delete this menu item?'
      }
      confirmText="Delete Product"
      cancelText="Cancel"
      variant="danger"
      isLoading={isDeleting}
    />
  );
};
