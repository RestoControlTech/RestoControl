/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Sparkles, Utensils, X } from 'lucide-react';
import { Product, CartItem, OrderStatus, OrderDraft, PaymentConfirmation } from '../../types';
import { PRODUCTS } from '../../data/products';
import { TABLES_DATA } from '../../data/mockData';
import { Tabs, SearchBar, Button } from '../../components/ui';
import { ProductGrid, TicketPanel, PaymentModal } from '../../components/pos';

export interface POSProps {
  products?: Product[];
  searchQuery?: string;
  onSelectProduct?: (product: Product) => void;
  onOrderChange?: (draft: OrderDraft) => void;
  onPaymentComplete?: (confirmation: PaymentConfirmation) => void;
}

export default function POS({
  products = PRODUCTS,
  searchQuery: externalSearch = '',
  onSelectProduct,
  onOrderChange,
  onPaymentComplete,
}: POSProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [localSearch, setLocalSearch] = useState<string>('');
  
  // Single Source of Truth for POS Ticket Cart State
  const [cart, setCart] = useState<CartItem[]>([]);

  // Table Information State (Table-only identification)
  const [selectedTableId, setSelectedTableId] = useState<string>('t1');
  const [orderNote, setOrderNote] = useState<string>('');
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('Draft');

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);

  // Derived OrderDraft object (Subtotal = Total, No Tax, No Service Charge)
  const orderDraft: OrderDraft = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
    const tax = 0;
    const serviceCharge = 0;
    const total = subtotal;
    const table = TABLES_DATA.find((t) => t.id === selectedTableId);

    return {
      tableId: selectedTableId,
      tableName: table?.name || `Table ${selectedTableId}`,
      note: orderNote,
      status: orderStatus,
      items: cart,
      subtotal,
      tax,
      serviceCharge,
      total,
    };
  }, [cart, selectedTableId, orderNote, orderStatus]);

  // Combine local search bar with global search query if provided
  const activeSearch = (localSearch || externalSearch).trim().toLowerCase();

  // Category Tabs Configuration
  const categoryTabs = useMemo(() => {
    return [
      { id: 'all', label: 'All Items', count: products.length },
      {
        id: 'popular',
        label: 'Popular',
        count: products.filter((p) => p.popular).length,
      },
      {
        id: 'noodles',
        label: 'Noodles',
        count: products.filter((p) => p.category === 'Noodles').length,
      },
      {
        id: 'mains-sushi',
        label: 'Mains & Sushi',
        count: products.filter((p) => p.category === 'Mains & Sushi').length,
      },
      {
        id: 'appetizers',
        label: 'Appetizers',
        count: products.filter((p) => p.category === 'Appetizers').length,
      },
      {
        id: 'drinks',
        label: 'Drinks',
        count: products.filter((p) => p.category === 'Drinks').length,
      },
    ];
  }, [products]);

  // Derived Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // 1. Category Filter Matching
      let matchesCategory = true;
      if (selectedCategory === 'popular') {
        matchesCategory = Boolean(product.popular);
      } else if (selectedCategory === 'noodles') {
        matchesCategory = product.category === 'Noodles';
      } else if (selectedCategory === 'mains-sushi') {
        matchesCategory = product.category === 'Mains & Sushi';
      } else if (selectedCategory === 'appetizers') {
        matchesCategory = product.category === 'Appetizers';
      } else if (selectedCategory === 'drinks') {
        matchesCategory = product.category === 'Drinks';
      } else {
        matchesCategory = true;
      }

      // 2. Search Filter Matching (Name, Category, Description, Japanese Name)
      if (!activeSearch) {
        return matchesCategory;
      }

      const matchesSearch =
        product.name.toLowerCase().includes(activeSearch) ||
        product.category.toLowerCase().includes(activeSearch) ||
        product.description.toLowerCase().includes(activeSearch) ||
        (product.jpName && product.jpName.toLowerCase().includes(activeSearch));

      // 3. Combined Filter: Both must match
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, activeSearch]);

  // Cart Management Handlers
  const handleAddToCart = (product: Product) => {
    if (!product.available || product.stock === 0) {
      return;
    }

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.productId === product.id);

      if (existingIndex > -1) {
        // Increment quantity of existing cart item
        return prevCart.map((item, index) => {
          if (index === existingIndex) {
            const nextQuantity = item.quantity + 1;
            return {
              ...item,
              quantity: nextQuantity,
              lineTotal: item.price * nextQuantity,
            };
          }
          return item;
        });
      }

      // Add new cart item with quantity = 1
      const newItem: CartItem = {
        id: product.id,
        productId: product.id,
        name: product.name,
        price: product.price,
        unitPrice: product.price,
        quantity: 1,
        image: product.image,
        lineTotal: product.price,
      };

      return [...prevCart, newItem];
    });

    onSelectProduct?.(product);
  };

  const handleIncreaseQuantity = (productId: string) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.productId === productId) {
          const nextQuantity = item.quantity + 1;
          return {
            ...item,
            quantity: nextQuantity,
            lineTotal: item.price * nextQuantity,
          };
        }
        return item;
      })
    );
  };

  const handleDecreaseQuantity = (productId: string) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.productId === productId) {
          // If quantity reaches 1, keep quantity at 1
          if (item.quantity <= 1) {
            return item;
          }
          const nextQuantity = item.quantity - 1;
          return {
            ...item,
            quantity: nextQuantity,
            lineTotal: item.price * nextQuantity,
          };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.productId !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleClearSearch = () => {
    setLocalSearch('');
  };

  const handleResetAllFilters = () => {
    setLocalSearch('');
    setSelectedCategory('all');
  };

  return (
    <div id="pos-screen-root" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left / Main Product Selection Section */}
      <div className="lg:col-span-8 space-y-6">
        {/* Header & Overview */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                POS Order Terminal
              </h2>
              <span className="bg-orange-50 text-orange-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-orange-200/50 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>LIVE CATALOG</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 font-semibold tracking-wide mt-0.5">
              Browse products, filter by category, and search dishes for customer orders.
            </p>
          </div>

          {/* Total Products Counter Pill */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-xs text-xs font-bold text-slate-600">
            <Utensils className="w-3.5 h-3.5 text-orange-500" />
            <span>
              Showing <strong className="text-slate-900">{filteredProducts.length}</strong> of{' '}
              {products.length} items
            </span>
          </div>
        </div>

        {/* Controls Row: Category Tabs & Search Bar */}
        <div className="flex flex-col xl:flex-row gap-3 items-start xl:items-center justify-between border-b border-slate-100 pb-3">
          {/* Horizontal Category Tabs */}
          <Tabs
            tabs={categoryTabs}
            activeTab={selectedCategory}
            onChange={setSelectedCategory}
            variant="orange"
            className="w-full xl:w-auto"
          />

          {/* Real-Time Search Bar with Clear Button */}
          <div className="w-full xl:w-72 flex items-center gap-2">
            <div className="flex-1">
              <SearchBar
                value={localSearch}
                onChange={setLocalSearch}
                placeholder="Search by name, category, or ingredients..."
                size="sm"
                className="bg-white"
              />
            </div>

            {localSearch && (
              <Button
                variant="secondary"
                size="xs"
                onClick={handleClearSearch}
                icon={<X className="w-3.5 h-3.5" />}
                title="Clear search"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Active Filter Tags Indicator */}
        {(selectedCategory !== 'all' || localSearch) && (
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Active Filters:
            </span>
            {selectedCategory !== 'all' && (
              <span className="bg-orange-50 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-orange-200/60 flex items-center gap-1">
                Category: {categoryTabs.find((t) => t.id === selectedCategory)?.label}
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className="hover:text-orange-900 cursor-pointer"
                >
                  ×
                </button>
              </span>
            )}
            {localSearch && (
              <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                Search: "{localSearch}"
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="hover:text-slate-900 cursor-pointer"
                >
                  ×
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleResetAllFilters}
              className="text-[10px] text-slate-400 hover:text-slate-600 font-bold underline cursor-pointer ml-1"
            >
              Reset All
            </button>
          </div>
        )}

        {/* Responsive Product Grid / Empty State */}
        <ProductGrid
          products={filteredProducts}
          onAddToCart={handleAddToCart}
          onSelectProduct={handleAddToCart}
          onClearFilters={handleResetAllFilters}
        />
      </div>

      {/* Right / Sticky Ticket Panel Section */}
      <div className="lg:col-span-4 sticky top-24">
        <TicketPanel
          cart={cart}
          tables={TABLES_DATA}
          selectedTableId={selectedTableId}
          orderNote={orderNote}
          orderStatus={orderStatus}
          onTableChange={setSelectedTableId}
          onOrderNoteChange={setOrderNote}
          onIncreaseQuantity={handleIncreaseQuantity}
          onDecreaseQuantity={handleDecreaseQuantity}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
          onProceedOrder={() => setIsPaymentModalOpen(true)}
        />
      </div>

      {/* POS Payment Modal Dialog */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        orderDraft={orderDraft}
        onPaymentSuccess={(confirmation) => {
          onPaymentComplete?.(confirmation);
        }}
        onResetOrder={() => {
          setCart([]);
          setOrderNote('');
          setOrderStatus('Draft');
        }}
      />
    </div>
  );
}
