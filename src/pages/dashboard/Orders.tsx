/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Play, CheckCircle, Trash, ShoppingBag, Clock } from 'lucide-react';
import { formatPrice } from '../../utils/format';
import { Button, Badge, BadgeVariant, Card, ConfirmDialog, EmptyState } from '../../components/ui';
import { PermissionGate } from '../../components/auth/PermissionGate';

export interface OrderTicket {
  id: string;
  table: string;
  time: string;
  items: string;
  total: number;
  status: 'Preparing' | 'Cooking' | 'Ready' | 'Served';
}

export default function Orders() {
  const [orders, setOrders] = useState<OrderTicket[]>([]);

  const [orderToVoid, setOrderToVoid] = useState<string | null>(null);

  const handleStatusChange = (orderId: string, newStatus: OrderTicket['status']) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  const confirmVoid = () => {
    if (orderToVoid) {
      setOrders(prev => prev.filter(o => o.id !== orderToVoid));
      setOrderToVoid(null);
    }
  };

  const getStatusBadgeVariant = (status: string): BadgeVariant => {
    switch (status) {
      case 'Preparing': return 'blue';
      case 'Cooking': return 'amber';
      case 'Ready': return 'emerald';
      case 'Served': return 'slate';
      default: return 'slate';
    }
  };

  return (
    <div id="orders-screen-root" className="space-y-6">
      
      {/* Header and counter */}
      <div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Active Ticket Orders</h2>
        <p className="text-xs text-slate-400 font-semibold tracking-wide mt-0.5">Live tickets queue sent from client QR tables to POS station kitchen display.</p>
      </div>

      {/* Grid listing live order tickets or Empty State */}
      {orders.length === 0 ? (
        <EmptyState
          title="No active order tickets"
          description="There are currently no active tickets in the kitchen display queue."
          className="bg-white border border-slate-100 rounded-3xl p-10 my-4"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map(order => (
            <Card
              key={order.id}
              padding="md"
              hoverEffect
              className="flex flex-col justify-between"
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
                  
                  <Badge variant={getStatusBadgeVariant(order.status)} size="xs">
                    {order.status}
                  </Badge>
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
                    <Button
                      onClick={() => handleStatusChange(order.id, 'Cooking')}
                      variant="warning"
                      size="xs"
                      icon={<Play className="w-3 h-3 text-amber-500" />}
                    >
                      Fire
                    </Button>
                  )}
                  {order.status === 'Cooking' && (
                    <Button
                      onClick={() => handleStatusChange(order.id, 'Ready')}
                      variant="success"
                      size="xs"
                      icon={<CheckCircle className="w-3 h-3 text-emerald-500" />}
                    >
                      Complete
                    </Button>
                  )}
                  {order.status === 'Ready' && (
                    <Button
                      onClick={() => handleStatusChange(order.id, 'Served')}
                      variant="secondary"
                      size="xs"
                      icon={<CheckCircle className="w-3 h-3 text-slate-500" />}
                    >
                      Deliver
                    </Button>
                  )}
                  <PermissionGate permission="orders.cancel">
                    <button
                      type="button"
                      onClick={() => setOrderToVoid(order.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors active:scale-90 cursor-pointer"
                      title="Void order ticket"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </PermissionGate>
                </div>
              </div>

            </Card>
          ))}
        </div>
      )}

      {/* Confirm Void Dialog */}
      <ConfirmDialog
        isOpen={Boolean(orderToVoid)}
        onClose={() => setOrderToVoid(null)}
        onConfirm={confirmVoid}
        title="Void Order Ticket"
        message={`Are you sure you want to void Order #${orderToVoid}? This action will remove the ticket from the kitchen display.`}
        confirmText="Void Order"
        variant="danger"
      />

    </div>
  );
}
