/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Clock,
  User,
  UtensilsCrossed,
  Play,
  CheckCircle,
  Trash,
  CreditCard,
  CheckCheck,
  FileText,
  Printer,
  Filter,
  FilterX,
} from 'lucide-react';
import { Order, OrderStatus, PaymentStatusType, OrderType } from '../../types';
import { MOCK_ORDERS } from '../../data/orders';
import { formatPrice } from '../../utils/format';
import { Button, Badge, BadgeVariant, Card, ConfirmDialog, SearchBar, Select, EmptyState } from '../../components/ui';
import { PermissionGate } from '../../components/auth/PermissionGate';
import { OrderDetailsModal, OrderReceiptModal, EditOrderNoteModal } from '../../components/orders';

export interface OrdersProps {
  initialOrders?: Order[];
  orders?: Order[];
  onUpdateOrders?: React.Dispatch<React.SetStateAction<Order[]>>;
}

export default function Orders({
  initialOrders = MOCK_ORDERS,
  orders: externalOrders,
  onUpdateOrders,
}: OrdersProps = {}) {
  const [localOrders, setLocalOrders] = useState<Order[]>(initialOrders);

  const orders = externalOrders || localOrders;
  const setOrders = onUpdateOrders || setLocalOrders;

  const [orderToVoid, setOrderToVoid] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [editNoteOrder, setEditNoteOrder] = useState<Order | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');

  // Status Progression Handler
  const handleStatusChange = (orderId: string, nextStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const updated: Order = {
            ...o,
            status: nextStatus,
            paymentStatus: nextStatus === 'Cancelled' ? ('Refunded' as PaymentStatusType) : o.paymentStatus,
          };
          if (selectedOrder?.id === orderId) {
            setSelectedOrder(updated);
          }
          return updated;
        }
        return o;
      })
    );
  };

  // Kitchen Note Edit Handler
  const handleSaveNote = (orderId: string, newNote: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const updated: Order = { ...o, note: newNote };
          if (selectedOrder?.id === orderId) {
            setSelectedOrder(updated);
          }
          return updated;
        }
        return o;
      })
    );
  };

  // Void / Cancel Order Handler
  const confirmVoidOrder = () => {
    if (orderToVoid) {
      handleStatusChange(orderToVoid, 'Cancelled');
      setOrderToVoid(null);
    }
  };

  // Reset All Filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setOrderTypeFilter('ALL');
    setPaymentStatusFilter('ALL');
    setDateFilter('ALL');
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    statusFilter !== 'ALL' ||
    orderTypeFilter !== 'ALL' ||
    paymentStatusFilter !== 'ALL' ||
    dateFilter !== 'ALL';

  // Filtered Orders Calculation
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Search Filter (Order Number, Customer, Table)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const cleanQuery = query.startsWith('#') ? query.slice(1) : query;
        const cleanOrderNum = order.orderNumber.toLowerCase().replace('#', '');

        const matchesOrderNum = cleanOrderNum.includes(cleanQuery) || order.orderNumber.toLowerCase().includes(query);
        const matchesCustomer = order.customer.toLowerCase().includes(query);
        const matchesTable = order.table.toLowerCase().includes(query);
        const matchesItem = order.items.some((item) => item.name.toLowerCase().includes(query));

        if (!matchesOrderNum && !matchesCustomer && !matchesTable && !matchesItem) {
          return false;
        }
      }

      // 2. Order Status Filter
      if (statusFilter !== 'ALL' && order.status !== statusFilter) {
        return false;
      }

      // 3. Order Type Filter
      if (orderTypeFilter !== 'ALL' && order.orderType !== orderTypeFilter) {
        return false;
      }

      // 4. Payment Status Filter
      if (paymentStatusFilter !== 'ALL' && order.paymentStatus !== paymentStatusFilter) {
        return false;
      }

      // 5. Date Filter (e.g. Today)
      if (dateFilter !== 'ALL') {
        if (dateFilter === 'Today' && !order.dateTime.toLowerCase().includes('today')) {
          return false;
        }
      }

      return true;
    });
  }, [orders, searchQuery, statusFilter, orderTypeFilter, paymentStatusFilter, dateFilter]);

  // Badge Variant Mappings for Order Status
  const getOrderStatusBadgeVariant = (status: OrderStatus | string): BadgeVariant => {
    switch (status) {
      case 'Pending':
        return 'amber';
      case 'Preparing':
        return 'blue';
      case 'Cooking':
        return 'amber';
      case 'Ready':
        return 'emerald';
      case 'Served':
      case 'Completed':
        return 'slate';
      case 'Cancelled':
        return 'rose';
      default:
        return 'slate';
    }
  };

  // Badge Variant Mappings for Payment Status
  const getPaymentBadgeVariant = (payStatus: PaymentStatusType): BadgeVariant => {
    switch (payStatus) {
      case 'Paid':
        return 'emerald';
      case 'Pending':
      case 'Unpaid':
        return 'amber';
      case 'Refunded':
        return 'rose';
      default:
        return 'slate';
    }
  };

  // Summary Count Metrics
  const activeOrdersCount = orders.filter(
    (o) => o.status === 'Preparing' || o.status === 'Cooking' || o.status === 'Ready' || o.status === 'Pending'
  ).length;
  const completedOrdersCount = orders.filter(
    (o) => o.status === 'Served' || o.status === 'Completed'
  ).length;
  const pendingPaymentCount = orders.filter((o) => o.paymentStatus === 'Pending' || o.paymentStatus === 'Unpaid').length;

  return (
    <div id="orders-screen-root" className="space-y-6 pb-12">
      {/* Top Header & Summary Stats Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Order Management</h2>
          <p className="text-xs text-slate-400 font-semibold tracking-wide mt-0.5">
            Monitor, track, and process customer restaurant orders across all station tables.
          </p>
        </div>

        {/* Live Metrics Counter Cards */}
        <div className="flex items-center gap-2.5">
          <div className="bg-white border border-slate-100 px-3 py-2 rounded-2xl shadow-xs text-center min-w-[5rem]">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total</p>
            <p className="text-sm font-black text-slate-900 leading-tight">{orders.length}</p>
          </div>
          <div className="bg-orange-50 border border-orange-100 px-3 py-2 rounded-2xl shadow-xs text-center min-w-[5rem]">
            <p className="text-[9px] font-bold text-orange-500 uppercase tracking-wider">Active</p>
            <p className="text-sm font-black text-orange-600 leading-tight">{activeOrdersCount}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-2xl shadow-xs text-center min-w-[5rem]">
            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Done</p>
            <p className="text-sm font-black text-emerald-700 leading-tight">{completedOrdersCount}</p>
          </div>
          {pendingPaymentCount > 0 && (
            <div className="bg-amber-50 border border-amber-100 px-3 py-2 rounded-2xl shadow-xs text-center min-w-[5rem]">
              <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">Unpaid</p>
              <p className="text-sm font-black text-amber-700 leading-tight">{pendingPaymentCount}</p>
            </div>
          )}
        </div>
      </div>


      {/* Search & Filters Toolbar */}
      <div className="bg-white border border-slate-100 p-4 rounded-3xl shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-center">
          {/* Search Input */}
          <div className="sm:col-span-2 lg:col-span-2">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search order #, customer, table..."
              onClear={() => setSearchQuery('')}
              size="md"
            />
          </div>

          {/* Status Filter */}
          <div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'Draft', label: 'Draft' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Preparing', label: 'Preparing' },
                { value: 'Cooking', label: 'Cooking' },
                { value: 'Ready', label: 'Ready' },
                { value: 'Served', label: 'Served' },
                { value: 'Completed', label: 'Completed' },
                { value: 'Cancelled', label: 'Cancelled' },
              ]}
            />
          </div>

          {/* Order Type Filter */}
          <div>
            <Select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Types' },
                { value: 'Dine In', label: 'Dine In' },
                { value: 'Takeaway', label: 'Takeaway' },
                { value: 'Delivery', label: 'Delivery' },
              ]}
            />
          </div>

          {/* Payment Status Filter */}
          <div>
            <Select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Payments' },
                { value: 'Paid', label: 'Paid' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Unpaid', label: 'Unpaid' },
                { value: 'Refunded', label: 'Refunded' },
              ]}
            />
          </div>

          {/* Date Filter */}
          <div>
            <Select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Dates' },
                { value: 'Today', label: 'Today' },
              ]}
            />
          </div>
        </div>

        {/* Active Filters Toolbar Indicator & Clear Button */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-orange-500" />
              <span>
                Showing <strong className="text-slate-800 font-bold">{filteredOrders.length}</strong> of{' '}
                <strong className="text-slate-800 font-bold">{orders.length}</strong> orders
              </span>
            </div>
            <Button
              variant="ghost"
              size="xs"
              onClick={handleClearFilters}
              icon={<FilterX className="w-3.5 h-3.5 text-slate-400" />}
              className="text-slate-500 hover:text-orange-600 hover:bg-orange-50"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Orders Grid or Empty State */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="No orders match your search query or filter criteria. Try adjusting or clearing your filters."
          actionText="Clear All Filters"
          onAction={handleClearFilters}
          className="bg-white border border-slate-100 rounded-3xl p-10 my-4"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOrders.map((order) => {
            const totalItemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

            return (
              <Card
                key={order.id}
                padding="md"
                hoverEffect
                className="flex flex-col justify-between bg-white border border-slate-100 rounded-3xl shadow-sm transition-all cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="space-y-3">
                  {/* Header: Order Number, Table & Status Badges */}
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-sm tracking-tight leading-none hover:text-orange-600 transition-colors">
                            Order {order.orderNumber}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="bg-slate-100 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-md border border-slate-200/60">
                              {order.table}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-300" />
                              {order.dateTime}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={getOrderStatusBadgeVariant(order.status)} size="xs" className="font-extrabold uppercase">
                        {order.status}
                      </Badge>
                      <Badge variant={getPaymentBadgeVariant(order.paymentStatus)} size="xs" className="text-[9px] px-1.5 py-0 font-bold">
                        <CreditCard className="w-2.5 h-2.5 mr-1 inline" />
                        {order.paymentStatus}
                      </Badge>
                    </div>
                  </div>

                  {/* Customer & Dining Details Row */}
                  <div className="flex items-center justify-between text-xs bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Customer: <strong className="text-slate-800 font-bold">{order.customer}</strong></span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500 font-semibold text-[10px] uppercase">
                      <UtensilsCrossed className="w-3 h-3 text-orange-500" />
                      <span>{order.orderType}</span>
                    </div>
                  </div>

                  {/* Items Breakdown */}
                  <div className="space-y-1.5 py-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                      <span>Itemized Breakdown</span>
                      <span>{totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}</span>
                    </div>
                    <div className="space-y-1.5 bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100 max-h-40 overflow-y-auto">
                      {order.items.map((item, idx) => (
                        <div key={item.id || idx} className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span className="w-5 h-5 rounded-md bg-orange-100 text-orange-700 text-[10px] font-black flex items-center justify-center shrink-0">
                              {item.quantity}x
                            </span>
                            <span className="truncate text-slate-800 font-bold">{item.name}</span>
                          </div>
                          <span className="text-slate-500 shrink-0 font-bold">{formatPrice(item.lineTotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Kitchen Note if present */}
                  {order.note && (
                    <div className="flex items-start gap-1.5 text-xs text-orange-700 bg-orange-50/70 p-2 rounded-xl border border-orange-100">
                      <FileText className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                      <span className="font-semibold text-[11px] leading-tight">Note: {order.note}</span>
                    </div>
                  )}
                </div>

                {/* Card Footer: Total Bill and Action Buttons */}
                <div
                  className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">Total Bill</p>
                    <p className="text-base font-black text-slate-900 mt-1 leading-none">{formatPrice(order.total)}</p>
                  </div>

                  {/* Actions Group */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setReceiptOrder(order)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors active:scale-90 cursor-pointer"
                      title="Print Receipt"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>

                    <Button
                      onClick={() => setSelectedOrder(order)}
                      variant="outline"
                      size="xs"
                      icon={<FileText className="w-3 h-3" />}
                      title="View complete order details"
                    >
                      Details
                    </Button>

                    {order.status === 'Pending' && (
                      <Button
                        onClick={() => handleStatusChange(order.id, 'Preparing')}
                        variant="subtle-orange"
                        size="xs"
                        icon={<Play className="w-3 h-3" />}
                      >
                        Accept
                      </Button>
                    )}
                    {order.status === 'Preparing' && (
                      <Button
                        onClick={() => handleStatusChange(order.id, 'Cooking')}
                        variant="warning"
                        size="xs"
                        icon={<Play className="w-3 h-3" />}
                      >
                        Fire
                      </Button>
                    )}
                    {order.status === 'Cooking' && (
                      <Button
                        onClick={() => handleStatusChange(order.id, 'Ready')}
                        variant="success"
                        size="xs"
                        icon={<CheckCircle className="w-3 h-3" />}
                      >
                        Complete
                      </Button>
                    )}
                    {order.status === 'Ready' && (
                      <Button
                        onClick={() => handleStatusChange(order.id, 'Served')}
                        variant="secondary"
                        size="xs"
                        icon={<CheckCheck className="w-3 h-3" />}
                      >
                        Deliver
                      </Button>
                    )}
                    {order.status === 'Served' && (
                      <Button
                        onClick={() => handleStatusChange(order.id, 'Completed')}
                        variant="secondary"
                        size="xs"
                        icon={<CheckCheck className="w-3 h-3" />}
                      >
                        Finish
                      </Button>
                    )}

                    {/* Cancel / Void Action protected by PermissionGate */}
                    {order.status !== 'Cancelled' && order.status !== 'Completed' && (
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
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Order Details Modal Dialog */}
      <OrderDetailsModal
        isOpen={Boolean(selectedOrder)}
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onUpdateStatus={handleStatusChange}
        onPrintReceipt={(ord) => setReceiptOrder(ord)}
        onEditNote={(ord) => setEditNoteOrder(ord)}
      />

      {/* Printable Receipt Modal */}
      <OrderReceiptModal
        isOpen={Boolean(receiptOrder)}
        order={receiptOrder}
        onClose={() => setReceiptOrder(null)}
      />

      {/* Edit Kitchen Note Modal */}
      <EditOrderNoteModal
        isOpen={Boolean(editNoteOrder)}
        order={editNoteOrder}
        onClose={() => setEditNoteOrder(null)}
        onSaveNote={handleSaveNote}
      />


      {/* Confirm Void Dialog */}
      <ConfirmDialog
        isOpen={Boolean(orderToVoid)}
        onClose={() => setOrderToVoid(null)}
        onConfirm={confirmVoidOrder}
        title="Void Order Ticket"
        message={`Are you sure you want to void Order #${orders.find((o) => o.id === orderToVoid)?.orderNumber || orderToVoid}? This action will cancel the ticket and refund the payment status.`}
        confirmText="Void Order"
        variant="danger"
      />
    </div>
  );
}
