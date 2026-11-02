/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { MenuItem, Category, Table, TableStatus, StaffMember, Transaction, Order, Product } from '../types';

// Auth and Route Protection
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { useAuth } from '../hooks/useAuth';
import { ErrorBoundary } from '../components/ui';

// Layout and Pages imports
import DashboardLayout from '../layouts/DashboardLayout';
import Login from '../pages/dashboard/Login';
import Tables from '../pages/dashboard/Tables';
import Menu from '../pages/dashboard/Menu';
import Staff from '../pages/dashboard/Staff';
import Sales from '../pages/dashboard/Sales';
import Settings from '../pages/dashboard/Settings';
import Orders from '../pages/dashboard/Orders';
import POS from '../pages/dashboard/POS';
import Profile from '../pages/dashboard/Profile';
import QRMenu from '../pages/customer/QRMenu';
import { TableMenuRoute } from '../pages/customer/TableMenuRoute';

export interface AppRoutesProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  tables: Table[];
  activeTableQRName: string;
  onToggleTableStatus: (tableId: string) => void;
  onAddTable?: (table: { name: string; section: string; seats: number }) => { success: boolean; error?: string; table?: Table };
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
  onSendOrderToKitchen: (orderOrCount: import('../pages/customer/QRMenu').QROrderSubmission | number, total?: number) => void;
  orders?: Order[];
  onUpdateOrders?: React.Dispatch<React.SetStateAction<Order[]>>;
  onOrderCreate?: (order: Order) => void;
  onCustomerEnterTable?: (tableIdOrName: string) => void;
  onSetTableStatus?: (tableId: string, status: TableStatus) => void;
  onPayTable?: (tableId: string, paymentInfo?: Partial<import('../types').PaymentConfirmation>) => void;
  onClearTable?: (tableId: string) => void;
}

const CustomerRouteWrapper: React.FC<{
  menuItems: MenuItem[];
  categories: Category[];
  tableName: string;
  tables: Table[];
  onSendOrderToKitchen: (orderOrCount: import('../pages/customer/QRMenu').QROrderSubmission | number, total?: number) => void;
  onCustomerEnterTable?: (tableIdOrName: string) => void;
}> = ({ menuItems, categories, tableName, tables, onSendOrderToKitchen, onCustomerEnterTable }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const safeTableName = tableName || (tables && tables.length > 0 ? tables[0].name : 'Table 01');
  const matched = (tables || []).find((t) => t.name === safeTableName || t.id === safeTableName);
  const matchedId = matched?.id || (tables && tables.length > 0 ? tables[0].id : 't1');
  const matchedStatus = matched?.status;

  React.useEffect(() => {
    if (matchedId && matchedStatus === 'Available') {
      onCustomerEnterTable?.(matchedId);
    }
  }, [matchedId, matchedStatus, onCustomerEnterTable]);

  return (
    <ErrorBoundary
      fallbackTitle="មិនអាចបើកទំព័រម៉ឺនុយបានទេ"
      fallbackMessage="មានបញ្ហាក្នុងការផ្ទុកម៉ឺនុយសម្រាប់តុនេះ។ សូមព្យាយាមម្តងទៀត។"
    >
      <div id="client-app-root" className="relative">
        {isAuthenticated && (
          <button
            type="button"
            id="btn-back-to-pos"
            onClick={() => navigate('/pos')}
            className="fixed top-3 right-3 z-50 bg-stone-900/90 hover:bg-stone-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-lg border border-stone-700/80 backdrop-blur-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            ← POS Dashboard
          </button>
        )}
        <QRMenu
          initialMenuItems={menuItems || []}
          categories={categories || []}
          tableName={safeTableName}
          tableId={matchedId}
          onSendOrderToKitchen={onSendOrderToKitchen}
        />
      </div>
    </ErrorBoundary>
  );
};

export const AppRoutes: React.FC<AppRoutesProps> = ({
  searchQuery,
  setSearchQuery,
  tables,
  activeTableQRName,
  onToggleTableStatus,
  onAddTable,
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
  orders,
  onUpdateOrders,
  onOrderCreate,
  onCustomerEnterTable,
  onSetTableStatus,
  onPayTable,
  onClearTable,
}) => {
  const navigate = useNavigate();

  // Synchronize POS products directly with Menu catalog items
  const posProducts = useMemo<Product[]>(() => {
    return menuItems.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      price: item.price,
      image: item.image,
      imagePublicId: item.imagePublicId,
      description: item.description,
      available: item.inStock,
      inStock: item.inStock,
      stock: item.inStock ? 99 : 0,
      popular: item.category?.toLowerCase() === 'popular' || item.badge?.toUpperCase() === 'POPULAR',
      badge: item.badge,
    }));
  }, [menuItems]);

  return (
    <Routes>
      {/* Public Route: Login */}
      <Route path="/login" element={<Login />} />

      {/* Public Routes: Customer QR Menu */}
      <Route
        path="/customer"
        element={
          <CustomerRouteWrapper
            menuItems={menuItems}
            categories={categories}
            tableName={activeTableQRName}
            tables={tables}
            onSendOrderToKitchen={onSendOrderToKitchen}
            onCustomerEnterTable={onCustomerEnterTable}
          />
        }
      />
      <Route path="/qr" element={<Navigate to="/customer" replace />} />
      <Route path="/customers" element={<Navigate to="/customer" replace />} />
      <Route
        path="/menu/:tableId"
        element={
          <TableMenuRoute
            tables={tables}
            menuItems={menuItems}
            categories={categories}
            onSendOrderToKitchen={onSendOrderToKitchen}
            onCustomerEnterTable={onCustomerEnterTable}
          />
        }
      />

      {/* Root & Legacy Redirects */}
      <Route path="/" element={<Navigate to="/pos" replace />} />
      <Route path="/dashboard" element={<Navigate to="/pos" replace />} />

      <Route
        path="/pos"
        element={
          <ProtectedRoute permission="pos.use">
            <DashboardLayout
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSwitchToCustomerView={() => navigate('/customer')}
            >
              <POS
                products={posProducts}
                categories={categories}
                searchQuery={searchQuery}
                tables={tables}
                orders={orders}
                onOrderCreate={onOrderCreate}
              />
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
              <Orders
                tables={tables}
                orders={orders}
                onUpdateOrders={onUpdateOrders}
              />
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
                orders={orders}
                onToggleStatus={onToggleTableStatus}
                onAddTable={onAddTable}
                onViewMenu={onViewMenuFromPOS}
                onPayTable={onPayTable}
                onOpenInPOS={(tableId) => navigate(`/pos?tableId=${encodeURIComponent(tableId)}`)}
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

      <Route path="/reports" element={<Navigate to="/sales" replace />} />

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

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <DashboardLayout
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSwitchToCustomerView={() => navigate('/customer')}
            >
              <Profile />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/pos" replace />} />
    </Routes>
  );
};
