/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { Search, ShoppingCart, ArrowRight, X, Sparkles, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { MenuItem, Category, CartItem } from '../../types';
import { formatPrice } from '../../utils/format';

interface QRMenuProps {
  initialMenuItems: MenuItem[];
  categories: Category[];
  tableName: string;
  onSendOrderToKitchen: (itemsCount: number, total: number) => void;
}

export default function QRMenu({ initialMenuItems, categories, tableName, onSendOrderToKitchen }: QRMenuProps) {
  const [currentCategory, setCurrentCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [uiState, setUiState] = useState<'normal' | 'loading' | 'empty' | 'error'>('normal');
  const [cart, setCart] = useState<Record<string, CartItem>>({
    'food-2': {
      id: 'food-2',
      name: 'Spicy Salmon Roll',
      image: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=400&auto=format&fit=crop&q=80',
      unitPrice: 8.50,
      quantity: 1
    },
    'food-7': {
      id: 'food-7',
      name: 'Pork Gyoza 5pc',
      image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&auto=format&fit=crop&q=80',
      unitPrice: 6.50,
      quantity: 1
    },
    'food-10': {
      id: 'food-10',
      name: 'Yuzu Soda',
      image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&auto=format&fit=crop&q=80',
      unitPrice: 3.50,
      quantity: 1
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Derived Values
  const cartCount = useMemo(() => {
    return Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const cartTotal = useMemo(() => {
    return Object.values(cart).reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  }, [cart]);

  // Toast feedback helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 1500);
  };

  // Cart quantity actions
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const next = { ...prev };
      if (next[item.id]) {
        next[item.id] = { ...next[item.id], quantity: next[item.id].quantity + 1 };
      } else {
        next[item.id] = {
          id: item.id,
          name: item.name,
          image: item.image,
          unitPrice: item.price,
          quantity: 1
        };
      }
      return next;
    });
    triggerToast(`Added ${item.name}`);
  };

  const decrementItem = (itemId: string) => {
    setCart(prev => {
      const next = { ...prev };
      if (!next[itemId]) return prev;
      
      if (next[itemId].quantity > 1) {
        next[itemId] = { ...next[itemId], quantity: next[itemId].quantity - 1 };
      } else {
        delete next[itemId];
      }
      return next;
    });
  };

  const clearSearch = () => {
    setSearchQuery('');
    setUiState('normal');
  };

  const handleKitchenSubmit = () => {
    setIsCartOpen(false);
    onSendOrderToKitchen(cartCount, cartTotal);
    setCart({}); // clear cart
    triggerToast('Order sent to kitchen!');
  };

  // Filter Logic
  const filteredItems = useMemo(() => {
    if (uiState !== 'normal') return [];

    let list = initialMenuItems;
    
    if (currentCategory !== 'all') {
      list = list.filter(item => item.category === currentCategory);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(item => 
        item.name.toLowerCase().includes(q) || 
        item.description.toLowerCase().includes(q)
      );
    }

    return list;
  }, [initialMenuItems, currentCategory, searchQuery, uiState]);

  return (
    <div id="customer-view-container" className="bg-stone-100 min-h-screen flex justify-center selection:bg-orange-100 selection:text-orange-900 font-sans antialiased">
      
      {/* Simulated Mobile Core Framework */}
      <div id="simulated-mobile-frame" className="w-full max-w-[420px] bg-white min-h-screen flex flex-col shadow-2xl relative border-x border-stone-200">
        
        {/* Sticky Mobile Header bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-100 shrink-0">
          
          <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
            {/* Restaurant Profile details */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                K
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="font-bold text-stone-900 leading-tight text-xs">Hengheng pub</h1>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                </div>
                <p className="text-[10px] text-stone-500 font-medium">Japanese & Fusion Kitchen</p>
              </div>
            </div>

            {/* Table designation tag badge */}
            <div className="bg-stone-100 border border-stone-200/80 rounded-lg px-2.5 py-1 flex items-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <span className="text-[10px] font-bold text-stone-700 tracking-tight">Table <span className="text-orange-600 font-extrabold">{tableName.replace('Table ', '')}</span></span>
            </div>
          </div>

          {/* Quick Search bar */}
          <div className="px-4 pb-2.5 pt-1">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 absolute left-3 text-stone-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (uiState !== 'normal') setUiState('normal');
                }}
                placeholder="Search dishes, ramen, rolls..."
                className="w-full pl-9 pr-8 py-2 bg-stone-100/90 text-xs text-stone-800 placeholder-stone-400 rounded-xl border border-transparent focus:border-stone-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/15 transition-all text-xs"
              />
              {searchQuery.length > 0 && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2.5 text-stone-400 hover:text-stone-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Scrolling Categories selector rail */}
          <nav className="flex items-center gap-1.5 px-3.5 pb-2 overflow-x-auto no-scrollbar scroll-smooth border-t border-stone-50">
            {categories.map(cat => {
              const isActive = currentCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setCurrentCategory(cat.id);
                    if (uiState !== 'normal') setUiState('normal');
                  }}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all ${
                    isActive
                      ? 'bg-stone-900 text-white shadow-sm'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80 hover:text-stone-900'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </nav>

        </header>

        {/* State Switcher & Simulation Tool bar (Discrete developer helper) */}
        <div className="bg-stone-50 border-b border-stone-200/60 px-4 py-1.5 flex items-center justify-between text-[10px] text-stone-500 font-bold tracking-tight">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Interactive QR Mode
          </span>
          <div className="flex items-center gap-1">
            <span className="text-stone-400">State:</span>
            {(['normal', 'loading', 'empty', 'error'] as const).map(s => (
              <button
                key={s}
                onClick={() => setUiState(s)}
                className={`px-1.5 py-0.5 rounded capitalize leading-none ${
                  uiState === s
                    ? 'bg-stone-800 text-white font-black'
                    : 'hover:bg-stone-200 text-stone-500'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Core items scroll area panel */}
        <main className="flex-1 px-3.5 pt-3 pb-28 overflow-y-auto">
          
          {/* Header row stats count */}
          {uiState === 'normal' && (
            <div className="flex items-center justify-between mb-2.5 px-0.5">
              <h2 className="text-xs font-black text-stone-900 tracking-tight">
                {searchQuery ? `Results for "${searchQuery}"` : categories.find(c => c.id === currentCategory)?.label || 'All Dishes'}
              </h2>
              <span className="text-[10px] text-stone-500 font-bold">{filteredItems.length} item{filteredItems.length === 1 ? '' : 's'}</span>
            </div>
          )}

          {/* 1. NORMAL STATE GRID: Dual columns compact tiles matching exactly Kuro specs */}
          {uiState === 'normal' && filteredItems.length > 0 && (
            <div id="food-grid-view" className="grid grid-cols-2 gap-2.5">
              {filteredItems.map(item => {
                const cartQty = cart[item.id]?.quantity || 0;
                return (
                  <article
                    key={item.id}
                    className="bg-white border border-stone-200/90 rounded-2xl p-2 flex flex-col justify-between hover:border-stone-300 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.03)] group"
                  >
                    {/* Food thumbnail image with absolute badge */}
                    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-stone-100 mb-2">
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {item.badge && (
                        <span className="absolute top-1.5 left-1.5 bg-stone-900/80 backdrop-blur-xs text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-md uppercase">
                          {item.badge}
                        </span>
                      )}
                      {cartQty > 0 && (
                        <span className="absolute top-1.5 right-1.5 bg-orange-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                          {cartQty}
                        </span>
                      )}
                    </div>

                    {/* Food text info */}
                    <div className="px-1 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-extrabold text-stone-900 text-xs leading-tight line-clamp-1 mb-0.5">{item.name}</h3>
                        <p className="text-[10px] text-stone-500 line-clamp-1 mb-2 leading-relaxed">{item.description}</p>
                      </div>

                      {/* Add button or steppers */}
                      <div className="flex items-center justify-between pt-1 border-t border-stone-100 mt-auto">
                        <span className="font-bold text-stone-900 text-xs">{formatPrice(item.price)}</span>
                        
                        <div>
                          {cartQty === 0 ? (
                            <button
                              onClick={() => addToCart(item)}
                              className="bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-[11px] px-2.5 h-7 rounded-lg shadow-sm transition-all flex items-center gap-0.5 active:scale-95"
                            >
                              <span>+</span>
                              <span>Add</span>
                            </button>
                          ) : (
                            <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200/80">
                              <button
                                onClick={() => decrementItem(item.id)}
                                className="w-6 h-6 rounded-md bg-white hover:bg-stone-200 text-stone-700 flex items-center justify-center text-xs font-bold transition-colors shadow-xs active:scale-90"
                              >
                                −
                              </button>
                              <span className="px-1.5 min-w-[18px] text-center text-[11px] font-black text-stone-800">{cartQty}</span>
                              <button
                                onClick={() => addToCart(item)}
                                className="w-6 h-6 rounded-md bg-orange-600 hover:bg-orange-500 text-white flex items-center justify-center text-xs font-bold transition-colors shadow-xs active:scale-90"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>

                      </div>
                    </div>

                  </article>
                );
              })}
            </div>
          )}

          {/* 2. LOADING STATE: 4 Pulsing skeletal loaders */}
          {uiState === 'loading' && (
            <div id="loading-skeleton-view" className="grid grid-cols-2 gap-2.5">
              {[1, 2, 3, 4].map(idx => (
                <div key={idx} className="bg-stone-50 border border-stone-200/80 rounded-xl overflow-hidden p-2 flex flex-col justify-between animate-pulse">
                  <div className="w-full aspect-[4/3] bg-stone-200 rounded-lg mb-2"></div>
                  <div className="h-3.5 bg-stone-200 rounded w-3/4 mb-1.5"></div>
                  <div className="h-2.5 bg-stone-200 rounded w-1/2 mb-3"></div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="h-3.5 bg-stone-200 rounded w-10"></div>
                    <div className="w-7 h-7 bg-stone-200 rounded-lg"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. EMPTY STATE: Search empty results */}
          {(uiState === 'empty' || (uiState === 'normal' && filteredItems.length === 0)) && (
            <div id="empty-search-view" className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-3 border border-stone-200">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-stone-800 text-xs mb-1">No items found</h3>
              <p className="text-[10px] text-stone-500 max-w-[200px] mb-4">We couldn't find anything matching your search. Try another query.</p>
              <button
                onClick={clearSearch}
                className="text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3.5 py-1.5 rounded-lg border border-orange-200/60 transition-colors"
              >
                Clear Search
              </button>
            </div>
          )}

          {/* 4. ERROR STATE: Server connectivity error banner */}
          {uiState === 'error' && (
            <div id="error-alert-view" className="flex flex-col items-center justify-center py-14 px-4 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-3 border border-red-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-stone-800 text-xs mb-1">Failed to load menu</h3>
              <p className="text-[10px] text-stone-500 max-w-[220px] mb-4">Could not connect to table server. Please check connection and try again.</p>
              <button
                onClick={() => {
                  setUiState('loading');
                  setTimeout(() => setUiState('normal'), 800);
                }}
                className="text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Retry Loading</span>
              </button>
            </div>
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
                    <span>{cartCount} item{cartCount === 1 ? '' : 's'}</span>
                    <span className="text-stone-500 font-normal">·</span>
                    <span className="text-orange-400 font-black">{formatPrice(cartTotal)}</span>
                  </div>
                  <p className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">{tableName} Order</p>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCartOpen(true);
                }}
                className="bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-[11px] py-2 px-3.5 rounded-xl flex items-center gap-1 transition-colors shadow-sm"
              >
                <span>View Cart</span>
                <ArrowRight className="w-3 h-3 text-white font-extrabold" />
              </button>

            </div>
          </aside>
        )}

        {/* Modal Slide-Up Drawer wrapper */}
        {isCartOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end justify-center">
            <div className="bg-white w-full max-w-[420px] rounded-t-2xl shadow-2xl p-4 max-h-[80vh] flex flex-col border-t border-stone-200 animate-slide-up">
              
              {/* Header drawer info */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div>
                  <h3 className="font-extrabold text-stone-900 text-sm">Your Order</h3>
                  <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">{tableName} · Send to Kitchen</p>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items checklist rows */}
              <div className="py-3 overflow-y-auto divide-y divide-stone-100 flex-1 space-y-1">
                {Object.values(cart).map(cartItem => {
                  const lineTotal = cartItem.unitPrice * cartItem.quantity;
                  return (
                    <div key={cartItem.id} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2.5 pr-2 flex-1 min-w-0">
                        <img src={cartItem.image} alt={cartItem.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold text-stone-800 text-xs truncate">{cartItem.name}</div>
                          <div className="text-[10px] text-stone-400 font-semibold">{formatPrice(cartItem.unitPrice)} each</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200/80">
                          <button
                            onClick={() => decrementItem(cartItem.id)}
                            className="w-6 h-6 rounded-md bg-white hover:bg-stone-200 text-stone-700 flex items-center justify-center text-xs font-bold transition-colors"
                          >
                            −
                          </button>
                          <span className="px-1.5 min-w-[18px] text-center text-xs font-black text-stone-800">{cartItem.quantity}</span>
                          <button
                            onClick={() => addToCart({ id: cartItem.id, name: cartItem.name, image: cartItem.image, price: cartItem.unitPrice } as MenuItem)}
                            className="w-6 h-6 rounded-md bg-orange-600 hover:bg-orange-500 text-white flex items-center justify-center text-xs font-bold transition-colors"
                          >
                            +
                          </button>
                        </div>
                        <span className="font-mono font-bold text-xs text-stone-900 w-14 text-right">{formatPrice(lineTotal)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom fire actions CTA */}
              <div className="pt-3 border-t border-stone-100 space-y-3 shrink-0">
                <div className="flex justify-between items-center text-xs font-black">
                  <span className="text-stone-500 uppercase tracking-wider">Subtotal</span>
                  <span className="text-stone-900 font-extrabold text-sm">{formatPrice(cartTotal)}</span>
                </div>
                
                <button
                  onClick={handleKitchenSubmit}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 active:scale-95"
                >
                  <span>Send Order to Kitchen</span>
                  <Check className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        )}

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
