/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Table as TableIcon, MapPin, Users, Plus } from 'lucide-react';
import { Table } from '../../types';
import { Modal, Button, Input } from '../ui';

export interface AddTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTable: (table: { name: string; section: string; seats: number }) => {
    success: boolean;
    error?: string;
    table?: Table;
  };
  existingTables: Table[];
}

const DEFAULT_SECTIONS = ['Main Dining', 'Indoor Booths', 'Outdoor Terrace'];

export const AddTableModal: React.FC<AddTableModalProps> = ({
  isOpen,
  onClose,
  onAddTable,
  existingTables,
}) => {
  const [name, setName] = useState('');
  const [section, setSection] = useState('Main Dining');
  const [customSection, setCustomSection] = useState('');
  const [isCustomSection, setIsCustomSection] = useState(false);
  const [seats, setSeats] = useState(4);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setSection('Main Dining');
    setCustomSection('');
    setIsCustomSection(false);
    setSeats(4);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setError('Table number or name is required.');
      return;
    }

    // Check duplicate table name (case-insensitive)
    const isDuplicate = existingTables.some(
      (t) => t.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (isDuplicate) {
      setError(`Table "${cleanName}" already exists. Please choose a different table number or name.`);
      return;
    }

    const numSeats = Number(seats);
    if (isNaN(numSeats) || numSeats < 1) {
      setError('Number of seats must be at least 1.');
      return;
    }

    const finalSection = isCustomSection ? customSection.trim() || 'Main Dining' : section;

    const result = onAddTable({
      name: cleanName,
      section: finalSection,
      seats: numSeats,
    });

    if (result.success) {
      handleClose();
    } else {
      setError(result.error || 'Failed to create table. Please try again.');
    }
  };

  // Extract distinct existing sections
  const distinctSections = Array.from(
    new Set([...DEFAULT_SECTIONS, ...existingTables.map((t) => t.section)])
  ).filter(Boolean);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Table"
      subtitle="Configure table number, dining section, and seating capacity."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div
            id="add-table-error"
            className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold leading-relaxed"
          >
            {error}
          </div>
        )}

        {/* Table Number or Name */}
        <Input
          label="Table Number or Name"
          id="table-name-input"
          placeholder="e.g. Table 09 or VIP 01"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          icon={<TableIcon className="w-4 h-4 text-slate-400" />}
          required
          autoFocus
        />

        {/* Dining Section / Area */}
        <div className="space-y-1">
          <label
            htmlFor="table-section-select"
            className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400"
          >
            Section / Area <span className="text-orange-500">*</span>
          </label>
          <div className="flex gap-2">
            {!isCustomSection ? (
              <div className="relative flex-1">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <select
                  id="table-section-select"
                  value={section}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomSection(true);
                    } else {
                      setSection(e.target.value);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 pl-9 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white transition-colors"
                >
                  {distinctSections.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                  <option value="__custom__">+ Add Custom Section...</option>
                </select>
              </div>
            ) : (
              <div className="flex-1 flex gap-2">
                <Input
                  id="custom-section-input"
                  placeholder="Enter section name..."
                  value={customSection}
                  onChange={(e) => setCustomSection(e.target.value)}
                  icon={<MapPin className="w-4 h-4 text-slate-400" />}
                  required
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setIsCustomSection(false);
                    setCustomSection('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Number of Seats */}
        <Input
          label="Number of Seats"
          id="table-seats-input"
          type="number"
          min="1"
          max="30"
          value={seats}
          onChange={(e) => {
            setSeats(parseInt(e.target.value, 10) || 1);
            if (error) setError(null);
          }}
          icon={<Users className="w-4 h-4 text-slate-400" />}
          required
        />

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            id="btn-save-table"
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
          >
            Create Table
          </Button>
        </div>
      </form>
    </Modal>
  );
};
