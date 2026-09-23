/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Download, TrendingUp, Receipt, ArrowRight, Eye } from 'lucide-react';
import { Transaction } from '../../types';
import { formatPrice } from '../../utils/format';
import {
  Button,
  Tabs,
  Badge,
  SearchBar,
  Card,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  Modal,
} from '../../components/ui';
import { PermissionGate } from '../../components/auth/PermissionGate';

interface SalesProps {
  transactions: Transaction[];
  searchQuery: string;
}

export default function Sales({ transactions, searchQuery }: SalesProps) {
  const [activeDateTab, setActiveDateTab] = useState('today');
  const [localSearch, setLocalSearch] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const dateFilters = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: '7days', label: 'Last 7 Days' },
    { id: 'month', label: 'Month' },
  ];

  const filteredTx = transactions.filter(tx => {
    const query = (localSearch || searchQuery).toLowerCase().trim();
    return (
      tx.orderNumber.toLowerCase().includes(query) ||
      tx.table.toLowerCase().includes(query) ||
      tx.type.toLowerCase().includes(query) ||
      tx.dateTime.toLowerCase().includes(query) ||
      tx.status.toLowerCase().includes(query)
    );
  });

  return (
    <div id="sales-screen-root" className="space-y-6">
      
      {/* Title & export actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Sales History</h2>
          <p className="text-xs text-slate-400 font-semibold tracking-wide mt-0.5">Historical transactions, payment summaries, and daily receipts.</p>
        </div>
        <PermissionGate permission="sales.view">
          <Button
            onClick={() => alert('Compiling CSV logs. Downloading Sales Summary Report...')}
            icon={<Download className="w-4 h-4" />}
            variant="primary"
            size="md"
          >
            Export CSV
          </Button>
        </PermissionGate>
      </div>

      {/* Stats analytics panels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* KPI Panel 1 */}
        <Card padding="lg" className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Revenue</p>
            <h4 className="text-lg font-black text-slate-800 tracking-tight">{formatPrice(3842.50)}</h4>
            <span className="text-[9px] text-emerald-600 font-extrabold flex items-center gap-0.5 leading-none">
              <TrendingUp className="w-3 h-3" />
              <span>+14.2% vs yesterday</span>
            </span>
          </div>
          <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </Card>

        {/* KPI Panel 2 */}
        <Card padding="lg" className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Orders</p>
            <h4 className="text-lg font-black text-slate-800 tracking-tight">128 orders</h4>
            <span className="text-[10px] text-emerald-600 font-extrabold leading-none">99.2% success rate</span>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
        </Card>

        {/* KPI Panel 3 */}
        <Card padding="lg" className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Average Order</p>
            <h4 className="text-lg font-black text-slate-800 tracking-tight">{formatPrice(30.01)}</h4>
            <span className="text-[9px] text-emerald-600 font-extrabold flex items-center gap-0.5 leading-none">
              <TrendingUp className="w-3 h-3" />
              <span>+$2.15 average</span>
            </span>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </Card>

      </div>

      {/* Main filter list rows and Search bar row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between border-b border-slate-50 pb-2">
        
        {/* Pills selections tabs */}
        <Tabs
          tabs={dateFilters}
          activeTab={activeDateTab}
          onChange={setActiveDateTab}
          variant="dark"
          className="w-full sm:w-auto"
        />

        {/* Local Search input */}
        <div className="w-full sm:w-64">
          <SearchBar
            value={localSearch}
            onChange={setLocalSearch}
            placeholder="Search transaction or order #..."
            size="sm"
            className="bg-white"
          />
        </div>

      </div>

      {/* Main receipts table container */}
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Transaction / Order</TableHeaderCell>
            <TableHeaderCell>Date & Time</TableHeaderCell>
            <TableHeaderCell>Table / Type</TableHeaderCell>
            <TableHeaderCell>Total Amount</TableHeaderCell>
            <TableHeaderCell className="text-right">Action</TableHeaderCell>
          </tr>
        </TableHead>

        <TableBody className="font-mono">
          {filteredTx.map(tx => {
            const isRefund = tx.status === 'Refunded';
            return (
              <TableRow key={tx.id}>
                
                {/* Order identity number */}
                <TableCell className="font-sans">
                  <div className="font-extrabold text-slate-800">{tx.orderNumber}</div>
                  <div className="text-[10px] text-slate-400 font-semibold leading-none mt-1">Order #{tx.id.replace('tx-', '')}</div>
                </TableCell>

                {/* Timestamp */}
                <TableCell className="text-slate-500 font-bold">
                  {tx.dateTime}
                </TableCell>

                {/* Table assignment / Order flow type */}
                <TableCell className="font-sans">
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                    <div>
                      <span className="font-extrabold text-slate-800">{tx.table}</span>
                      <span className="text-[10px] text-slate-400 font-semibold ml-1.5">({tx.type})</span>
                    </div>
                  </div>
                </TableCell>

                {/* Pricing with tabular figures alignment */}
                <TableCell className={`font-bold ${isRefund ? 'text-red-500' : 'text-slate-800'}`}>
                  {formatPrice(tx.amount)}
                </TableCell>

                {/* Action invoice view pill */}
                <TableCell className="text-right font-sans">
                  <Badge variant={isRefund ? 'red' : 'slate'} size="sm">
                    {tx.status}
                  </Badge>
                  <button 
                    type="button"
                    onClick={() => setSelectedTx(tx)}
                    className="ml-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-lg active:scale-95 cursor-pointer"
                    title="View details"
                  >
                    <Eye className="w-3.5 h-3.5 inline" />
                  </button>
                </TableCell>

              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Table footer pagination */}
      <div className="bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400 font-bold select-none">
        <span>Showing 1 to {filteredTx.length} of 128 transactions</span>
        
        <div className="flex items-center gap-1 font-mono font-black text-xs">
          <button className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-600 shadow-xs cursor-pointer">1</button>
          <button className="px-2 py-1 rounded text-slate-400 hover:bg-slate-100 cursor-pointer">2</button>
          <button className="px-2 py-1 rounded text-slate-400 hover:bg-slate-100 cursor-pointer">3</button>
          <span className="px-1 text-slate-300">...</span>
          <button className="px-2 py-1 rounded text-slate-400 hover:bg-slate-100 cursor-pointer">19</button>
          <button className="px-2.5 py-1 rounded hover:bg-slate-100 text-slate-500 flex items-center gap-0.5 ml-1.5 font-sans text-[10px] font-black uppercase cursor-pointer">
            <span>Next</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Transaction Details Modal */}
      <Modal
        isOpen={Boolean(selectedTx)}
        onClose={() => setSelectedTx(null)}
        title={selectedTx ? `Invoice Receipt: ${selectedTx.orderNumber}` : ''}
        maxWidth="sm"
      >
        {selectedTx && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Table:</span>
                <span className="font-extrabold text-slate-800">{selectedTx.table}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Type:</span>
                <span className="font-extrabold text-slate-800">{selectedTx.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Date & Time:</span>
                <span className="font-extrabold text-slate-800">{selectedTx.dateTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Status:</span>
                <Badge variant={selectedTx.status === 'Refunded' ? 'red' : 'emerald'} size="xs">
                  {selectedTx.status}
                </Badge>
              </div>
              <div className="border-t border-slate-200/60 pt-2 flex justify-between font-black text-sm text-slate-900">
                <span>Total:</span>
                <span>{formatPrice(selectedTx.amount)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedTx(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
