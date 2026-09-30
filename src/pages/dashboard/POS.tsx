/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Utensils, X } from 'lucide-react';
import { Product, CartItem, OrderStatus, OrderDraft, PaymentConfirmation, Order, Table, Category } from '../../types';
import { TABLES_DATA } from '../../data/mockData';
import { Tabs, SearchBar, Button } from '../../components/ui';
import { ProductGrid, TicketPanel, PaymentModal } from '../../components/pos';

export interface POSProps {
  products?: Product[];
  categories?: Category[];
  tables?: Table[];
  searchQuery?: string;
  orders?: Order[];
  onSelectProduct?: (product: Product) => void;
  onOrderChange?: (draft: OrderDraft) => void;
  onPaymentComplete?: (confirmation: PaymentConfirmation) => void;
  onOrderCreate?: (order: Order, paymentInfo?: PaymentConfirmation) => void;
}

export default function POS({
  products = [],
  categories = [],
  tables = TABLES_DATA,
  searchQuery: externalSearch = '',
  orders = [],
  onSelectProduct,
  onOrderChange,
  onPaymentComplete,
  onOrderCreate,
}: POSProps) {
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [localSearch, setLocalSearch] = useState<string>('');
  
  // Single Source of Truth for POS Ticket Cart State
  const [cart, setCart] = useState<CartItem[]>([]);

  // Table Information State & Active Loaded Order Tracking
  const [selectedTableId, setSelectedTableId] = useState<string>('t1');
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [existingOrderNumber, setExistingOrderNumber] = useState<string | null>(null);
  const [orderSource, setOrderSource] = useState<string>('POS');
  const [orderPaymentStatus, setOrderPaymentStatus] = useState<string>('UNPAID');
  const [orderNote, setOrderNote] = useState<string>('');
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('Draft');

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);

  // Helper to find an active unpaid order for a table
  const findActiveOrderForTable = (tableId: string) => {
    const tableObj = tables.find((t) => t.id === tableId);
    return orders.find(
      (o) =>
        (o.tableId === tableId || (tableObj && o.table === tableObj.name)) &&
        (o.paymentStatus === 'UNPAID' || o.paymentStatus === 'Unpaid' || o.paymentStatus === 'Pending') &&
        o.status !== 'Cancelled'
    );
  };

  // Helper to load an existing order into POS cart and ticket
  const loadOrder = (order: Order) => {
    const loadedItems: CartItem[] = order.items.map((item) => {
      const prod = products.find((p) => p.name === item.name || p.id === item.id);
      return {
        id: item.id,
        productId: prod?.id || item.id,
        name: item.name,
        price: item.unitPrice,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        image: prod?.image || '',
        lineTotal: item.lineTotal,
      };
    });
    setCart(loadedItems);
    setActiveOrderId(order.id);
    setExistingOrderNumber(order.orderNumber);
    setOrderSource(order.source || 'QR');
    setOrderStatus(order.status);
    setOrderPaymentStatus(order.paymentStatus);
    setOrderNote(order.note || '');
  };

  const clearOrder = () => {
    setCart([]);
    setActiveOrderId(null);
    setExistingOrderNumber(null);
    setOrderSource('POS');
    setOrderStatus('Draft');
    setOrderPaymentStatus('UNPAID');
    setOrderNote('');
  };

  // Handle table selection change
  const handleTableChange = (newTableId: string) => {
    setSelectedTableId(newTableId);
    if (!newTableId) {
      clearOrder();
      return;
    }
    const activeOrder = findActiveOrderForTable(newTableId);
    if (activeOrder) {
      loadOrder(activeOrder);
    } else {
      clearOrder();
    }
  };

  // Handle URL query parameters (e.g. /pos?orderId=ord-123 or /pos?table=Table%2001)
  const urlOrderId = searchParams.get('orderId');
  const urlTable = searchParams.get('table');
  const urlTableId = searchParams.get('tableId');

  useEffect(() => {
    if (urlOrderId) {
      const targetOrder = orders.find(
        (o) => o.id === urlOrderId || o.orderNumber === urlOrderId
      );
      if (targetOrder) {
        const tableObj = tables.find(
          (t) => t.id === targetOrder.tableId || t.name === targetOrder.table
        );
        if (tableObj) {
          setSelectedTableId(tableObj.id);
        }
        loadOrder(targetOrder);
        return;
      }
    }
    
    if (urlTableId || urlTable) {
      const tableObj = tables.find(
        (t) => t.id === urlTableId || t.name === urlTable
      );
      if (tableObj) {
        setSelectedTableId(tableObj.id);
        const activeOrder = findActiveOrderForTable(tableObj.id);
        if (activeOrder) {
          loadOrder(activeOrder);
        } else {
          clearOrder();
        }
        return;
      }
    }

    // Default mount check: If initial table has an active order, load it
    if (selectedTableId) {
      const activeOrder = findActiveOrderForTable(selectedTableId);
      if (activeOrder) {
        loadOrder(activeOrder);
      }
    }
  }, [urlOrderId, urlTable, urlTableId, orders, tables]);

  // Compute next order number for new orders
  const nextOrderNumber = useMemo(() => {
    const highestNum = orders.reduce((max, o) => {
      const num = parseInt(o.orderNumber.replace(/[^0-9]/g, ''), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 1026);
    return `#${highestNum + 1}`;
  }, [orders]);

  // Derived OrderDraft object
  const orderDraft: OrderDraft = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
    const tax = 0;
    const serviceCharge = 0;
    const total = subtotal;
    const table = tables.find((t) => t.id === selectedTableId);
    const finalOrderNum = existingOrderNumber || nextOrderNumber;

    return {
      orderNumber: finalOrderNum,
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
  }, [cart, selectedTableId, orderNote, orderStatus, existingOrderNumber, nextOrderNumber, tables]);

  // Combine local search bar with global search query if provided
  const activeSearch = (localSearch || externalSearch).trim().toLowerCase();

  // Category Tabs Configuration derived from Menu categories
  const categoryTabs = useMemo(() => {
    if (categories && categories.length > 0) {
      return [
        { id: 'all', label: 'All Items', count: products.length },
        ...categories
          .filter((c) => c.id !== 'all')
          .map((c) => ({
            id: c.id,
            label: c.label,
            count: products.filter((p) => {
              if (c.id === 'popular') {
                return Boolean(p.popular || p.category?.toLowerCase() === 'popular' || p.badge?.toUpperCase() === 'POPULAR');
              }
              return (
                p.category?.toLowerCase() === c.id.toLowerCase() ||
                p.category?.toLowerCase() === c.label.toLowerCase()
              );
            }).length,
          })),
      ];
    }
    const uniqueCats = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    return [
      { id: 'all', label: 'All Items', count: products.length },
      ...uniqueCats.map((cat) => ({
        id: String(cat).toLowerCase(),
        label: String(cat),
        count: products.filter((p) => p.category === cat).length,
      })),
    ];
  }, [categories, products]);

  // Derived Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // 1. Category Filter Matching
      let matchesCategory = true;
      if (selectedCategory === 'all') {
        matchesCategory = true;
      } else if (selectedCategory === 'popular') {
        matchesCategory = Boolean(product.popular || product.category?.toLowerCase() === 'popular' || product.badge?.toUpperCase() === 'POPULAR');
      } else {
        const catObj = categories.find((c) => c.id === selectedCategory);
        matchesCategory =
          product.category?.toLowerCase() === selectedCategory.toLowerCase() ||
          Boolean(catObj && product.category?.toLowerCase() === catObj.label.toLowerCase());
      }

      // 2. Search Filter Matching (Name, Category, Description, Japanese Name)
      if (!activeSearch) {
        return matchesCategory;
      }

      const matchesSearch =
        product.name.toLowerCase().includes(activeSearch) ||
        (product.category && product.category.toLowerCase().includes(activeSearch)) ||
        (product.description && product.description.toLowerCase().includes(activeSearch)) ||
        Boolean(product.jpName && product.jpName.toLowerCase().includes(activeSearch));

      // 3. Combined Filter: Both must match
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, activeSearch, categories]);

  // Cart Management Handlers
  const handleAddToCart = (product: Product) => {
    if (product.available === false || product.inStock === false || product.stock === 0) {
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
          tables={tables}
          selectedTableId={selectedTableId}
          orderNote={orderNote}
          orderStatus={orderStatus}
          orderNumber={existingOrderNumber || undefined}
          orderSource={orderSource}
          isExistingOrder={Boolean(activeOrderId)}
          paymentStatus={orderPaymentStatus}
          onTableChange={handleTableChange}
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
          const finalOrderNum =
            existingOrderNumber ||
            (confirmation.orderNumber && !confirmation.orderNumber.startsWith('#TEMP')
              ? confirmation.orderNumber
              : nextOrderNumber);

          // Align confirmation order reference
          confirmation.orderNumber = finalOrderNum;

          const now = new Date();
          const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          const newOrder: Order = {
            id: activeOrderId || `ord-${Date.now()}`,
            orderNumber: finalOrderNum,
            table: orderDraft.tableName || 'Table 01',
            tableId: selectedTableId,
            source: orderSource || 'POS',
            customer: orderDraft.customerName || orderDraft.tableName || 'Walk-in Customer',
            orderType: orderDraft.orderType || 'Dine In',
            items: orderDraft.items.map((item) => ({
              id: item.id || item.productId,
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice || item.price,
              lineTotal: item.lineTotal,
            })),
            total: orderDraft.total,
            paymentStatus: 'PAID',
            status: orderStatus === 'Draft' ? 'READY' : orderStatus,
            dateTime: `Today, ${timeStr}`,
            note: orderDraft.note || undefined,
          };

          onOrderCreate?.(newOrder, confirmation);
          onPaymentComplete?.(confirmation);
        }}
        onResetOrder={() => {
          clearOrder();
        }}
      />
    </div>
  );
}
