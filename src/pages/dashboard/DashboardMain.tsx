/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrendingUp, Users, ShoppingBag, Utensils, Clock } from 'lucide-react';
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
            <h3 className="text-lg font-black text-slate-800 tracking-tight">{formatPrice(0)}</h3>
            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
              <span>No sales recorded yet</span>
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
            <h3 className="text-lg font-black text-slate-800 tracking-tight">0 Active</h3>
            <span className="text-[10px] text-slate-400 font-semibold">No open tickets</span>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </Card>

        {/* KPI Card 3 */}
        <Card padding="lg" className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Staff On Duty</p>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">0 Members</h3>
            <span className="text-[10px] text-slate-400 font-semibold">No active shifts</span>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </Card>

        {/* KPI Card 4 */}
        <Card padding="lg" className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Low Stock Items</p>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">0 Alerts</h3>
            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
              <span>All inventory normal</span>
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

          <div className="py-8 text-center text-xs text-slate-400 font-semibold">
            No recent activity
          </div>
        </Card>

        {/* Right Column - Kitchen Course status */}
        <Card padding="lg" className="space-y-4">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Kitchen Queue Status</h4>
          
          <div className="py-8 text-center text-xs text-slate-400 font-semibold">
            No active kitchen tickets
          </div>
        </Card>

      </div>

    </div>
  );
}
