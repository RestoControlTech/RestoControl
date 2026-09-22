/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MenuItem, Category, Table, StaffMember, Transaction } from '../types';

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'food-1',
    category: 'popular',
    name: 'Tonkotsu Ramen',
    jpName: '豚骨ラーメン',
    description: 'Rich pork broth, chashu, soft egg, 16hr simmer',
    price: 13.50,
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&auto=format&fit=crop&q=80',
    badge: 'POPULAR',
    tag: 'Noodles',
    rating: 4.9,
    inStock: true
  },
  {
    id: 'food-2',
    category: 'popular',
    name: 'Spicy Salmon Roll',
    jpName: 'スパイシーサーモン',
    description: 'Atlantic salmon, spicy aioli, cucumber',
    price: 8.50,
    image: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=400&auto=format&fit=crop&q=80',
    badge: 'SPICY',
    tag: 'Chef Pick',
    inStock: true
  },
  {
    id: 'food-3',
    category: 'ramen',
    name: 'Black Garlic Miso',
    jpName: '黒蒜味噌',
    description: 'Fermented black garlic oil, roasted bamboo shoots',
    price: 14.00,
    image: 'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?w=400&auto=format&fit=crop&q=80',
    badge: 'SIGNATURE',
    tag: 'Noodles',
    inStock: true
  },
  {
    id: 'food-4',
    category: 'ramen',
    name: 'Shoyu Chicken Ramen',
    jpName: '醤油ラーメン',
    description: 'Clear chicken broth, nori, scallions, bamboo',
    price: 12.50,
    image: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=400&auto=format&fit=crop&q=80',
    badge: 'CLASSIC',
    tag: 'Noodles',
    inStock: true
  },
  {
    id: 'food-5',
    category: 'sushi',
    name: 'Tuna Nigiri 2pc',
    jpName: '鮪にぎり',
    description: 'Fresh yellowfin tuna over seasoned sushi rice',
    price: 7.00,
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&auto=format&fit=crop&q=80',
    badge: 'FRESH DAILY',
    tag: 'Raw',
    inStock: true
  },
  {
    id: 'food-6',
    category: 'sushi',
    name: 'Crispy Tempura Roll',
    jpName: '天ぷら盛り合わせ',
    description: 'Shrimp tempura, avocado, sweet soy glaze',
    price: 9.00,
    image: 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=400&auto=format&fit=crop&q=80',
    badge: 'SHARING',
    tag: 'Appetizers',
    inStock: true
  },
  {
    id: 'food-7',
    category: 'appetizers',
    name: 'Pork Gyoza 5pc',
    jpName: '焼き餃子',
    description: 'Pan-seared pork dumplings, ginger ponzu',
    price: 6.50,
    image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&auto=format&fit=crop&q=80',
    badge: 'BEST SELLER',
    tag: 'Appetizers',
    inStock: true
  },
  {
    id: 'food-8',
    category: 'appetizers',
    name: 'Sea Salt Edamame',
    jpName: '枝豆',
    description: 'Steamed young soybeans with Maldon flake salt',
    price: 4.50,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80',
    badge: 'VEGAN',
    tag: 'Appetizers',
    inStock: true
  },
  {
    id: 'food-9',
    category: 'drinks',
    name: 'Matcha Iced Latte',
    jpName: '抹茶ラテ',
    description: 'Ceremonial grade Uji matcha, oat milk, honey',
    price: 5.50,
    image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&auto=format&fit=crop&q=80',
    badge: 'UJI MATCHA',
    tag: 'Beverages',
    inStock: true
  },
  {
    id: 'food-10',
    category: 'drinks',
    name: 'Yuzu Soda',
    jpName: '柚子ソーダ',
    description: 'Sparkling Japanese yuzu citrus, mint sprig',
    price: 3.50,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&auto=format&fit=crop&q=80',
    badge: 'REFRESHING',
    tag: 'Beverages',
    inStock: true
  },
  {
    id: 'food-11',
    category: 'desserts',
    name: 'Chashu Don Bowl',
    jpName: 'チャーシュー丼',
    description: 'Tender braised pork belly over steamed rice, egg yolk',
    price: 11.00,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80',
    badge: 'MAINS',
    tag: 'Mains',
    inStock: true
  },
  {
    id: 'food-12',
    category: 'desserts',
    name: 'Mochi Ice Cream',
    jpName: 'もちアイス',
    description: 'Trio of sweet rice cakes filled with ice cream',
    price: 4.00,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&auto=format&fit=crop&q=80',
    badge: 'LOW STOCK (3 LEFT)',
    tag: 'Desserts',
    inStock: true
  }
];

