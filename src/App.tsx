/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { MenuItem, Category, Table, StaffMember, Transaction } from './types';
import { AppRoutes } from './routes';

// Base initial layout for restaurant tables
const INITIAL_TABLES: Table[] = [
  { id: 't1', name: 'Table 01', section: 'Main Dining', seats: 4, status: 'Available', qrCodeUrl: 'restocontrol.menu/t/01' },
  { id: 't2', name: 'Table 02', section: 'Main Dining', seats: 2, status: 'Available', qrCodeUrl: 'restocontrol.menu/t/02' },
  { id: 't3', name: 'Table 03', section: 'Main Dining', seats: 4, status: 'Available', qrCodeUrl: 'restocontrol.menu/t/03' },
  { id: 't4', name: 'Table 04', section: 'Main Dining', seats: 4, status: 'Available', qrCodeUrl: 'restocontrol.menu/t/04' },
  { id: 't5', name: 'Table 05', section: 'Indoor Booths', seats: 6, status: 'Available', qrCodeUrl: 'restocontrol.menu/t/05' },
  { id: 't6', name: 'Table 06', section: 'Indoor Booths', seats: 4, status: 'Available', qrCodeUrl: 'restocontrol.menu/t/06' },
  { id: 't7', name: 'Table 07', section: 'Outdoor Terrace', seats: 2, status: 'Available', qrCodeUrl: 'restocontrol.menu/t/07' },
  { id: 't8', name: 'Table 08', section: 'Outdoor Terrace', seats: 4, status: 'Available', qrCodeUrl: 'restocontrol.menu/t/08' },
];

function AppContent() {
  const navigate = useNavigate();

  // Clean Production Starting States (no demo products, orders, sales, or refunds)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([
    { id: 'all', label: 'All Items' },
  ]);
  const [tables, setTables] = useState<Table[]>(INITIAL_TABLES);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
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

  const handleRefundSale = (refundTx: Transaction, updatedSale: Transaction) => {
    setTransactions(prev => [refundTx, ...prev.map(t => t.id === updatedSale.id ? updatedSale : t)]);
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
      table: activeTableQRName || 'Table 01',
      type: 'Dine-in',
      amount: total,
      status: 'Receipt',
      paymentMethod: 'QR Code',
      customerName: 'Table Guest',
      currency: 'USD',
      itemSummary: `${itemsCount} item${itemsCount === 1 ? '' : 's'}`,
      subtotal: total * 0.9,
      tax: total * 0.1,
    };

    setTransactions(prev => [newTx, ...prev]);

    // Update active table state status to occupied
    setTables(prev => prev.map(t => 
      t.name === activeTableQRName ? { ...t, status: 'Occupied' } : t
    ));
  };

  return (
    <AppRoutes
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      tables={tables}
      activeTableQRName={activeTableQRName}
      onToggleTableStatus={handleToggleTableStatus}
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
