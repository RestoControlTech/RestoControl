/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { MenuItem, Category, Table, StaffMember, Transaction } from '../types';

// Auth and Route Protection
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

// Layout and Pages imports
import DashboardLayout from '../layouts/DashboardLayout';
import Login from '../pages/dashboard/Login';
import DashboardMain from '../pages/dashboard/DashboardMain';
import Tables from '../pages/dashboard/Tables';
import Menu from '../pages/dashboard/Menu';
import Staff from '../pages/dashboard/Staff';
import Sales from '../pages/dashboard/Sales';
import Reports from '../pages/dashboard/Reports';
import Settings from '../pages/dashboard/Settings';
import Orders from '../pages/dashboard/Orders';
import QRMenu from '../pages/customer/QRMenu';

export interface AppRoutesProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  tables: Table[];
  activeTableQRName: string;
  onToggleTableStatus: (tableId: string) => void;
  onViewMenuFromPOS: (tableName: string) => void;
  menuItems: MenuItem[];
  categories: Category[];
  onToggleStock: (itemId: string) => void;
  onAddItem: (item: MenuItem) => void;
  onEditItem: (item: MenuItem) => void;
  onDeleteItem: (itemId: string) => void;
  onAddCategory: (category: Category) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  staffList: StaffMember[];
  onToggleStaffShift: (staffId: string) => void;
  onAddStaff: (member: StaffMember) => void;
  onEditStaff: (member: StaffMember) => void;
  transactions: Transaction[];
  onRefundSale: (refundTx: Transaction, updatedSale: Transaction) => void;
  onSendOrderToKitchen: (itemsCount: number, total: number) => void;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({
  searchQuery,
  setSearchQuery,
  tables,
  activeTableQRName,
  onToggleTableStatus,
  onViewMenuFromPOS,
  menuItems,
  categories,
  onToggleStock,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  staffList,
  onToggleStaffShift,
  onAddStaff,
  onEditStaff,
  transactions,
  onRefundSale,
  onSendOrderToKitchen,
}) => {
  const navigate = useNavigate();

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
              onSendOrderToKitchen={onSendOrderToKitchen}
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
              onSendOrderToKitchen={onSendOrderToKitchen}
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
                onToggleStatus={onToggleTableStatus}
                onViewMenu={onViewMenuFromPOS}
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
                onToggleStock={onToggleStock}
                onAddItem={onAddItem}
                onEditItem={onEditItem}
                onDeleteItem={onDeleteItem}
                onAddCategory={onAddCategory}
                onEditCategory={onEditCategory}
                onDeleteCategory={onDeleteCategory}
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
                onToggleShift={onToggleStaffShift}
                onAddStaff={onAddStaff}
                onEditStaff={onEditStaff}
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
                onRefundSale={onRefundSale}
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
};
