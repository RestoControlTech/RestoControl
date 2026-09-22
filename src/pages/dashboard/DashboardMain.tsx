/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TrendingUp, Users, ShoppingBag, Utensils, AlertCircle, Clock } from 'lucide-react';
import { formatPrice } from '../../utils/format';
import { Card } from '../../components/ui';

export default function DashboardMain() {
  return (
    <div id="dashboard-main-root" className="space-y-6">
      
      {/* Page Title Header */}
      <div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Executive Dashboard</h2>
        <p className="text-xs text-slate-400 font-semibold tracking-wide mt-0.5">Real-time terminal telemetry and active bistro operations summary.</p>
      </div>

      {/* KPI Stats cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI Card 1 */}
        <Card padding="lg" className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Sales Revenue</p>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">{formatPrice(3842.50)}</h3>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>+14.2% vs yesterday</span>
            </span>
          </div>
          <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </Card>

        {/* KPI Card 2 */}
        <Card padding="lg" className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Orders</p>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">12 Active</h3>
            <span className="text-[10px] text-slate-400 font-semibold">99.2% kitchen success rate</span>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </Card>

        {/* KPI Card 3 */}
        <Card padding="lg" className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Staff On Duty</p>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">5 Members</h3>
            <span className="text-[10px] text-emerald-600 font-bold">Registers active</span>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </Card>

        {/* KPI Card 4 */}
        <Card padding="lg" className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Low Stock Items</p>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">1 Alert</h3>
            <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Mochi Ice Cream (3 left)</span>
            </span>
          </div>
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <Utensils className="w-5 h-5" />
          </div>
        </Card>

      </div>

      {/* Main split sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column - Live Activity stream */}
        <Card padding="lg" className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Live Activity Stream</h4>
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Real-time feeds</span>
            </span>
          </div>

          <div className="divide-y divide-slate-50">
            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-orange-500 rounded-full"></div>
                <div>
                  <p className="text-xs font-bold text-slate-800">New Order Sent from Table 04</p>
                  <p className="text-[10px] text-slate-400 font-medium">Tonkotsu Ramen, Yuzu Soda · $17.00</p>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-bold">2 mins ago</span>
            </div>
            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Order #TX-9042 Paid Successfully</p>
                  <p className="text-[10px] text-slate-400 font-medium">Table 09 · $33.50 via Visa Card</p>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-bold">12 mins ago</span>
            </div>
            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-slate-300 rounded-full"></div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Staff Shift Started: Alex M.</p>
                  <p className="text-[10px] text-slate-400 font-medium">Assigned to Cashier terminal 01</p>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-bold">45 mins ago</span>
            </div>
          </div>
        </Card>

        {/* Right Column - Kitchen Course status */}
        <Card padding="lg" className="space-y-4">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Kitchen Queue Status</h4>
          
          <div className="space-y-3.5">
            <div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
                <span>Ramen Station</span>
                <span>80% Speed</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-orange-500 h-full rounded-full" style={{ width: '80%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
                <span>Sushi Station</span>
                <span>95% Speed</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '95%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
                <span>Appetizers & Fryer</span>
                <span>40% Busy</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: '40%' }}></div>
              </div>
            </div>
          </div>
        </Card>

      </div>

    </div>
  );
}
