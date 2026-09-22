/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Download, TrendingUp, Receipt, Search, ArrowRight, Eye } from 'lucide-react';
import { Transaction } from '../../types';
import { formatPrice } from '../../utils/format';

interface SalesProps {
  transactions: Transaction[];
  searchQuery: string;
}

export default function Sales({ transactions, searchQuery }: SalesProps) {
  const [activeDateTab, setActiveDateTab] = useState('today');
  const [localSearch, setLocalSearch] = useState('');

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
        <button
          onClick={() => alert('Compiling CSV logs. Downloading Sales Summary Report...')}
          className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Stats analytics panels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* KPI Panel 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
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
        </div>

        {/* KPI Panel 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Orders</p>
            <h4 className="text-lg font-black text-slate-800 tracking-tight">128 orders</h4>
            <span className="text-[10px] text-emerald-600 font-extrabold leading-none">99.2% success rate</span>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        {/* KPI Panel 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
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
        </div>

      </div>

      {/* Main filter list rows and Search bar row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between border-b border-slate-50 pb-2">
        
        {/* Pills selections tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 w-full sm:w-auto py-0.5">
          {dateFilters.map(tab => {
            const isActive = activeDateTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveDateTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Local Search input */}
        <div className="relative flex items-center w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
          <input
            type="text"
            placeholder="Search transaction or order #..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full bg-white border border-slate-100 py-1.5 pl-9 pr-4 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500/20"
          />
        </div>

      </div>

      {/* Main receipts table container */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            
            {/* Headers */}
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="py-3 px-5">Transaction / Order</th>
                <th className="py-3 px-5">Date & Time</th>
                <th className="py-3 px-5">Table / Type</th>
                <th className="py-3 px-5">Total Amount</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>

            {/* Rows */}
            <tbody className="divide-y divide-slate-50 font-mono">
              {filteredTx.map(tx => {
                const isRefund = tx.status === 'Refunded';
                return (
                  <tr key={tx.id} className="hover:bg-slate-50/30 transition-all text-xs text-slate-700">
                    
                    {/* Order identity number */}
                    <td className="py-3.5 px-5 font-sans">
                      <div className="font-extrabold text-slate-800">{tx.orderNumber}</div>
                      <div className="text-[10px] text-slate-400 font-semibold leading-none mt-1">Order #{(1000 + Math.floor(Math.random() * 99))}</div>
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-5 text-slate-500 font-bold">
                      {tx.dateTime}
                    </td>

                    {/* Table assignment / Order flow type */}
                    <td className="py-3.5 px-5 font-sans flex items-center gap-2 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                      <div>
                        <span className="font-extrabold text-slate-800">{tx.table}</span>
                        <span className="text-[10px] text-slate-400 font-semibold ml-1.5">({tx.type})</span>
                      </div>
                    </td>

                    {/* Pricing with tabular figures alignment */}
                    <td className={`py-3.5 px-5 font-bold ${isRefund ? 'text-red-500' : 'text-slate-800'}`}>
                      {formatPrice(tx.amount)}
                    </td>

                    {/* Action invoice view pill */}
                    <td className="py-3.5 px-5 text-right font-sans">
                      <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase border tracking-wider ${
                        isRefund 
                          ? 'bg-red-50 text-red-700 border-red-100/35' 
                          : 'bg-slate-50 text-slate-600 border-slate-100/60'
                      }`}>
                        {tx.status}
                      </span>
                      <button 
                        onClick={() => alert(`Pulling Order Ticket Invoice receipt for ${tx.orderNumber} ($${Math.abs(tx.amount).toFixed(2)})...`)}
                        className="ml-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-lg active:scale-95"
                        title="View details"
                      >
                        <Eye className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>

                  </tr>
                );
              })}
            </tbody>

          </table>
        </div>

        {/* Table footer pagination */}
        <div className="bg-slate-50/50 border-t border-slate-100 px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400 font-bold select-none">
          <span>Showing 1 to {filteredTx.length} of 128 transactions</span>
          
          <div className="flex items-center gap-1 font-mono font-black text-xs">
            <button className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-600 shadow-xs">1</button>
            <button className="px-2 py-1 rounded text-slate-400 hover:bg-slate-100">2</button>
            <button className="px-2 py-1 rounded text-slate-400 hover:bg-slate-100">3</button>
            <span className="px-1 text-slate-300">...</span>
            <button className="px-2 py-1 rounded text-slate-400 hover:bg-slate-100">19</button>
            <button className="px-2.5 py-1 rounded hover:bg-slate-100 text-slate-500 flex items-center gap-0.5 ml-1.5 font-sans text-[10px] font-black uppercase">
              <span>Next</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
