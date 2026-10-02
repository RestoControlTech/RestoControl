/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { ShoppingCart, ArrowRight, Check } from 'lucide-react';
import { MenuItem, Category, CartItem } from '../../types';
import { formatPrice } from '../../utils/format';
import {
  Button,
  SearchBar,
  LoadingState,
  EmptyState,
  ErrorState,
} from '../../components/ui';
import { CartDrawer, QRProductCard } from '../../components/customer';
import { useSettings } from '../../hooks/useSettings';
import { useTranslation } from '../../i18n';

export interface QROrderSubmission {
  tableName: string;
  tableId?: string;
  items: CartItem[];
  total: number;
  count: number;
}

export interface QRMenuProps {
  initialMenuItems?: MenuItem[];
  categories?: Category[];
  tableName: string;
  tableId?: string;
  onSendOrderToKitchen: (orderOrCount: QROrderSubmission | number, total?: number) => void;
}

export default function QRMenu({
  initialMenuItems = [],
  categories = [],
  tableName,
  tableId,
  onSendOrderToKitchen,
}: QRMenuProps) {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const [currentCategory, setCurrentCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [uiState, setUiState] = useState<'normal' | 'loading' | 'empty' | 'error'>('normal');
  const [cart, setCart] = useState<Record<string, CartItem>>({});

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Strictly use categories from props (default to Khmer 'ទាំងអស់')
  const displayCategories = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories.map((c) => ({
        id: c.id,
        label: c.id === 'all' && (c.label === 'All Items' || !c.label) ? 'ទាំងអស់' : c.label,
      }));
    }
    return [{ id: 'all', label: 'ទាំងអស់' }];
  }, [categories]);

  // Derived Values
  const cartCount = useMemo(() => {
    return Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const cartTotal = useMemo(() => {
    return Object.values(cart).reduce((sum, item) => sum + item.lineTotal, 0);
  }, [cart]);

  // Toast feedback helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 1500);
  };

  // Cart quantity actions
  const addToCart = (item: MenuItem) => {
    if (item.inStock === false) {
      triggerToast(`${item.name} អស់ពីស្តុកហើយ`);
      return;
    }

    setCart(prev => {
      const next = { ...prev };
      const existingItem = next[item.id];
      if (existingItem) {
        const nextQty = existingItem.quantity + 1;
        next[item.id] = {
          ...existingItem,
          quantity: nextQty,
          lineTotal: existingItem.price * nextQty
        };
      } else {
        next[item.id] = {
          id: item.id,
          productId: item.id,
          name: item.name,
          image: item.image,
          price: item.price,
          unitPrice: item.price,
          quantity: 1,
          lineTotal: item.price,
        };
      }
      return next;
    });
    triggerToast(`បានបន្ថែម ${item.name}`);
  };

  const decrementItem = (itemId: string) => {
    setCart(prev => {
      const next = { ...prev };
      const itemToDec = next[itemId];
      if (!itemToDec) return prev;

      if (itemToDec.quantity > 1) {
        const nextQty = itemToDec.quantity - 1;
        next[itemId] = {
          ...itemToDec,
          quantity: nextQty,
          lineTotal: itemToDec.price * nextQty,
        };
      } else {
        delete next[itemId];
      }
      return next;
    });
  };

  const clearSearch = () => {
    setSearchQuery('');
    setCurrentCategory('all');
    setUiState('normal');
  };

  const handleKitchenSubmit = () => {
    const cartItems = Object.values(cart);
    if (cartItems.length === 0 || cartCount === 0) {
      triggerToast('កន្ត្រករបស់អ្នកទទេ');
      return;
    }

    setIsCartOpen(false);
    onSendOrderToKitchen({
      tableName,
      tableId,
      items: cartItems,
      total: cartTotal,
      count: cartCount,
    }, cartTotal);
    setCart({}); // clear cart
    triggerToast('បានផ្ញើការកុម្ម៉ង់ទៅចង្ក្រានបាយ!');
  };

  // Filter Logic
  const filteredItems = useMemo(() => {
    if (uiState !== 'normal') return [];

    let list = initialMenuItems || [];

    if (currentCategory !== 'all') {
      const targetCat = currentCategory.toLowerCase();
      list = list.filter(item => (item.category || '').toLowerCase() === targetCat);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(item =>
        (item.name || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [initialMenuItems, currentCategory, searchQuery, uiState]);

  const isMenuCompletelyEmpty = (initialMenuItems || []).length === 0;

  return (
    <div id="customer-view-container" className="bg-stone-100 min-h-screen flex justify-center selection:bg-orange-100 selection:text-orange-900 font-sans antialiased">

      {/* Simulated Mobile Core Framework */}
      <div id="simulated-mobile-frame" className="w-full max-w-[420px] bg-white min-h-screen flex flex-col shadow-2xl relative border-x border-stone-200">

        {/* Sticky Mobile Header bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-100 shrink-0">

          <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
            {/* Restaurant Profile details */}
            <div className="flex items-center gap-2.5">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.restaurantName || 'Restaurant'}
                  className="w-9 h-9 rounded-xl object-cover border border-stone-200 shadow-sm"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {settings.restaurantName ? settings.restaurantName.charAt(0).toUpperCase() : 'K'}
                </div>
              )}
              <div>
                <h1 className="font-bold text-stone-900 leading-tight text-xs">
                  {settings.restaurantName || 'Kuro Bistro'}
                </h1>
                <p className="text-[10px] text-stone-500 font-medium">ភោជនីយដ្ឋាន & អាហារ</p>
              </div>
            </div>

            {/* Table designation tag badge */}
            <div className="bg-stone-100 border border-stone-200/80 rounded-lg px-2.5 py-1 flex items-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <span className="text-[10px] font-bold text-stone-700 tracking-tight">តុ <span className="text-orange-600 font-extrabold">{tableName.replace(/^Table\s*/i, '')}</span></span>
            </div>
          </div>

          {/* Quick Search bar */}
          <div className="px-4 pb-2.5 pt-1">
            <SearchBar
              value={searchQuery}
              onChange={(val) => {
                setSearchQuery(val);
                if (uiState !== 'normal') setUiState('normal');
              }}
              placeholder="ស្វែងរកមុខម្ហូប..."
              size="sm"
              className="bg-stone-100/90 text-stone-800 placeholder-stone-400 border-transparent focus:border-stone-300"
            />
          </div>

          {/* Scrolling Categories selector rail */}
          <nav className="flex items-center gap-1.5 px-3.5 pb-2 overflow-x-auto no-scrollbar scroll-smooth border-t border-stone-50">
            {displayCategories.map(cat => {
              const isActive = currentCategory.toLowerCase() === cat.id.toLowerCase();
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCurrentCategory(cat.id);
                    if (uiState !== 'normal') setUiState('normal');
                  }}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${isActive
                      ? 'bg-stone-900 text-white shadow-sm'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80 hover:text-stone-900'
                    }`}
                >
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </nav>

        </header>


        {/* Core items scroll area panel */}
        <main className="flex-1 px-3.5 pt-3 pb-28 overflow-y-auto">

          {/* Header row stats count */}
          {uiState === 'normal' && !isMenuCompletelyEmpty && (
            <div className="flex items-center justify-between mb-2.5 px-0.5">
              <h2 className="text-xs font-black text-stone-900 tracking-tight">
                {searchQuery
                  ? `លទ្ធផលសម្រាប់ "${searchQuery}"`
                  : displayCategories.find(c => c.id.toLowerCase() === currentCategory.toLowerCase())?.label || 'មុខម្ហូបទាំងអស់'}
              </h2>
              <span className="text-[10px] text-stone-500 font-bold">{filteredItems.length} មុខ</span>
            </div>
          )}

          {/* 1. NORMAL STATE GRID: Dual columns compact tiles */}
          {uiState === 'normal' && filteredItems.length > 0 && (
            <div id="food-grid-view" className="grid grid-cols-2 gap-2.5">
              {filteredItems.map(item => (
                <QRProductCard
                  key={item.id}
                  item={item}
                  cartQuantity={cart[item.id]?.quantity || 0}
                  onAddToCart={addToCart}
                  onDecrement={decrementItem}
                />
              ))}
            </div>
          )}

          {/* 2. LOADING STATE: 4 Pulsing skeletal loaders */}
          {uiState === 'loading' && (
            <LoadingState count={4} type="grid" />
          )}

          {/* 3A. EMPTY PRODUCTION MENU STATE: When restaurant currently has no items in the menu */}
          {uiState === 'normal' && isMenuCompletelyEmpty && (
            <div id="qr-menu-empty-state">
              <EmptyState
                title="មិនទាន់មានមុខម្ហូបនៅឡើយទេ"
                description="មិនទាន់មានមុខម្ហូបសម្រាប់តុនេះនៅឡើយទេ។ សូមពិគ្រោះជាមួយបុគ្គលិក។"
              />
            </div>
          )}

          {/* 3B. EMPTY SEARCH/FILTER RESULTS: When items exist in menu, but current search or category has 0 matches */}
          {(uiState === 'empty' || (uiState === 'normal' && !isMenuCompletelyEmpty && filteredItems.length === 0)) && (
            <div id="qr-search-empty-state">
              <EmptyState
                title="រកមិនឃើញមុខម្ហូបទេ"
                description="រកមិនឃើញមុខម្ហូបដែលត្រូវនឹងការស្វែងរករបស់អ្នកទេ។ សូមសាកល្បងពាក្យផ្សេង។"
                actionText="សម្អាតការស្វែងរក"
                onAction={clearSearch}
              />
            </div>
          )}

          {/* 4. ERROR STATE: Server connectivity error banner */}
          {uiState === 'error' && (
            <ErrorState
              title="មិនអាចទាញយកមុខម្ហូបបានទេ"
              message="មិនអាចភ្ជាប់ទៅកាន់ប្រព័ន្ធបានទេ។ សូមពិនិត្យមើលការតភ្ជាប់ និងព្យាយាមម្តងទៀត។"
              retryText="ព្យាយាមម្តងទៀត"
              onRetry={() => {
                setUiState('loading');
                setTimeout(() => setUiState('normal'), 800);
              }}
            />
          )}

        </main>

        {/* Dynamic bottom sticky cart notification drawer */}
        {cartCount > 0 && (
          <aside className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[396px] z-40 transition-all duration-200">
            <div
              onClick={() => setIsCartOpen(true)}
              className="bg-stone-900 text-white rounded-2xl p-3 shadow-xl border border-stone-800/80 flex items-center justify-between cursor-pointer hover:bg-stone-850 transition-colors select-none"
            >

              {/* Cart contents labels */}
              <div className="flex items-center gap-2.5 pl-1">
                <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-stone-800 text-orange-400">
                  <ShoppingCart className="w-4 h-4" />
                  <span className="absolute -top-1.5 -right-1.5 bg-orange-600 text-white text-[9px] font-black h-4 min-w-4 px-1 rounded-full flex items-center justify-center ring-2 ring-stone-900">
                    {cartCount}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-extrabold text-white tracking-tight flex items-center gap-1.5">
                    <span>{cartCount} មុខ</span>
                    <span className="text-stone-500 font-normal">·</span>
                    <span className="text-orange-400 font-black">{formatPrice(cartTotal)}</span>
                  </div>
                  <p className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">ការកុម្ម៉ង់ {tableName}</p>
                </div>
              </div>

              {/* Action Button */}
              <Button
                variant="primary"
                size="sm"
                iconRight={<ArrowRight className="w-3 h-3 text-white font-extrabold" />}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCartOpen(true);
                }}
              >
                មើលកន្ត្រក
              </Button>

            </div>
          </aside>
        )}

        {/* Modal Slide-Up Cart Drawer */}
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          tableName={tableName}
          cart={cart}
          cartTotal={cartTotal}
          onAddToCart={addToCart}
          onDecrementItem={decrementItem}
          onSubmitOrder={handleKitchenSubmit}
        />

        {/* In-app Action Notification Toast alerts */}
        {toastMessage && (
          <div
            id="toast-alert"
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white text-[11px] font-bold px-3.5 py-2 rounded-full shadow-lg transition-all flex items-center gap-1.5 border border-stone-800"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

      </div>

    </div>
  );
}
