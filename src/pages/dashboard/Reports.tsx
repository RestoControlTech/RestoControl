/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FileBarChart, Download, TrendingUp, DollarSign, Users, ShoppingBag } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { PermissionGate } from '../../components/auth/PermissionGate';
import { formatPrice } from '../../utils/format';

export default function Reports() {
  return (
    <div id="reports-screen-root" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Financial & Operations Reports</h2>
          <p className="text-xs text-slate-400 font-semibold tracking-wide mt-0.5">Comprehensive bistro metrics, revenue reports, and audit logs.</p>
        </div>
        <PermissionGate permission="reports.view">
          <Button
            variant="primary"
            size="md"
            icon={<Download className="w-4 h-4" />}
            onClick={() => alert('Generating full PDF audit report...')}
          >
            Export Report
          </Button>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="lg" className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Gross Revenue</p>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">{formatPrice(94820.00)}</h3>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>+18.5% YoY</span>
            </span>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </Card>

        <Card padding="lg" className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Guests Served</p>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">3,420 Guests</h3>
            <span className="text-[10px] text-slate-400 font-semibold">Average 114 / day</span>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </Card>

        <Card padding="lg" className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Ticket Time</p>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">14.2 Mins</h3>
            <span className="text-[10px] text-emerald-600 font-bold">Within target speed</span>
          </div>
          <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </Card>
      </div>

      <Card padding="lg" className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-50 pb-3">
          <div className="flex items-center gap-2">
            <FileBarChart className="w-4 h-4 text-orange-600" />
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Report Summary by Station</h4>
          </div>
          <span className="text-[10px] font-bold text-slate-400">Current Month</span>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
            <span>Bar & Drinks Station</span>
            <span>$14,230.00 (15%)</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-orange-500 h-full rounded-full" style={{ width: '15%' }}></div>
          </div>

          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
            <span>Kitchen & Ramen Station</span>
            <span>$52,140.00 (55%)</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: '55%' }}></div>
          </div>

          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
            <span>Sushi & Cold Prep Station</span>
            <span>$28,450.00 (30%)</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full" style={{ width: '30%' }}></div>
          </div>
        </div>
      </Card>
    </div>
  );
}
