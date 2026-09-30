/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Clock,
  Printer,
  FileText,
  CreditCard,
  ArrowRight,
  Play,
  CheckCircle,
  Utensils,
  Check,
} from 'lucide-react';
import { Order, OrderStatus, PaymentStatusType, Table } from '../../types';
import { MOCK_ORDERS } from '../../data/orders';
import { formatPrice } from '../../utils/format';
import { Button, Badge, Card, SearchBar, EmptyState } from '../../components/ui';
import { OrderDetailsModal, OrderReceiptModal } from '../../components/orders';
import { useOrderNotificationStore } from '../../store/orderNotification.store';

export interface OrdersProps {
  initialOrders?: Order[];
  orders?: Order[];
  tables?: Table[];
  onUpdateOrders?: React.Dispatch<React.SetStateAction<Order[]>>;
}

export type OperationalTab = 'ALL' | 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED' | 'UNPAID';

export type NormalizedOrderStatus = 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

// Status Normalizer: maps various status strings into clear restaurant kitchen states
export const getNormalizedStatus = (status: OrderStatus | string): NormalizedOrderStatus => {
  if (status === 'NEW' || status === 'Pending' || status === 'Draft') return 'NEW';
  if (status === 'PREPARING' || status === 'Preparing' || status === 'Cooking') return 'PREPARING';
  if (status === 'READY' || status === 'Ready') return 'READY';
  if (status === 'COMPLETED' || status === 'Completed' || status === 'Served') return 'COMPLETED';
  if (status === 'Cancelled') return 'CANCELLED';
  return 'NEW';
};

// Payment Normalizer: strictly separate from kitchen status
export const getNormalizedPayment = (payment: PaymentStatusType | string): 'PAID' | 'UNPAID' => {
  if (payment === 'PAID' || payment === 'Paid') return 'PAID';
  return 'UNPAID';
};

