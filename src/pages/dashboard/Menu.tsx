/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { MenuItem } from '../../types';
import { formatPrice } from '../../utils/format';
import {
  Button,
  Input,
  Select,
  Modal,
  Badge,
  Tabs,
  SearchBar,
  Card,
  ConfirmDialog,
} from '../../components/ui';
import { PermissionGate } from '../../components/auth/PermissionGate';

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
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
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
        <PermissionGate permission="products.create">
          <Button
            onClick={() => setShowAddModal(true)}
            icon={<Plus className="w-4 h-4" />}
            variant="primary"
            size="md"
          >
            Add Menu Item
          </Button>
        </PermissionGate>
      </div>

      {/* Row containing horizontal categories and custom code filter */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between border-b border-slate-100 pb-3">
        
        {/* Nav tabs selection pills */}
        <Tabs
          tabs={categoriesTab}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="orange"
          className="w-full md:w-auto"
        />

        {/* Local Filter search container input */}
        <div className="w-full md:w-72">
          <SearchBar
            value={filterQuery}
            onChange={setFilterQuery}
            placeholder="Filter dish or code (#R01)..."
            size="sm"
            className="bg-white"
          />
        </div>

      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => (
          <Card
            key={item.id}
            padding="sm"
            hoverEffect
            className="flex gap-3.5"
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
                      <Badge variant="orange" size="xs" className="mb-1">
                        {item.badge}
                      </Badge>
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
                  <PermissionGate permission="products.update">
                    <Button
                      onClick={() => onToggleStock(item.id)}
                      variant={item.inStock ? 'secondary' : 'subtle-orange'}
                      size="xs"
                    >
                      Toggle Stock
                    </Button>
                  </PermissionGate>
                  {/* Delete button */}
                  <PermissionGate permission="products.delete">
                    <button
                      onClick={() => setItemToDelete(item.id)}
                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors active:scale-90 cursor-pointer"
                      title="Delete item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </PermissionGate>
                </div>
              </div>

            </div>

          </Card>
        ))}
      </div>

      {/* Add New Item Dialog Modal Frame */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Menu Item"
        maxWidth="md"
      >
        <form onSubmit={handleAddItemSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Item Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tonkotsu Ramen"
              required
            />
            <Input
              label="Japanese Name"
              type="text"
              value={jpName}
              onChange={(e) => setJpName(e.target.value)}
              placeholder="豚骨ラーメン"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Price ($)"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="13.50"
              required
            />
            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[
                { value: 'popular', label: 'Popular' },
                { value: 'ramen', label: 'Ramen' },
                { value: 'sushi', label: 'Sushi & Rolls' },
                { value: 'appetizers', label: 'Appetizers' },
                { value: 'drinks', label: 'Drinks' },
              ]}
            />
          </div>

          <Input
            label="Ribbon Badge Tag"
            type="text"
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            placeholder="POPULAR / SPICY / VEGAN"
          />

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
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
            >
              Add Item
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Item Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => {
          if (itemToDelete) {
            onDeleteItem(itemToDelete);
            setItemToDelete(null);
          }
        }}
        title="Delete Menu Item"
        message="Are you sure you want to delete this menu item? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

    </div>
  );
}
