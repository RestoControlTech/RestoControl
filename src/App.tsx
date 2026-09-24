/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { MenuItem, Category, Table, StaffMember, Transaction } from './types';
import { MENU_ITEMS, CATEGORIES, TABLES_DATA, STAFF_DATA, TRANSACTIONS_DATA } from './data/mockData';

// Auth and Route Protection
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Layout and Pages imports
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/dashboard/Login';
import DashboardMain from './pages/dashboard/DashboardMain';
import Tables from './pages/dashboard/Tables';
import Menu from './pages/dashboard/Menu';
import Staff from './pages/dashboard/Staff';
import Sales from './pages/dashboard/Sales';
import Reports from './pages/dashboard/Reports';
import Settings from './pages/dashboard/Settings';
import Orders from './pages/dashboard/Orders';
import QRMenu from './pages/customer/QRMenu';

function AppContent() {
  const navigate = useNavigate();

  // Global Shared States (simulates DB on client)
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MENU_ITEMS);
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);
  const [tables, setTables] = useState<Table[]>(TABLES_DATA);
  const [staffList, setStaffList] = useState<StaffMember[]>(STAFF_DATA);
  const [transactions, setTransactions] = useState<Transaction[]>(TRANSACTIONS_DATA);
  
  // App routing search filter states
  const [searchQuery, setSearchQuery] = useState('');

  // Active simulated table scanned by client QR
  const [activeTableQRName, setActiveTableQRName] = useState('Table 04');

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

  const handleToggleTableStatus = (tableId: string) => {
    setTables(prev => prev.map(t => 
      t.id === tableId 
        ? { ...t, status: t.status === 'Occupied' ? 'Available' : 'Occupied' } 
        : t
    ));
  };

  const handleToggleStaffShift = (staffId: string) => {
    setStaffList(prev => prev.map(s => 
      s.id === staffId 
        ? { ...s, status: s.status === 'Active' ? 'Off Duty' : 'Active' } 
        : s
    ));
  };

  const handleAddStaff = (newMember: StaffMember) => {
    setStaffList(prev => [newMember, ...prev]);
  };

  const handleEditStaff = (updatedMember: StaffMember) => {
    setStaffList(prev => prev.map(s => s.id === updatedMember.id ? updatedMember : s));
  };

  // Switch to customer QR menu directly for a chosen table
  const handleViewMenuFromPOS = (tableName: string) => {
    setActiveTableQRName(tableName);
    navigate('/customer');
  };

  const handleSendOrderToKitchen = (itemsCount: number, total: number) => {
    // Generate simulated order transaction
    const txId = `tx-${Date.now()}`;
    const txNum = `#TX-${9000 + Math.floor(Math.random() * 900)}`;
    const newTx: Transaction = {
      id: txId,
      orderNumber: txNum,
      dateTime: 'Just Now',
      table: activeTableQRName,
      type: 'Dine-in',
      amount: total,
      status: 'Receipt'
    };

    setTransactions(prev => [newTx, ...prev]);

    // Update active table state status to occupied
    setTables(prev => prev.map(t => 
      t.name === activeTableQRName ? { ...t, status: 'Occupied' } : t
    ));
  };

  return (
    <Routes>
      {/* Public Route: Login */}
      <Route path="/login" element={<Login />} />

      {/* Public Routes: Customer QR Menu */}
      <Route
        path="/customer"
        element={
          <div id="client-app-root" className="relative">
            <div
              className="fixed top-2 left-2 z-50 bg-stone-900 text-white rounded-xl py-1 px-2.5 font-bold text-[10px] tracking-tight hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer border border-stone-800 flex items-center gap-1"
              onClick={() => navigate('/dashboard')}
            >
              <span>← Back to POS Station</span>
            </div>
            <QRMenu
              initialMenuItems={menuItems}
              categories={categories}
              tableName={activeTableQRName}
              onSendOrderToKitchen={handleSendOrderToKitchen}
            />
          </div>
        }
      />
      <Route path="/qr" element={<Navigate to="/customer" replace />} />
      <Route
        path="/menu/:tableId"
        element={
          <div id="client-app-root" className="relative">
            <div
              className="fixed top-2 left-2 z-50 bg-stone-900 text-white rounded-xl py-1 px-2.5 font-bold text-[10px] tracking-tight hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer border border-stone-800 flex items-center gap-1"
              onClick={() => navigate('/dashboard')}
            >
              <span>← Back to POS Station</span>
            </div>
            <QRMenu
              initialMenuItems={menuItems}
              categories={categories}
              tableName={activeTableQRName}
              onSendOrderToKitchen={handleSendOrderToKitchen}
            />
          </div>
        }
      />

      {/* Protected Routes (Require Authentication & Permission Authorization) */}
      <Route
        path="/"
        element={
          <ProtectedRoute permission="dashboard.view">
            <DashboardLayout
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSwitchToCustomerView={() => navigate('/customer')}
            >
              <DashboardMain />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute permission="dashboard.view">
            <DashboardLayout
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSwitchToCustomerView={() => navigate('/customer')}
            >
              <DashboardMain />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/pos"
        element={
          <ProtectedRoute permission="pos.use">
            <DashboardLayout
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSwitchToCustomerView={() => navigate('/customer')}
            >
              <DashboardMain />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/orders"
        element={
          <ProtectedRoute permission="orders.view">
            <DashboardLayout
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSwitchToCustomerView={() => navigate('/customer')}
            >
              <Orders />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/tables"
        element={
          <ProtectedRoute permission="tables.view">
            <DashboardLayout
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSwitchToCustomerView={() => navigate('/customer')}
            >
              <Tables
                tables={tables}
                onToggleStatus={handleToggleTableStatus}
                onViewMenu={handleViewMenuFromPOS}
                searchQuery={searchQuery}
              />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/menu"
        element={
          <ProtectedRoute permission="menu.view">
            <DashboardLayout
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSwitchToCustomerView={() => navigate('/customer')}
            >
              <Menu
                menuItems={menuItems}
                categories={categories}
                onToggleStock={handleToggleStock}
                onAddItem={handleAddItem}
                onEditItem={handleEditItem}
                onDeleteItem={handleDeleteItem}
                onAddCategory={handleAddCategory}
                onEditCategory={handleEditCategory}
                onDeleteCategory={handleDeleteCategory}
                searchQuery={searchQuery}
              />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff"
        element={
          <ProtectedRoute permission="staff.view">
            <DashboardLayout
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSwitchToCustomerView={() => navigate('/customer')}
            >
              <Staff
                staffList={staffList}
                onToggleShift={handleToggleStaffShift}
                onAddStaff={handleAddStaff}
                onEditStaff={handleEditStaff}
                searchQuery={searchQuery}
              />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/sales"
        element={
          <ProtectedRoute permission="sales.view">
            <DashboardLayout
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSwitchToCustomerView={() => navigate('/customer')}
            >
              <Sales
                transactions={transactions}
                searchQuery={searchQuery}
              />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute permission="reports.view">
            <DashboardLayout
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSwitchToCustomerView={() => navigate('/customer')}
            >
              <Reports />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute permission="settings.view">
            <DashboardLayout
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSwitchToCustomerView={() => navigate('/customer')}
            >
              <Settings />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
