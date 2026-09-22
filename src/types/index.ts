/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'admin' | 'staff';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
}

export interface MenuItem {
  id: string;
  category: string;
  name: string;
  jpName?: string;
  description: string;
  price: number;
  image: string;
  badge: string | null;
  tag?: string | null;
  inStock: boolean;
  rating?: number;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
}

export interface CartItem {
  id: string;
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
}

export interface Table {
  id: string;
  name: string;
  section: string;
  seats: number;
  status: 'Occupied' | 'Available';
  qrCodeUrl: string;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'Manager' | 'Cashier' | 'Kitchen' | 'Waiter';
  station: string;
  status: 'Active' | 'Off Duty';
}

export interface Transaction {
  id: string;
  orderNumber: string;
  dateTime: string;
  table: string;
  type: 'Dine-in' | 'Takeaway';
  amount: number;
  status: 'Receipt' | 'Refunded';
}

export type AppView = 'customer-qr' | 'dashboard';

export type DashboardTab = 'dashboard' | 'pos' | 'orders' | 'menu' | 'tables' | 'sales' | 'staff' | 'reports' | 'settings';
