/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { MenuItem, Category, Table, StaffMember, Transaction, Order, OrderItem } from './types';
import { MENU_ITEMS, STAFF_DATA } from './data/mockData';
import { AppRoutes } from './routes';
import { useOrderNotificationStore } from './store/orderNotification.store';

// Base initial layout for restaurant tables
const INITIAL_TABLES: Table[] = [
  { id: 't1', name: 'Table 01', section: 'Main Dining', seats: 4, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t1' },
  { id: 't2', name: 'Table 02', section: 'Main Dining', seats: 2, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t2' },
  { id: 't3', name: 'Table 03', section: 'Main Dining', seats: 4, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t3' },
  { id: 't4', name: 'Table 04', section: 'Main Dining', seats: 4, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t4' },
  { id: 't5', name: 'Table 05', section: 'Indoor Booths', seats: 6, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t5' },
  { id: 't6', name: 'Table 06', section: 'Indoor Booths', seats: 4, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t6' },
  { id: 't7', name: 'Table 07', section: 'Outdoor Terrace', seats: 2, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t7' },
  { id: 't8', name: 'Table 08', section: 'Outdoor Terrace', seats: 4, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t8' },
];

const INITIAL_CATEGORIES: Category[] = [
  { id: 'all', label: 'All Items' },
  { id: 'popular', label: 'Popular' },
  { id: 'ramen', label: 'Ramen' },
  { id: 'sushi', label: 'Sushi & Rolls' },
  { id: 'appetizers', label: 'Appetizers' },
  { id: 'drinks', label: 'Drinks' },
];

function AppContent() {
  const navigate = useNavigate();

  // Menu items shared between Menu catalog and POS New Order station
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MENU_ITEMS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [tables, setTables] = useState<Table[]>(INITIAL_TABLES);
  const [staffList, setStaffList] = useState<StaffMember[]>(STAFF_DATA);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Handle creating or completing payment on an order from POS
  const handleOrderCreate = (newOrder: Order, paymentInfo?: import('./types').PaymentConfirmation) => {
    const isPaid = newOrder.paymentStatus === 'PAID' || newOrder.paymentStatus === 'Paid';

    setOrders((prev) => {
      const existingIdx = prev.findIndex(
        (o) => o.id === newOrder.id || (o.orderNumber === newOrder.orderNumber && newOrder.orderNumber !== '')
      );
      if (existingIdx > -1) {
        // Update existing order in place (no duplicate!)
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          ...newOrder,
          items: newOrder.items,
          total: newOrder.total,
          paymentStatus: isPaid ? 'PAID' : (newOrder.paymentStatus || updated[existingIdx].paymentStatus),
          status: newOrder.status || updated[existingIdx].status,
        };
        return updated;
      }
      return [newOrder, ...prev];
    });

    // Update table status: If paid, mark Available; if unpaid, mark Occupied
    setTables((prev) =>
      prev.map((t) => {
        if (t.name === newOrder.table || (newOrder.tableId && t.id === newOrder.tableId)) {
          return {
            ...t,
            status: isPaid ? 'Available' : 'Occupied',
          };
        }
        return t;
      })
    );

    // Create sales transaction record (only once per orderNumber)
    if (isPaid) {
      setTransactions((prev) => {
        const txExists = prev.some((t) => t.orderNumber === newOrder.orderNumber);
        if (txExists) return prev;

        const newTx: Transaction = {
          id: `tx-${Date.now()}`,
          orderNumber: newOrder.orderNumber,
          dateTime: 'Just Now',
          table: newOrder.table,
          type: newOrder.orderType === 'Takeaway' ? 'Takeaway' : 'Dine-in',
          amount: newOrder.total,
          status: 'Receipt',
          paymentMethod:
            paymentInfo?.method === 'card'
              ? 'Credit Card'
              : paymentInfo?.method === 'cash'
              ? 'Cash'
              : (paymentInfo?.method as any) || 'Cash',
          cashReceived: paymentInfo?.cashReceived,
          change: paymentInfo?.change,
          amountPaid: paymentInfo?.cashReceived || newOrder.total,
          items: newOrder.items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            subtotal: i.lineTotal,
          })),
        };
        return [newTx, ...prev];
      });
    }
  };

  // App routing search filter states
  const [searchQuery, setSearchQuery] = useState('');

  // Active simulated table scanned by client QR
  const [activeTableQRName, setActiveTableQRName] = useState('Table 01');

  // Global Actions (synchronizes POS and Customer QR view actions)
  const handleToggleStock = (itemId: string) => {
    setMenuItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, inStock: !item.inStock } : item
    ));
  };

  const handleAddItem = (newItem: MenuItem) => {
    setMenuItems(prev => [newItem, ...prev]);
  };

  const handleEditItem = (updatedItem: MenuItem) => {
    setMenuItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  };

  const handleDeleteItem = (itemId: string) => {
    setMenuItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleAddCategory = (newCategory: Category) => {
    setCategories(prev => [...prev, newCategory]);
  };

  const handleEditCategory = (updatedCategory: Category) => {
    setCategories(prev => prev.map(c => c.id === updatedCategory.id ? updatedCategory : c));
  };

  const handleDeleteCategory = (categoryId: string) => {
    setCategories(prev => prev.filter(c => c.id !== categoryId));
  };

  const handleToggleStaffShift = (staffId: string) => {
    setStaffList(prev => prev.map(s => 
      s.id === staffId ? { ...s, status: s.status === 'Active' ? 'Off Duty' : 'Active' } : s
    ));
  };

  const handleAddStaff = (newStaff: StaffMember) => {
    setStaffList(prev => [...prev, newStaff]);
  };

  const handleEditStaff = (updatedStaff: StaffMember) => {
    setStaffList(prev => prev.map(s => s.id === updatedStaff.id ? updatedStaff : s));
  };

  const handleRefundSale = (refundTx: Transaction, updatedSale: Transaction) => {
    setTransactions(prev => {
      const filtered = prev.filter(t => t.id !== updatedSale.id);
      return [refundTx, updatedSale, ...filtered];
    });
  };

  const handleToggleTableStatus = (tableId: string) => {
    setTables(prev => prev.map(t => {
      if (t.id !== tableId) return t;
      const nextStatus = t.status === 'Available' ? 'Occupied' : t.status === 'Occupied' ? 'Reserved' : 'Available';
      return { ...t, status: nextStatus };
    }));
  };

  const handleAddTable = (newTableData: { name: string; section: string; seats: number }) => {
    const cleanName = newTableData.name.trim();
    if (!cleanName) {
      return { success: false, error: 'Table number or name is required.' };
    }
    const isDuplicate = tables.some(
      (t) => t.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (isDuplicate) {
      return {
        success: false,
        error: `Table "${cleanName}" already exists. Please choose a different table number or name.`,
      };
    }

    const match = cleanName.match(/\d+/);
    let candidateId = '';
    if (match) {
      const num = parseInt(match[0], 10);
      const testId = `t${num}`;
      if (!tables.some((t) => t.id.toLowerCase() === testId.toLowerCase())) {
        candidateId = testId;
      }
    }
    if (!candidateId) {
      let i = tables.length + 1;
      while (tables.some((t) => t.id.toLowerCase() === `t${i}`)) {
        i++;
      }
      candidateId = `t${i}`;
    }

    const newTable: Table = {
      id: candidateId,
      name: cleanName,
      section: newTableData.section.trim() || 'Main Dining',
      seats: Number(newTableData.seats) || 4,
      status: 'Available',
      qrCodeUrl: `restocontrol.menu/menu/${candidateId}`,
    };

    setTables((prev) => [...prev, newTable]);
    return { success: true, table: newTable };
  };

  // Switch to customer QR menu directly for a chosen table
  const handleViewMenuFromPOS = (tableIdentifier: string) => {
    const table = tables.find(
      t => t.name === tableIdentifier || t.id === tableIdentifier
    );
    if (table) {
      setActiveTableQRName(table.name);
      navigate(`/menu/${table.id}`);
    } else {
      setActiveTableQRName(tableIdentifier);
      navigate('/customer');
    }
  };

  const handleSendOrderToKitchen = (
    orderOrCount: import('./pages/customer/QRMenu').QROrderSubmission | number,
    fallbackTotal?: number
  ) => {
    let tableName = activeTableQRName || 'Table 01';
    let total = fallbackTotal || 0;
    let orderItems: OrderItem[] = [];

    if (typeof orderOrCount === 'object' && orderOrCount !== null) {
      tableName = orderOrCount.tableName || tableName;
      total = orderOrCount.total ?? total;
      if (orderOrCount.items && orderOrCount.items.length > 0) {
        orderItems = orderOrCount.items.map((item) => ({
          id: item.productId || item.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        }));
      }
    }

    if (orderItems.length === 0) {
      const count = typeof orderOrCount === 'number' ? orderOrCount : (orderOrCount.count || 1);
      orderItems = [{
        id: `item-${Date.now()}`,
        name: 'Dine-in Order',
        quantity: count,
        unitPrice: count > 0 ? total / count : total,
        lineTotal: total,
      }];
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const orderNum = `#ORD-${1000 + orders.length + 1}`;

    const targetTableId = typeof orderOrCount === 'object' ? orderOrCount.tableId : undefined;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: orderNum,
      table: tableName,
      tableId: targetTableId,
      source: 'QR',
      customer: `QR Guest (${tableName})`,
      orderType: 'Dine In',
      items: orderItems,
      total,
      paymentStatus: 'UNPAID',
      status: 'NEW',
      dateTime: `Today, ${timeStr}`,
      note: 'Customer QR Order',
    };

    setOrders((prev) => [newOrder, ...prev]);

    // Dispatch real application-level notification
    useOrderNotificationStore.getState().notifyNewOrder(newOrder);

    // Update active table status to Occupied
    setTables((prev) =>
      prev.map((t) =>
        t.name === tableName || (targetTableId && t.id === targetTableId)
          ? { ...t, status: 'Occupied' }
          : t
      )
    );
  };

  return (
    <AppRoutes
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      tables={tables}
      activeTableQRName={activeTableQRName}
      onToggleTableStatus={handleToggleTableStatus}
      onAddTable={handleAddTable}
      onViewMenuFromPOS={handleViewMenuFromPOS}
      menuItems={menuItems}
      categories={categories}
      onToggleStock={handleToggleStock}
      onAddItem={handleAddItem}
      onEditItem={handleEditItem}
      onDeleteItem={handleDeleteItem}
      onAddCategory={handleAddCategory}
      onEditCategory={handleEditCategory}
      onDeleteCategory={handleDeleteCategory}
      staffList={staffList}
      onToggleStaffShift={handleToggleStaffShift}
      onAddStaff={handleAddStaff}
      onEditStaff={handleEditStaff}
      transactions={transactions}
      onRefundSale={handleRefundSale}
      onSendOrderToKitchen={handleSendOrderToKitchen}
      orders={orders}
      onUpdateOrders={setOrders}
      onOrderCreate={handleOrderCreate}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