export const CATEGORIES: Category[] = [
  { id: 'all', label: 'All Items', icon: '🍽️' },
  { id: 'popular', label: 'Popular', icon: '🔥' },
  { id: 'ramen', label: 'Ramen', icon: '🍜' },
  { id: 'sushi', label: 'Sushi & Rolls', icon: '🍣' },
  { id: 'appetizers', label: 'Appetizers', icon: '🥟' },
  { id: 'drinks', label: 'Drinks', icon: '🍵' }
];

export const TABLES_DATA: Table[] = [
  { id: 't1', name: 'Table 01', section: 'Main Dining', seats: 4, status: 'Occupied', qrCodeUrl: 'kurobistro.menu/t/01' },
  { id: 't2', name: 'Table 02', section: 'Main Dining - 2', seats: 2, status: 'Available', qrCodeUrl: 'kurobistro.menu/t/02' },
  { id: 't3', name: 'Table 03', section: 'Main Dining', seats: 4, status: 'Occupied', qrCodeUrl: 'kurobistro.menu/t/03' },
  { id: 't4', name: 'Table 04', section: 'Main Dining - 2', seats: 4, status: 'Available', qrCodeUrl: 'kurobistro.menu/t/04' },
  { id: 't5', name: 'Table 05', section: 'Indoor Booths', seats: 6, status: 'Occupied', qrCodeUrl: 'kurobistro.menu/t/05' },
  { id: 't6', name: 'Table 06', section: 'Indoor Booths', seats: 4, status: 'Available', qrCodeUrl: 'kurobistro.menu/t/06' },
  { id: 't7', name: 'Table 07', section: 'Outdoor Terrace - 2', seats: 2, status: 'Available', qrCodeUrl: 'kurobistro.menu/t/07' },
  { id: 't8', name: 'Table 08', section: 'Outdoor Terrace - 4', seats: 4, status: 'Occupied', qrCodeUrl: 'kurobistro.menu/t/08' }
];

export const STAFF_DATA: StaffMember[] = [
  { id: 's1', name: 'Kenji Sato', email: 'kenji.s@kurobistro.com', role: 'Manager', station: 'Register 01', status: 'Active' },
  { id: 's2', name: 'Alex M.', email: 'alex.m@kurobistro.com', role: 'Cashier', station: 'Register 01', status: 'Active' },
  { id: 's3', name: 'Yumi Tanaka', email: 'yumi.t@kurobistro.com', role: 'Kitchen', station: 'Kitchen Display', status: 'Active' },
  { id: 's4', name: 'Daiki Takahashi', email: 'daiki.t@kurobistro.com', role: 'Waiter', station: 'Handheld 02', status: 'Active' },
  { id: 's5', name: 'Ren Ishikawa', email: 'ren.i@kurobistro.com', role: 'Kitchen', station: 'Kitchen Display', status: 'Active' },
  { id: 's6', name: 'Hana Mori', email: 'hana.m@kurobistro.com', role: 'Waiter', station: 'Unassigned', status: 'Off Duty' },
  { id: 's7', name: 'Sora Watanabe', email: 'sora.w@kurobistro.com', role: 'Cashier', station: 'Unassigned', status: 'Off Duty' },
  { id: 's8', name: 'Emi Kobayashi', email: 'emi.k@kurobistro.com', role: 'Manager', station: 'Unassigned', status: 'Off Duty' }
];

export const TRANSACTIONS_DATA: Transaction[] = [
  { id: 'tx1', orderNumber: '#TX-9042', dateTime: 'Oct 24, 19:42', table: 'Table 09', type: 'Dine-in', amount: 33.50, status: 'Receipt' },
  { id: 'tx2', orderNumber: '#TX-9041', dateTime: 'Oct 24, 19:35', table: 'Pickup', type: 'Takeaway', amount: 23.50, status: 'Receipt' },
  { id: 'tx3', orderNumber: '#TX-9040', dateTime: 'Oct 24, 19:18', table: 'Table 03', type: 'Dine-in', amount: 155.00, status: 'Receipt' },
  { id: 'tx4', orderNumber: '#TX-9039', dateTime: 'Oct 24, 18:52', table: 'Table 14', type: 'Dine-in', amount: -18.00, status: 'Refunded' },
  { id: 'tx5', orderNumber: '#TX-9038', dateTime: 'Oct 24, 18:31', table: 'Table 07', type: 'Dine-in', amount: 42.00, status: 'Receipt' },
  { id: 'tx6', orderNumber: '#TX-9037', dateTime: 'Oct 24, 18:14', table: 'Table 02', type: 'Dine-in', amount: 26.50, status: 'Receipt' },
  { id: 'tx7', orderNumber: '#TX-9036', dateTime: 'Oct 24, 17:58', table: 'Pickup', type: 'Takeaway', amount: 68.00, status: 'Receipt' }
];
