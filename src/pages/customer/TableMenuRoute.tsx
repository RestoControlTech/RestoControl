/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QrCode, ArrowLeft, Home } from 'lucide-react';
import { Table, MenuItem, Category } from '../../types';
import QRMenu, { QROrderSubmission } from './QRMenu';
import { Button } from '../../components/ui';

interface TableMenuRouteProps {
  tables: Table[];
  menuItems: MenuItem[];
  categories: Category[];
  onSendOrderToKitchen: (orderOrCount: QROrderSubmission | number, total?: number) => void;
}

export const TableMenuRoute: React.FC<TableMenuRouteProps> = ({
  tables,
  menuItems,
  categories,
  onSendOrderToKitchen,
}) => {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();

  // Match table by id (case-insensitive) or slugified name (e.g. 't1', 'table-01', 'table01')
  const cleanId = (tableId || '').trim().toLowerCase();
  const matchedTable = tables.find((t) => {
    const tId = t.id.toLowerCase();
    const tSlug = t.name.toLowerCase().replace(/[\s-_]+/g, '');
    const cleanSearch = cleanId.replace(/[\s-_]+/g, '');
    return tId === cleanId || tSlug === cleanSearch;
  });

  if (!matchedTable) {
    return (
      <div id="table-not-found-screen" className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl border border-stone-200">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <QrCode className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">Table not found</h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            The table reference <code className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-800 font-mono font-semibold">"{tableId}"</code> was not found. Please scan a valid table QR code or notify staff.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={<Home className="w-3.5 h-3.5" />}
              onClick={() => navigate('/pos')}
            >
              Return to POS Station
            </Button>
            {tables.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                icon={<ArrowLeft className="w-3.5 h-3.5" />}
                onClick={() => navigate(`/menu/${tables[0].id}`)}
              >
                Open {tables[0].name} Menu
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="client-app-root" className="relative">
      <div
        className="fixed top-2 left-2 z-50 bg-stone-900 text-white rounded-xl py-1 px-2.5 font-bold text-[10px] tracking-tight hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer border border-stone-800 flex items-center gap-1"
        onClick={() => navigate('/pos')}
      >
        <span>← Back to POS Station</span>
      </div>
      <QRMenu
        initialMenuItems={menuItems}
        categories={categories}
        tableName={matchedTable.name}
        tableId={matchedTable.id}
        onSendOrderToKitchen={onSendOrderToKitchen}
      />
    </div>
  );
};
