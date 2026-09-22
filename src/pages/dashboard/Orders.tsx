/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Play, CheckCircle, Trash, ShoppingBag, Clock } from 'lucide-react';
import { formatPrice } from '../../utils/format';

export default function Orders() {
  const [orders, setOrders] = useState([
    { id: '1026', table: 'Table 04', time: '19:42', items: 'Tonkotsu Ramen, Spicy Salmon Roll, Yuzu Soda', total: 25.50, status: 'Preparing' },
    { id: '1025', table: 'Table 01', time: '19:35', items: 'Pork Gyoza 5pc, Black Garlic Miso, Matcha Iced Latte', total: 26.00, status: 'Preparing' },
    { id: '1024', table: 'Table 03', time: '19:18', items: 'Tuna Nigiri 2pc x2, Crispy Tempura Roll, Shoyu Chicken Ramen', total: 35.50, status: 'Cooking' },
    { id: '1023', table: 'Table 05', time: '18:52', items: 'Sea Salt Edamame, Tonkotsu Ramen x2, Matcha Iced Latte x2', total: 42.50, status: 'Ready' },
    { id: '1022', table: 'Table 08', time: '18:31', items: 'Pork Gyoza 5pc x3, Yuzu Soda x4', total: 33.50, status: 'Served' },
  ]);

  const handleStatusChange = (orderId: string, newStatus: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  const handleVoid = (orderId: string) => {
    if (confirm(`Are you sure you want to void Order #${orderId}?`)) {
      setOrders(prev => prev.filter(o => o.id !== orderId));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Preparing': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Cooking': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Ready': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Served': return 'bg-slate-50 text-slate-500 border-slate-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  return (
    <div id="orders-screen-root" className="space-y-6">
      
      {/* Header and counter */}
      <div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Active Ticket Orders</h2>
        <p className="text-xs text-slate-400 font-semibold tracking-wide mt-0.5">Live tickets queue sent from client QR tables to POS station kitchen display.</p>
      </div>

      {/* Grid listing live order tickets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map(order => (
          <div
            key={order.id}
            className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-200 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.015)]"
          >
            <div>
              <div className="flex justify-between items-start border-b border-slate-50 pb-2.5">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 leading-none">
                    <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                    <span>Order #{order.id}</span>
                  </h3>
                  <p className="text-[9px] text-slate-400 font-black tracking-wider uppercase mt-1 flex items-center gap-1 leading-none">
                    <Clock className="w-3 h-3 text-slate-300" />
                    <span>Submitted {order.time} · <span className="text-orange-500 font-black">{order.table}</span></span>
                  </p>
                </div>
                
                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${getStatusBadge(order.status)}`}>
                  {order.status}
                </span>
              </div>

              {/* Items List */}
              <div className="py-4 text-xs font-bold text-slate-700 leading-relaxed min-h-[4.5rem]">
                {order.items}
              </div>
            </div>

            {/* Total and Actions Row */}
            <div className="border-t border-slate-50 pt-3 flex items-center justify-between mt-2.5">
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">Total Bill</p>
                <p className="text-sm font-black text-slate-900 mt-1 leading-none">{formatPrice(order.total)}</p>
              </div>

              <div className="flex items-center gap-1.5">
                {order.status === 'Preparing' && (
                  <button
                    onClick={() => handleStatusChange(order.id, 'Cooking')}
                    className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-black text-[10px] py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors active:scale-95 border border-amber-100/40"
                  >
                    <Play className="w-3 h-3 text-amber-500" />
                    <span>Fire</span>
                  </button>
                )}
                {order.status === 'Cooking' && (
                  <button
                    onClick={() => handleStatusChange(order.id, 'Ready')}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black text-[10px] py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors active:scale-95 border border-emerald-100/40"
                  >
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    <span>Complete</span>
                  </button>
                )}
                {order.status === 'Ready' && (
                  <button
                    onClick={() => handleStatusChange(order.id, 'Served')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-[10px] py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors active:scale-95 border border-slate-200/50"
                  >
                    <CheckCircle className="w-3 h-3 text-slate-500" />
                    <span>Deliver</span>
                  </button>
                )}
                <button
                  onClick={() => handleVoid(order.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors active:scale-90"
                  title="Void order ticket"
                >
                  <Trash className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
