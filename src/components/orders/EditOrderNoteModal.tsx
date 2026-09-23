/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Order } from '../../types';
import { Modal, Button } from '../ui';

export interface EditOrderNoteModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onSaveNote: (orderId: string, note: string) => void;
}

export const EditOrderNoteModal: React.FC<EditOrderNoteModalProps> = ({
  isOpen,
  order,
  onClose,
  onSaveNote,
}) => {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (order) {
      setNote(order.note || '');
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const handleSave = () => {
    onSaveNote(order.id, note.trim());
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Kitchen Note - Order ${order.orderNumber}`}
      subtitle={`Table: ${order.table}`}
      maxWidth="md"
    >
      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
            Kitchen Note Instructions
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Enter special preparation requests (e.g., Less spicy, no onions, extra sauce)..."
            className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button onClick={onClose} variant="outline" size="sm">
            Cancel
          </Button>
          <Button onClick={handleSave} variant="primary" size="sm" icon={<Save className="w-4 h-4" />}>
            Save Kitchen Note
          </Button>
        </div>
      </div>
    </Modal>
  );
};
