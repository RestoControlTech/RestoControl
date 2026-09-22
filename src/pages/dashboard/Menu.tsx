/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Plus, Edit3, Trash2, Search, SlidersHorizontal } from 'lucide-react';
import { MenuItem } from '../../types';
import { formatPrice } from '../../utils/format';

interface MenuProps {
  menuItems: MenuItem[];
  onToggleStock: (itemId: string) => void;
  onAddItem: (item: MenuItem) => void;
  onDeleteItem: (itemId: string) => void;
  searchQuery: string;
}

export default function Menu({ menuItems, onToggleStock, onAddItem, onDeleteItem, searchQuery }: MenuProps) {
  const [activeTab, setActiveTab] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  
  // New Item State Form fields
  const [name, setName] = useState('');
  const [jpName, setJpName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('popular');
  const [badge, setBadge] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&auto=format&fit=crop&q=80');

  const categoriesTab = [
    { id: 'all', label: 'All Items', count: menuItems.length },
    { id: 'popular', label: 'Popular', count: menuItems.filter(i => i.category === 'popular').length },
    { id: 'ramen', label: 'Ramen & Noodles', count: menuItems.filter(i => i.category === 'ramen').length },
    { id: 'sushi', label: 'Sushi & Mains', count: menuItems.filter(i => i.category === 'sushi').length },
    { id: 'appetizers', label: 'Appetizers', count: menuItems.filter(i => i.category === 'appetizers').length },
    { id: 'drinks', label: 'Beverages', count: menuItems.filter(i => i.category === 'drinks').length },
  ];

  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;
    
    const code = Math.floor(100 + Math.random() * 900);
    const newItem: MenuItem = {
      id: `food-${Date.now()}`,
      category,
      name,
      jpName: jpName || undefined,
      description,
      price: parseFloat(price),
      image,
      badge: badge || null,
      inStock: true
    };

    onAddItem(newItem);
    setShowAddModal(false);
    
    // Reset Form
    setName('');
    setJpName('');
    setPrice('');
    setDescription('');
    setBadge('');
  };

  const filteredItems = menuItems.filter(item => {
    // Top bar search + sub-input search
    const overallQuery = searchQuery.toLowerCase().trim();
    const subQuery = filterQuery.toLowerCase().trim();
    const query = subQuery || overallQuery;

    const matchesQuery = 
      item.name.toLowerCase().includes(query) ||
      (item.jpName && item.jpName.toLowerCase().includes(query)) ||
      item.description.toLowerCase().includes(query) ||
      (item.tag && item.tag.toLowerCase().includes(query)) ||
      (item.badge && item.badge.toLowerCase().includes(query));

    const matchesCategory = activeTab === 'all' || item.category === activeTab;

    return matchesQuery && matchesCategory;
  });

  return (
    <div id="menu-screen-root" className="space-y-6">
      
      {/* Header and Add action button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Menu Management</h2>
          <p className="text-xs text-slate-400 font-semibold tracking-wide mt-0.5">Toggle stock levels, adjust item prices, and organize dishes.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Menu Item</span>
        </button>
      </div>

      {/* Row containing horizontal categories and custom code filter */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between border-b border-slate-100 pb-3">
        
        {/* Nav tabs selection pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 shrink-0 w-full md:w-auto">
          {categoriesTab.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${isActive ? 'bg-orange-700 text-orange-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>{tab.count}</span>
              </button>
            );
          })}
        </div>

        {/* Local Filter search container input */}
        <div className="relative flex items-center w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
          <input
            type="text"
            placeholder="Filter dish or code (#R01)..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full bg-white border border-slate-100 py-1.5 pl-9 pr-4 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/15"
          />
        </div>

      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => (
          <div
            key={item.id}
            className="bg-white border border-slate-100 rounded-2xl p-3 flex gap-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.015)] group hover:border-slate-200 transition-all"
          >
            {/* Left Image box with absolute design codes */}
            <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-50 shrink-0">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <span className="absolute bottom-1 right-1 bg-stone-900/70 text-white font-extrabold text-[8px] px-1 py-0.5 rounded">
                #{item.id.replace('food-', 'D')}
              </span>
            </div>

            {/* Right Food Details content layout */}
            <div className="flex-1 flex flex-col justify-between min-w-0">
              
              <div>
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0">
                    {/* Badge uppercase label */}
                    {item.badge && (
                      <span className="inline-block text-[8px] font-black tracking-wider text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded mb-1 leading-none uppercase">
                        {item.badge}
                      </span>
                    )}
                    <h3 className="font-extrabold text-slate-800 text-xs truncate leading-snug">{item.name}</h3>
                    {item.jpName && (
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{item.jpName}</p>
                    )}
                  </div>
                  {/* Dynamic price format */}
                  <span className="font-extrabold text-slate-900 text-xs shrink-0">{formatPrice(item.price)}</span>
                </div>
                <p className="text-[10px] text-slate-500 line-clamp-1 mt-1 leading-relaxed">{item.description}</p>
              </div>

              {/* Status stock and action toolbar */}
              <div className="flex items-center justify-between border-t border-slate-50 pt-2 mt-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${item.inStock ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                  <span className="text-[10px] font-bold text-slate-400">{item.inStock ? 'In Stock' : 'Out of Stock'}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Switch stock level button */}
                  <button
                    onClick={() => onToggleStock(item.id)}
                    className={`text-[9px] font-black px-2.5 py-1 rounded-lg transition-colors border ${
                      item.inStock
                        ? 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-100'
                        : 'bg-orange-50 hover:bg-orange-100 text-orange-600 border-orange-100'
                    }`}
                  >
                    Toggle Stock
                  </button>
                  {/* Delete button */}
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors active:scale-90"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>

          </div>
        ))}
      </div>

      {/* Add New Item Dialog Modal Frame */}
      {showAddModal && (
        <div id="add-item-modal" className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-stone-200/60 p-6 w-full max-w-md shadow-2xl relative">
            
            <h3 className="font-extrabold text-slate-900 text-sm mb-4">Add New Menu Item</h3>
            
            <form onSubmit={handleAddItemSubmit} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Item Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tonkotsu Ramen"
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Japanese Name</label>
                  <input
                    type="text"
                    value={jpName}
                    onChange={(e) => setJpName(e.target.value)}
                    placeholder="豚骨ラーメン"
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="13.50"
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white"
                  >
                    <option value="popular">Popular</option>
                    <option value="ramen">Ramen</option>
                    <option value="sushi">Sushi & Rolls</option>
                    <option value="appetizers">Appetizers</option>
                    <option value="drinks">Drinks</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Ribbon Badge Tag</label>
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="POPULAR / SPICY / VEGAN"
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Rich pork broth, chashu slices, seasoned soft egg..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white h-20 resize-none"
                />
              </div>

              <div className="flex gap-2.5 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 transition-colors active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-xl text-xs font-bold text-white transition-colors active:scale-95 shadow-md"
                >
                  Add Item
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
