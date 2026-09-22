/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AppView, DashboardTab, MenuItem, Table, StaffMember, Transaction } from './types';
import { MENU_ITEMS, CATEGORIES, TABLES_DATA, STAFF_DATA, TRANSACTIONS_DATA } from './data/mockData';

// Layout and Pages imports
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/dashboard/Login';
import DashboardMain from './pages/dashboard/DashboardMain';
import Tables from './pages/dashboard/Tables';
import Menu from './pages/dashboard/Menu';
import Staff from './pages/dashboard/Staff';
import Sales from './pages/dashboard/Sales';
import Settings from './pages/dashboard/Settings';
import Orders from './pages/dashboard/Orders';
import QRMenu from './pages/customer/QRMenu';

export default function App() {
  // Main view router: 'customer-qr' | 'dashboard'
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  
  // Dashboard tab state
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
  
  // Global Shared States (simulates DB on client)
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MENU_ITEMS);
  const [tables, setTables] = useState<Table[]>(TABLES_DATA);
  const [staffList, setStaffList] = useState<StaffMember[]>(STAFF_DATA);
  const [transactions, setTransactions] = useState<Transaction[]>(TRANSACTIONS_DATA);
  
  // App routing search filter states
  const [searchQuery, setSearchQuery] = useState('');

  // Active simulated table scanned by client QR
  const [activeTableQRName, setActiveTableQRName] = useState('Table 04');

  // Unified PIN Authentication state
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>({
    name: 'Kenji Sato',
    role: 'Manager'
  });

  // Global Actions (synchronizes POS and Customer QR view actions)
  const handleToggleStock = (itemId: string) => {
    setMenuItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, inStock: !item.inStock } : item
    ));
  };

  const handleAddItem = (newItem: MenuItem) => {
    setMenuItems(prev => [newItem, ...prev]);
  };

  const handleDeleteItem = (itemId: string) => {
    setMenuItems(prev => prev.filter(item => item.id !== itemId));
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
    setCurrentView('customer-qr');
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

  // View dispatch rendering logic
  if (currentView === 'customer-qr') {
    return (
      <div id="client-app-root" className="relative">
        {/* Helper developer badge to easily return to POS terminal view */}
        <div className="fixed top-2 left-2 z-50 bg-stone-900 text-white rounded-xl py-1 px-2.5 font-bold text-[10px] tracking-tight hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer border border-stone-800 flex items-center gap-1" onClick={() => setCurrentView('dashboard')}>
          <span>← Back to POS Station</span>
        </div>
        <QRMenu
          initialMenuItems={menuItems}
          categories={CATEGORIES}
          tableName={activeTableQRName}
          onSendOrderToKitchen={handleSendOrderToKitchen}
        />
      </div>
    );
  }

  // Dashboard view - first check login session
  if (!currentUser) {
    return (
      <Login 
        onLoginSuccess={(session) => setCurrentUser(session)} 
      />
    );
  }

  // Authenticated Dashboard Layout
  return (
    <DashboardLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={() => setCurrentUser(null)}
      currentUser={currentUser}
      onSwitchToCustomerView={() => setCurrentView('customer-qr')}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    >
      {/* Dynamic Tab Switch Router Rendering Panels */}
      {activeTab === 'dashboard' && <DashboardMain />}
      {activeTab === 'orders' && <Orders />}
      
      {activeTab === 'tables' && (
        <Tables 
          tables={tables}
          onToggleStatus={handleToggleTableStatus}
          onViewMenu={handleViewMenuFromPOS}
          searchQuery={searchQuery}
        />
      )}
      
      {activeTab === 'menu' && (
        <Menu 
          menuItems={menuItems}
          onToggleStock={handleToggleStock}
          onAddItem={handleAddItem}
          onDeleteItem={handleDeleteItem}
          searchQuery={searchQuery}
        />
      )}
      
      {activeTab === 'staff' && (
        <Staff 
          staffList={staffList}
          onToggleShift={handleToggleStaffShift}
          onAddStaff={handleAddStaff}
          onEditStaff={handleEditStaff}
          searchQuery={searchQuery}
        />
      )}
      
      {activeTab === 'sales' && (
        <Sales 
          transactions={transactions}
          searchQuery={searchQuery}
        />
      )}
      
      {activeTab === 'settings' && <Settings />}

    </DashboardLayout>
  );
}
