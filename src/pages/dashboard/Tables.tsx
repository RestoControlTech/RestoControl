/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QrCode, ExternalLink, Printer } from 'lucide-react';
import { Table } from '../../types';
import { Button, Card, EmptyState } from '../../components/ui';

interface TablesProps {
  tables: Table[];
  onToggleStatus: (tableId: string) => void;
  onViewMenu: (tableName: string) => void;
  searchQuery: string;
}

export default function Tables({ tables, onToggleStatus, onViewMenu, searchQuery }: TablesProps) {
  
  const filteredTables = tables.filter(table => {
    const query = searchQuery.toLowerCase().trim();
    return (
      table.name.toLowerCase().includes(query) ||
      table.section.toLowerCase().includes(query) ||
      table.status.toLowerCase().includes(query)
    );
  });

  return (
    <div id="tables-screen-root" className="space-y-6">
      
      {/* Title & description */}
      <div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Tables & QR</h2>
        <p className="text-xs text-slate-400 font-semibold tracking-wide mt-0.5">Table layout status and active client QR ordering codes.</p>
      </div>

      {/* Grid containing tables cards or EmptyState */}
      {filteredTables.length === 0 ? (
        <EmptyState
          title="No tables found"
          description={searchQuery ? "No tables match your search query." : "No tables have been configured yet."}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredTables.map((table) => {
          const isOccupied = table.status === 'Occupied';
          return (
            <Card 
              key={table.id}
              padding="md"
              hoverEffect
              className="flex flex-col justify-between"
            >
              
              {/* Table Info and Header Status badge */}
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm tracking-tight leading-snug">{table.name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5 leading-none">{table.section} · <span className="font-medium text-slate-400">{table.seats} Seats</span></p>
                </div>
                
                {/* Clickable Status toggle */}
                <button
                  type="button"
                  onClick={() => onToggleStatus(table.id)}
                  title="Click to toggle status"
                  className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold border uppercase tracking-wider transition-all active:scale-[0.93] cursor-pointer ${
                    isOccupied
                      ? 'bg-orange-50 border-orange-200 text-orange-600'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  }`}
                >
                  {table.status}
                </button>
              </div>

              {/* Stylized Simulated QR code block panel */}
              <div className="bg-slate-50/70 border border-slate-100/60 rounded-xl p-4 flex flex-col items-center justify-center my-4">
                <div className="w-20 h-20 bg-white border border-slate-200/50 rounded-lg p-2.5 flex items-center justify-center shadow-xs">
                  <QrCode className="w-full h-full text-slate-800" />
                </div>
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-3">Scan to Order</p>
                <p className="text-[9px] text-slate-400/90 mt-0.5 tracking-tight font-medium lowercase select-all">{table.qrCodeUrl}</p>
              </div>

              {/* Interaction row */}
              <div className="grid grid-cols-2 gap-2 border-t border-slate-50 pt-3">
                <Button
                  onClick={() => alert(`Sending Print Job for ${table.name} QR Code to Station Printer...`)}
                  variant="secondary"
                  size="xs"
                  icon={<Printer className="w-3 h-3 text-slate-400" />}
                >
                  Print QR
                </Button>
                <Button
                  onClick={() => onViewMenu(table.name)}
                  variant="subtle-orange"
                  size="xs"
                  icon={<ExternalLink className="w-3 h-3 text-orange-500" />}
                >
                  View Menu
                </Button>
              </div>

            </Card>
          );
        })}
        </div>
      )}

    </div>
  );
}
