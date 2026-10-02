/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  PlusCircle, 
  Utensils, 
  QrCode, 
  History, 
  Users, 
  UserCheck, 
  Settings, 
  LogOut, 
  Bell, 
  ChevronRight, 
  Terminal,
  X,
  User as UserIcon
} from 'lucide-react';
import { DashboardTab, Permission } from '../types';
import { SearchBar, Button } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { usePermission } from '../hooks/usePermission';
import { useSettings } from '../hooks/useSettings';
import { useTranslation } from '../i18n';
import { useOrderNotificationStore } from '../store/orderNotification.store';
import { UserProfileModal } from '../components/profile';

export interface NavItemConfig {
  id: DashboardTab;
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  permission?: Permission;
}

export const SIDEBAR_NAV_ITEMS: NavItemConfig[] = [
  { id: 'pos', path: '/pos', label: 'POS', icon: PlusCircle, permission: 'pos.use' },
  { id: 'orders', path: '/orders', label: 'Orders', icon: ShoppingBag, permission: 'orders.view' },
  { id: 'sales', path: '/sales', label: 'Sale History', icon: History, permission: 'sales.view' },
  { id: 'menu', path: '/menu', label: 'Menu', icon: Utensils, permission: 'menu.view' },
  { id: 'tables', path: '/tables', label: 'Tables', icon: QrCode, permission: 'tables.view' },
  { id: 'staff', path: '/staff', label: 'Staff', icon: Users, permission: 'staff.view' },
  { id: 'customers', path: '/customer', label: 'Customers', icon: UserCheck, permission: 'pos.use' },
  { id: 'settings', path: '/settings', label: 'Settings', icon: Settings, permission: 'settings.view' },
  { id: 'profile', path: '/profile', label: 'Profile', icon: UserIcon },
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
  const { settings } = useSettings();
  const { t, language } = useTranslation();

  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#topbar-user-dropdown') && !target.closest('#btn-topbar-profile')) {
        setShowUserDropdown(false);
      }
    };
    if (showUserDropdown) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showUserDropdown]);

  const { notifications, activeToast, dismissToast, markAsHandled, clearAll } =
    useOrderNotificationStore();

  const unhandledOrdersCount = notifications.filter((n) => !n.handled).length;

  const currentUser = authUser
    ? {
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        phone: authUser.phone,
        role: authUser.role === 'admin' ? 'Administrator' : 'Staff Member',
        rawRole: authUser.role,
        avatar: authUser.avatar,
      }
    : propUser
    ? { id: 'usr-guest', name: propUser.name, email: '', phone: '', role: propUser.role, rawRole: 'staff', avatar: undefined }
    : { id: 'usr-guest', name: 'Staff User', email: '', phone: '', role: 'Staff', rawRole: 'staff', avatar: undefined };

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
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.restaurantName || 'Restaurant Logo'}
                className="w-9 h-9 rounded-xl object-cover border border-slate-100 shadow-sm"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0">
                {settings.restaurantName ? settings.restaurantName.charAt(0).toUpperCase() : 'R'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="font-extrabold text-slate-900 tracking-tight text-sm uppercase truncate">
                {settings.restaurantName || 'RESTOCONTROL'}
              </h1>
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
                <span>{t('customerQrView', 'CUSTOMER QR VIEW')}</span>
              </span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Navigation Links - Filtered Dynamically by Permissions */}
          <nav id="sidebar-nav" className="px-3 py-2 space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path || (currentPath === '/' && item.path === '/pos') || activeTab === item.id;
              
              // Dynamic Orders notification badge (never hardcoded!)
              const dynamicBadge = item.id === 'orders' ? (unhandledOrdersCount > 0 ? unhandledOrdersCount : undefined) : item.badge;

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
                    <span>{language === 'en' ? item.label : t(item.id as any, item.label)}</span>
                  </span>
                  {dynamicBadge !== undefined && dynamicBadge > 0 && (
                    <span className="bg-orange-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                      {dynamicBadge}
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
            <div
              id="current-user-info"
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-3 bg-slate-50/70 hover:bg-orange-50/50 p-2.5 rounded-xl border border-slate-100/60 hover:border-orange-200 transition-all cursor-pointer group"
              title="Click to view and edit profile"
            >
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-lg object-cover shadow-xs border border-orange-200 group-hover:scale-105 transition-transform shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs uppercase shadow-xs group-hover:scale-105 transition-transform shrink-0">
                  {currentUser.name.slice(0, 2)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-800 truncate leading-snug group-hover:text-orange-600 transition-colors">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-slate-400 font-medium flex items-center justify-between">
                  <span>{currentUser.role}</span>
                  <span className="text-[9px] text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold">Edit</span>
                </div>
              </div>
            </div>
          )}
          
          <button 
            id="btn-sidebar-logout"
            onClick={handleLogoutClick}
            className="w-full text-slate-400 hover:text-slate-600 font-semibold text-xs py-2 px-1 flex items-center gap-2.5 transition-colors active:scale-[0.98] cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('logout', 'Logout')}</span>
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
              placeholder={t('searchPlaceholder', 'Search orders, menu, or bills...')}
            />
          </div>

          {/* Right Header Tray (hidden on New Order / POS page) */}
          {!(currentPath === '/pos' || activeTab === 'pos') && (
            <div className="flex items-center gap-4.5">
              {/* Terminal Status light */}
              <div className="flex items-center gap-2 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100 animate-pulse"></span>
                <span className="text-[10px] font-bold text-emerald-600">Active</span>
              </div>

              {/* Dynamic Notification Bell */}
              <div className="relative">
                <button
                  id="btn-topbar-bell"
                  type="button"
                  onClick={() => setShowNotificationsDropdown((prev) => !prev)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-500 relative transition-colors active:scale-95 cursor-pointer"
                  title={unhandledOrdersCount > 0 ? `${unhandledOrdersCount} unhandled order notification(s)` : 'Notifications'}
                >
                  <Bell className="w-4 h-4" />
                  {unhandledOrdersCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-orange-500 ring-2 ring-white text-[9px] font-black text-white flex items-center justify-center animate-pulse">
                      {unhandledOrdersCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown Panel */}
                {showNotificationsDropdown && (
                  <div
                    id="topbar-notifications-dropdown"
                    className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-3 space-y-2 animate-fade-in"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5 font-black text-xs text-slate-900">
                        <Bell className="w-3.5 h-3.5 text-orange-500" />
                        <span>Order Notifications ({unhandledOrdersCount})</span>
                      </div>
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            clearAll();
                            setShowNotificationsDropdown(false);
                          }}
                          className="text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4 font-medium">
                          No order notifications
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-2.5 rounded-xl border text-xs transition-colors flex items-center justify-between gap-2 ${
                              !n.handled
                                ? 'bg-orange-50/60 border-orange-200/70'
                                : 'bg-slate-50/70 border-slate-100'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="font-extrabold text-slate-900 truncate">
                                {n.tableName}{' '}
                                <span className="text-[10px] font-mono text-slate-400">
                                  ({n.orderNumber})
                                </span>
                              </p>
                              <p className="text-[10px] text-slate-500 font-medium">
                                {n.itemCount} items · ${n.total.toFixed(2)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                markAsHandled(n.orderId);
                                setShowNotificationsDropdown(false);
                                navigate(`/orders?orderId=${encodeURIComponent(n.orderId)}`);
                              }}
                              className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-[10px] font-black shrink-0 transition-colors cursor-pointer"
                            >
                              View
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar & Dropdown Menu */}
              <div className="relative">
                <button
                  id="btn-topbar-profile"
                  type="button"
                  onClick={() => setShowUserDropdown((prev) => !prev)}
                  className="w-8 h-8 rounded-lg overflow-hidden bg-orange-50 text-orange-600 flex items-center justify-center text-xs font-bold hover:scale-105 transition-transform cursor-pointer border border-orange-200/60 ring-2 ring-transparent hover:ring-orange-200"
                  title="My Profile & Account"
                >
                  {currentUser.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    currentUser?.name.slice(0, 2) || (settings.restaurantName ? settings.restaurantName.slice(0, 2).toUpperCase() : 'RC')
                  )}
                </button>

                {showUserDropdown && (
                  <div
                    id="topbar-user-dropdown"
                    className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 space-y-1 animate-fade-in"
                  >
                    {/* User Summary Header */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100/80 flex items-center gap-3">
                      {currentUser.avatar ? (
                        <img
                          src={currentUser.avatar}
                          alt={currentUser.name}
                          className="w-10 h-10 rounded-xl object-cover border border-orange-200 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-black text-sm uppercase shrink-0">
                          {currentUser.name.slice(0, 2)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-800 truncate">
                          {currentUser.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {currentUser.email || currentUser.role}
                        </p>
                        <span className="inline-block mt-0.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                          {currentUser.role}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserDropdown(false);
                          setIsProfileModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors cursor-pointer text-left"
                      >
                        <UserIcon className="w-4 h-4 text-orange-500" />
                        <span>My Profile (Drop Avatar)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowUserDropdown(false);
                          navigate('/settings');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                      >
                        <Settings className="w-4 h-4 text-slate-400" />
                        <span>Settings</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowUserDropdown(false);
                          handleSwitchToCustomer();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                      >
                        <Terminal className="w-4 h-4 text-slate-400" />
                        <span>Customer QR View</span>
                      </button>

                      <div className="border-t border-slate-100 my-1" />

                      <button
                        type="button"
                        onClick={() => {
                          setShowUserDropdown(false);
                          handleLogoutClick();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </header>

        {/* Dynamic Inner Panel View Container */}
        <main id="tab-panel-container" className="flex-1 p-6 overflow-y-auto relative">
          {children}
        </main>

      </div>

      {/* Floating New Order Toast Notification (Matches Clean UX Requirement) */}
      {activeToast && (
        <div
          id="new-order-toast-notification"
          className="fixed bottom-6 right-6 z-50 bg-white border border-orange-200/90 rounded-2xl shadow-2xl p-4 max-w-xs w-full animate-fade-in space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-600 font-extrabold text-xs tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
              <Bell className="w-4 h-4" />
              <span>New Order</span>
            </div>
            <button
              type="button"
              onClick={dismissToast}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md cursor-pointer transition-colors"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <div className="text-base font-black text-slate-900 tracking-tight">
              {activeToast.tableName}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">
              {activeToast.itemCount} {activeToast.itemCount === 1 ? 'item' : 'items'} ·{' '}
              <span className="font-bold text-slate-800">${activeToast.total.toFixed(2)}</span>
            </div>
          </div>

          <Button
            id="btn-toast-view-order"
            variant="primary"
            size="sm"
            fullWidth
            onClick={() => {
              markAsHandled(activeToast.orderId);
              dismissToast();
              navigate(`/orders?orderId=${encodeURIComponent(activeToast.orderId)}`);
            }}
            className="font-bold text-xs shadow-xs"
          >
            View Order
          </Button>
        </div>
      )}

      {/* User Profile Modal with Drag & Drop Avatar */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

    </div>
  );
}
