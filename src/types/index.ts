/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'admin' | 'staff';

export type { Permission } from '../auth/permissions';

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
  description: string;
  price: number;
  image: string;
  badge: string | null;
  tag?: string | null;
  inStock: boolean;
  rating?: number;
}

export type ProductCategory = 'Popular' | 'Noodles' | 'Mains & Sushi' | 'Appetizers' | 'Drinks';

export interface Product {
  id: string;
  name: string;
  jpName?: string;
  category: ProductCategory | string;
  price: number;
  image: string;
  description: string;
  available?: boolean;
  inStock?: boolean;
  popular?: boolean;
  stock?: number;
  badge?: string | null;
}

export interface Category {
  id: string;
  label: string;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  unitPrice: number;
  quantity: number;
  image: string;
  lineTotal: number;
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

export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'qr'
  | 'Cash'
  | 'Credit Card'
  | 'Debit Card'
  | 'QR Code'
  | 'Digital Wallet';

export interface SaleItem {
  id?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal?: number;
  cost?: number;
  refundedQuantity?: number;
}

export interface RefundItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  originalItemId?: string;
}

export interface RefundRequestItem {
  name: string;
  quantity: number;
  unitPrice?: number;
}

export interface RefundRequest {
  items: RefundRequestItem[];
  reason?: string;
  customAmount?: number;
}

export interface Transaction {
  id: string;
  orderNumber: string;
  dateTime: string;
  table: string;
  type: 'Dine-in' | 'Takeaway';
  amount: number;
  status: 'Receipt' | 'Completed' | 'Refunded';
  paymentMethod?: PaymentMethod | string;
  customerName?: string;
  currency?: string;
  items?: SaleItem[];
  itemSummary?: string;
  subtotal?: number;
  tax?: number;
  cashReceived?: number;
  change?: number;
  amountPaid?: number;
  paymentStatus?: 'Paid' | 'Refunded' | 'Pending';
  notes?: string;
  originalTransactionId?: string;
  originalOrderNumber?: string;
  refundedAmount?: number;
  refundReason?: string;
  refundCount?: number;
  refundSequence?: number;
  refundIds?: string[];
}

export type Sale = Transaction;

export type AppView = 'customer-qr' | 'dashboard';

export type DashboardTab = 'dashboard' | 'pos' | 'orders' | 'menu' | 'tables' | 'sales' | 'staff' | 'reports' | 'settings';

export type OrderType = 'Dine In' | 'Takeaway' | 'Delivery';

export type OrderStatus = 'Draft' | 'Pending' | 'Preparing' | 'Cooking' | 'Ready' | 'Served' | 'Completed' | 'Cancelled';

export type PaymentStatusType = 'Paid' | 'Pending' | 'Unpaid' | 'Refunded';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  table: string;
  customer: string;
  orderType: OrderType;
  items: OrderItem[];
  itemsSummary?: string;
  total: number;
  paymentStatus: PaymentStatusType;
  status: OrderStatus;
  dateTime: string;
  note?: string;
}

export interface OrderDraft {
  orderNumber?: string;
  tableId?: string;
  tableName?: string;
  orderType?: OrderType;
  customerId?: string;
  customerName?: string;
  note: string;
  status: OrderStatus;
  items: CartItem[];
  subtotal: number;
  tax?: number;
  serviceCharge?: number;
  total: number;
}



export type PaymentStatus = 'idle' | 'processing' | 'success' | 'failed';

export type PaymentCurrency = 'USD' | 'KHR';

export interface PaymentConfirmation {
  orderNumber: string;
  method: PaymentMethod;
  currency: PaymentCurrency;
  amount: number;
  currencyAmount: number;
  cashReceived?: number;
  change?: number;
  tableName?: string;
  timestamp: string;
}