export default function Orders({
  initialOrders = MOCK_ORDERS,
  orders: externalOrders,
  tables = [],
  onUpdateOrders,
}: OrdersProps = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightedOrderId = searchParams.get('highlight') || searchParams.get('orderId');

  const [localOrders, setLocalOrders] = useState<Order[]>(initialOrders);

  const orders = externalOrders || localOrders;
  const setOrders = onUpdateOrders || setLocalOrders;

  // Selected order modals
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  // Operational tab & search states
  const [activeTab, setActiveTab] = useState<OperationalTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Order Source Resolver (Staff-facing UI retains source internally without displaying "Online")
  const getOrderSource = (order: Order): 'QR' | 'POS' => {
    if (
      order.source === 'QR' ||
      order.note?.toLowerCase().includes('qr') ||
      order.customer?.toLowerCase().includes('qr')
    ) {
      return 'QR';
    }
    return 'POS';
  };

  // Advance Order Kitchen Status (NEW -> PREPARING -> READY -> COMPLETED)
  // CRITICAL: Payment status remains completely independent and is never changed by kitchen status!
  const handleAdvanceStatus = (orderId: string, currentStatus: OrderStatus) => {
    const norm = getNormalizedStatus(currentStatus);
    const nextStatus: OrderStatus =
      norm === 'NEW' ? 'PREPARING' : norm === 'PREPARING' ? 'READY' : 'Completed';

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          // Payment status is preserved verbatim!
          const updated: Order = { ...o, status: nextStatus };
          if (selectedOrder?.id === orderId) {
            setSelectedOrder(updated);
          }
          return updated;
        }
        return o;
      })
    );

    // Mark corresponding notification as handled
    useOrderNotificationStore.getState().markAsHandled(orderId);
  };

  // Open existing order in POS terminal to take payment / edit ticket
  const handleOpenOrder = (order: Order) => {
    useOrderNotificationStore.getState().markAsHandled(order.id);
    const tableId = order.tableId || tables.find((t) => t.name === order.table)?.id || 't1';
    navigate(
      `/pos?orderId=${encodeURIComponent(order.id)}&table=${encodeURIComponent(order.table)}&tableId=${encodeURIComponent(tableId)}`
    );
  };

  // Filtered Orders Calculation
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Operational Tab Filter
      if (activeTab === 'UNPAID') {
        if (getNormalizedPayment(order.paymentStatus) !== 'UNPAID') {
          return false;
        }
      } else if (activeTab !== 'ALL') {
        const normStatus = getNormalizedStatus(order.status);
        if (normStatus !== activeTab) {
          return false;
        }
      }

      // 2. Search Query (order #, table, customer, item name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTable = (order.table || '').toLowerCase().includes(q);
        const matchesNum = (order.orderNumber || '').toLowerCase().includes(q);
        const matchesCustomer = (order.customer || '').toLowerCase().includes(q);
        const matchesItem = (order.items || []).some((item) =>
          item.name.toLowerCase().includes(q)
        );

        if (!matchesTable && !matchesNum && !matchesCustomer && !matchesItem) {
          return false;
        }
      }

      return true;
    });
  }, [orders, activeTab, searchQuery]);

  // Operational Count Metrics
  const countNew = orders.filter((o) => getNormalizedStatus(o.status) === 'NEW').length;
  const countPreparing = orders.filter((o) => getNormalizedStatus(o.status) === 'PREPARING').length;
  const countReady = orders.filter((o) => getNormalizedStatus(o.status) === 'READY').length;
  const countCompleted = orders.filter((o) => getNormalizedStatus(o.status) === 'COMPLETED').length;
  const countUnpaid = orders.filter((o) => getNormalizedPayment(o.paymentStatus) === 'UNPAID').length;

  return (
    <div id="orders-screen-root" className="space-y-6 pb-12">
      {/* Top Header & Operational Status Counter Cards */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Order Management</h2>
          <p className="text-xs text-slate-400 font-semibold tracking-wide mt-0.5">
            Operational kitchen workflow and checkout processing for restaurant tables.
          </p>
        </div>

        {/* Live Status Summary Badges */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          <div
            onClick={() => setActiveTab('ALL')}
            className={`border px-3 py-1.5 rounded-xl shadow-xs text-center min-w-[4.2rem] cursor-pointer transition-all ${
              activeTab === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">All</p>
            <p className="text-sm font-black leading-tight">{orders.length}</p>
          </div>

          <div
            onClick={() => setActiveTab('NEW')}
            className={`border px-3 py-1.5 rounded-xl shadow-xs text-center min-w-[4.2rem] cursor-pointer transition-all ${
              activeTab === 'NEW'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-amber-50 border-amber-200/80 text-amber-700 hover:bg-amber-100/70'
            }`}
          >
            <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">New</p>
            <p className="text-sm font-black leading-tight">{countNew}</p>
          </div>

          <div
            onClick={() => setActiveTab('PREPARING')}
            className={`border px-3 py-1.5 rounded-xl shadow-xs text-center min-w-[4.5rem] cursor-pointer transition-all ${
              activeTab === 'PREPARING'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-blue-50 border-blue-200/80 text-blue-700 hover:bg-blue-100/70'
            }`}
          >
            <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">Kitchen</p>
            <p className="text-sm font-black leading-tight">{countPreparing}</p>
          </div>

          <div
            onClick={() => setActiveTab('READY')}
            className={`border px-3 py-1.5 rounded-xl shadow-xs text-center min-w-[4.2rem] cursor-pointer transition-all ${
              activeTab === 'READY'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-emerald-50 border-emerald-200/80 text-emerald-700 hover:bg-emerald-100/70'
            }`}
          >
            <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">Ready</p>
            <p className="text-sm font-black leading-tight">{countReady}</p>
          </div>

          <div
            onClick={() => setActiveTab('COMPLETED')}
            className={`border px-3 py-1.5 rounded-xl shadow-xs text-center min-w-[4.5rem] cursor-pointer transition-all ${
              activeTab === 'COMPLETED'
                ? 'bg-slate-700 text-white border-slate-700'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">Completed</p>
            <p className="text-sm font-black leading-tight">{countCompleted}</p>
          </div>

          <div
            onClick={() => setActiveTab('UNPAID')}
            className={`border px-3 py-1.5 rounded-xl shadow-xs text-center min-w-[4.5rem] cursor-pointer transition-all ${
              activeTab === 'UNPAID'
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">Waiting Pay</p>
            <p className="text-sm font-black leading-tight">{countUnpaid}</p>
          </div>
        </div>
      </div>

      {/* Operational Toolbar: [ ALL ] [ NEW ] [ KITCHEN ] [ READY ] [ COMPLETED ] [ WAITING PAY ] + Search */}
      <div className="bg-white border border-slate-200/80 p-3.5 rounded-2xl shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Operational Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {(
            [
              { key: 'ALL', label: 'All Orders', count: orders.length },
              { key: 'NEW', label: 'New', count: countNew },
              { key: 'PREPARING', label: 'Kitchen / Preparing', count: countPreparing },
              { key: 'READY', label: 'Ready', count: countReady },
              { key: 'COMPLETED', label: 'Completed', count: countCompleted },
              { key: 'UNPAID', label: 'Waiting Payment', count: countUnpaid },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-slate-800 text-orange-400' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search: [ Search order / table ] */}
        <div className="w-full md:w-72">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search order / table..."
            onClear={() => setSearchQuery('')}
            size="sm"
          />
        </div>
      </div>

      {/* Orders Operational Cards Grid */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description={
            searchQuery
              ? `No orders matching "${searchQuery}".`
              : `No orders currently in the ${activeTab} queue.`
          }
          actionText={searchQuery || activeTab !== 'ALL' ? 'Reset Filters' : undefined}
          onAction={() => {
            setSearchQuery('');
            setActiveTab('ALL');
          }}
          className="bg-white border border-slate-200/80 rounded-2xl p-10 my-4"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const normStatus = getNormalizedStatus(order.status);
            const normPayment = getNormalizedPayment(order.paymentStatus);
            const source = getOrderSource(order);
            const isHighlighted = highlightedOrderId === order.id || highlightedOrderId === order.orderNumber;

            return (
              <Card
                key={order.id}
                padding="md"
                className={`flex flex-col justify-between bg-white border rounded-2xl shadow-xs transition-all group ${
                  isHighlighted
                    ? 'border-orange-500 ring-2 ring-orange-400/50'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Bar: Table & Source */}
                  <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm tracking-tight uppercase">
                          {order.table}
                        </span>
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            source === 'QR'
                              ? 'bg-orange-600 text-white'
                              : 'bg-slate-800 text-white'
                          }`}
                        >
                          {source} ORDER
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-extrabold text-xs text-slate-500 font-mono">
                          {order.orderNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-300" />
                          {order.dateTime}
                        </span>
                      </div>
                    </div>

                    {/* Quick Receipt & Details Icon Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setReceiptOrder(order)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Print Receipt"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="View Details"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Items Breakdown list */}
                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100/90 space-y-1.5 min-h-[4.5rem] max-h-36 overflow-y-auto">
                    {order.items.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="flex items-center justify-between text-xs font-bold text-slate-800"
                      >
                        <span className="truncate pr-2">
                          <span className="text-orange-600 font-black mr-1">{item.quantity} ×</span>{' '}
                          {item.name}
                        </span>
                        <span className="text-slate-500 shrink-0 font-medium tabular-nums">
                          {formatPrice(item.lineTotal)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Total Bill */}
                  <div className="flex items-baseline justify-between pt-0.5">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Total
                    </span>
                    <span className="text-base font-black text-slate-900 tabular-nums">
                      {formatPrice(order.total)}
                    </span>
                  </div>

                  {/* Status & Payment Row: Clearly separated concepts! */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                    {/* Kitchen Status & Progression */}
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={
                          normStatus === 'NEW'
                            ? 'amber'
                            : normStatus === 'PREPARING'
                            ? 'blue'
                            : normStatus === 'READY'
                            ? 'emerald'
                            : normStatus === 'COMPLETED'
                            ? 'slate'
                            : 'rose'
                        }
                        size="xs"
                        className="font-black uppercase tracking-wider text-[10px]"
                      >
                        {normStatus === 'PREPARING' ? 'Kitchen' : normStatus}
                      </Badge>

                      {normStatus === 'NEW' && (
                        <button
                          type="button"
                          onClick={() => handleAdvanceStatus(order.id, order.status)}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                          title="Advance to Kitchen / Preparing"
                        >
                          <Play className="w-2.5 h-2.5" />
                          <span>Preparing</span>
                        </button>
                      )}

                      {normStatus === 'PREPARING' && (
                        <button
                          type="button"
                          onClick={() => handleAdvanceStatus(order.id, order.status)}
                          className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                          title="Advance to Ready"
                        >
                          <CheckCircle className="w-2.5 h-2.5" />
                          <span>Ready</span>
                        </button>
                      )}

                      {normStatus === 'READY' && (
                        <button
                          type="button"
                          onClick={() => handleAdvanceStatus(order.id, order.status)}
                          className="text-[10px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                          title="Advance to Completed"
                        >
                          <Check className="w-2.5 h-2.5" />
                          <span>Complete</span>
                        </button>
                      )}
                    </div>

                    {/* Independent Payment Status */}
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                        normPayment === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      <CreditCard className="w-2.5 h-2.5" />
                      {normPayment}
                    </span>
                  </div>
                </div>

                {/* Bottom Action: [ OPEN ORDER ] */}
                <div className="pt-3 mt-3 border-t border-slate-100">
                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    onClick={() => handleOpenOrder(order)}
                    iconRight={<ArrowRight className="w-3.5 h-3.5" />}
                    className="font-black text-xs uppercase tracking-wider shadow-xs"
                  >
                    Open Order
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Existing Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          order={selectedOrder}
          onUpdateStatus={(orderId, nextStatus) => {
            setOrders((prev) =>
              prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
            );
            if (selectedOrder?.id === orderId) {
              setSelectedOrder((prev) => (prev ? { ...prev, status: nextStatus } : null));
            }
          }}
          onPrintReceipt={(order) => setReceiptOrder(order)}
        />
      )}

      {/* Existing Receipt Modal */}
      {receiptOrder && (
        <OrderReceiptModal
          isOpen={Boolean(receiptOrder)}
          onClose={() => setReceiptOrder(null)}
          order={receiptOrder}
        />
      )}
    </div>
  );
}
