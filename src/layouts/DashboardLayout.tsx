/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  PlusCircle,
  Utensils, 
  QrCode, 
  History, 
  Users, 
  Settings, 
  LogOut, 
  Bell, 
  ChevronRight, 
  Terminal,
  FileBarChart
} from 'lucide-react';
import { DashboardTab, Permission } from '../types';
import { SearchBar } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { usePermission } from '../hooks/usePermission';

export interface NavItemConfig {
  id: DashboardTab;
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  permission: Permission;
}

export const SIDEBAR_NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { id: 'pos', path: '/pos', label: 'New Order', icon: PlusCircle, permission: 'pos.use' },
  { id: 'orders', path: '/orders', label: 'Orders', icon: ShoppingBag, badge: 5, permission: 'orders.view' },
  { id: 'menu', path: '/menu', label: 'Menu', icon: Utensils, permission: 'menu.view' },
  { id: 'tables', path: '/tables', label: 'Tables & QR', icon: QrCode, permission: 'tables.view' },
  { id: 'sales', path: '/sales', label: 'Sales History', icon: History, permission: 'sales.view' },
  { id: 'staff', path: '/staff', label: 'Staff', icon: Users, permission: 'staff.view' },
  { id: 'reports', path: '/reports', label: 'Reports', icon: FileBarChart, permission: 'reports.view' },
  { id: 'settings', path: '/settings', label: 'Settings', icon: Settings, permission: 'settings.view' },
];

interface DashboardLayoutProps {
  activeTab?: DashboardTab;
  setActiveTab?: (tab: DashboardTab) => void;
  children: React.ReactNode;
  onLogout?: () => void;
  currentUser?: { name: string; role: string } | null;
  onSwitchToCustomerView?: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function DashboardLayout({
  activeTab,
  setActiveTab,
  children,
  onLogout,
  currentUser: propUser,
  onSwitchToCustomerView,
  searchQuery,
  setSearchQuery
}: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, logout: authLogout } = useAuth();
  const { hasPermission } = usePermission();

  const currentUser = authUser
    ? { name: authUser.name, role: authUser.role === 'admin' ? 'Administrator' : 'Staff Member' }
    : propUser || { name: 'Staff User', role: 'Staff' };

  // Filter navigation items based on centralized permission authorization
  const visibleNavItems = SIDEBAR_NAV_ITEMS.filter((item) =>
    !item.permission || hasPermission(item.permission)
  );

  const currentPath = location.pathname;

  const handleNavClick = (item: NavItemConfig) => {
    if (setActiveTab) {
      setActiveTab(item.id);
    }
    navigate(item.path);
  };

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    }
    authLogout();
    navigate('/login', { replace: true });
  };

  const handleSwitchToCustomer = () => {
    if (onSwitchToCustomerView) {
      onSwitchToCustomerView();
    } else {
      navigate('/customer');
    }
  };

  return (
    <div id="dashboard-layout-root" className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased flex">
      
      {/* Left Sidebar Layout */}
      <aside id="sidebar-container" className="w-[260px] bg-white border-r border-slate-100 flex flex-col justify-between shrink-0 h-screen sticky top-0">
        
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand Logo & Header */}
          <div className="p-5 flex items-center gap-3 border-b border-slate-50">
            <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
              R
            </div>
            <div>
              <h1 className="font-extrabold text-slate-900 tracking-tight text-sm uppercase">RESTOCONTROL</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">RESTOCONTROL</p>
            </div>
          </div>

          {/* Quick Access Client-View Simulator Button */}
          <div className="px-4 pt-4 pb-2">
            <button 
              id="btn-customer-qr-shortcut"
              onClick={handleSwitchToCustomer}
              className="w-full bg-orange-50 hover:bg-orange-100 text-orange-700 hover:text-orange-800 transition-all text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-between border border-orange-200/40 group active:scale-[0.98] cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5" />
                <span>CUSTOMER QR VIEW</span>
              </span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Navigation Links - Filtered Dynamically by Permissions */}
          <nav id="sidebar-nav" className="px-3 py-2 space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path || (currentPath === '/' && item.path === '/dashboard') || activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => handleNavClick(item)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-all active:scale-[0.99] cursor-pointer ${
                    isActive 
                      ? 'bg-orange-50/60 text-orange-600' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-orange-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </span>
                  {item.badge && (
                    <span className="bg-orange-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Info */}
        <div className="p-4 border-t border-slate-50 space-y-3">
          {currentUser && (
            <div id="current-user-info" className="flex items-center gap-3 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100/60">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                {currentUser.name.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 truncate leading-snug">{currentUser.name}</div>
                <div className="text-[10px] text-slate-400 font-medium">{currentUser.role}</div>
              </div>
            </div>
          )}
          
          <button 
            id="btn-sidebar-logout"
            onClick={handleLogoutClick}
            className="w-full text-slate-400 hover:text-slate-600 font-semibold text-xs py-2 px-1 flex items-center gap-2.5 transition-colors active:scale-[0.98] cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>

      </aside>

      {/* Right Canvas Main Frame */}
      <div id="main-content-wrapper" className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
        
        {/* Sticky Top Bar Header */}
        <header id="top-bar-header" className="h-[70px] bg-white border-b border-slate-100 px-6 shrink-0 flex items-center justify-between sticky top-0 z-20">
          
          {/* Dynamic Search Box */}
          <div className="w-full max-w-[420px]">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search orders, menu, or bills..."
            />
          </div>

          {/* Right Header Tray */}
          <div className="flex items-center gap-4.5">
            {/* Status light */}
            <div className="flex items-center gap-2 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100 animate-pulse"></span>
              <span className="text-[10px] font-bold text-emerald-600">Online</span>
            </div>

            {/* Notification Bell */}
            <button id="btn-topbar-bell" className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-500 relative transition-colors active:scale-95 cursor-pointer">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500 ring-2 ring-white"></span>
            </button>

            {/* Avatar block */}
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center text-xs font-bold hover:scale-105 transition-transform cursor-pointer">
              {currentUser?.name.slice(0, 2) || 'KB'}
            </div>
          </div>

        </header>

        {/* Dynamic Inner Panel View Container */}
        <main id="tab-panel-container" className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>

      </div>

    </div>
  );
}
