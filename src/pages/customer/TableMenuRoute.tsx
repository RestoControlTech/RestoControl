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
          <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">រកមិនឃើញតុទេ</h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            មិនមានទិន្នន័យតុ <code className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-800 font-mono font-semibold">"{tableId}"</code> នៅក្នុងប្រព័ន្ធទេ។ សូមស្កេនកូដ QR តុឡើងវិញ។
          </p>
          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={<Home className="w-3.5 h-3.5" />}
              onClick={() => navigate('/pos')}
            >
              ត្រឡប់ទៅកាន់ POS
            </Button>
            {tables.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                icon={<ArrowLeft className="w-3.5 h-3.5" />}
                onClick={() => navigate(`/menu/${tables[0].id}`)}
              >
                បើកម៉ឺនុយ {tables[0].name}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="client-app-root" className="relative">
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
