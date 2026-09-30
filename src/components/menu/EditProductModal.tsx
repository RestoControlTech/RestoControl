/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MenuItem, Category } from '../../types';
import { Modal, Input, Select, Button } from '../ui';
import { ImagePicker } from './ImagePicker';

const DEFAULT_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&auto=format&fit=crop&q=80';

export interface EditProductModalProps {
  isOpen: boolean;
  item: MenuItem | null;
  onClose: () => void;
  onEdit: (item: MenuItem) => void;
  categories: Category[];
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  item,
  onClose,
  onEdit,
  categories,
}) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('popular');
  const [badge, setBadge] = useState('');
  const [description, setDescription] = useState('');
  const [stock, setStock] = useState('10');
  const [inStock, setInStock] = useState(true);
  const [isPopular, setIsPopular] = useState(false);
  const [image, setImage] = useState(DEFAULT_PRODUCT_IMAGE);
  const [imagePublicId, setImagePublicId] = useState<string | undefined>(undefined);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [formErrors, setFormErrors] = useState<{
    name?: string;
    category?: string;
    price?: string;
    stock?: string;
  }>({});

  useEffect(() => {
    if (item) {
      setName(item.name);
      setPrice(item.price.toString());
      setCategory(item.category);
      setBadge(item.badge || '');
      setDescription(item.description || '');
      setStock('10');
      setInStock(item.inStock);
      setIsPopular(Boolean(item.badge === 'POPULAR' || item.tag === 'Popular' || item.category === 'popular'));
      setImage(item.image);
      setImagePublicId(item.imagePublicId);
      setImageError(null);
      setIsUploadingImage(false);
      setFormErrors({});
    }
  }, [item]);

  const categorySelectOptions = categories
    .filter((c) => c.id !== 'all')
    .map((c) => ({
      value: c.id,
      label: c.label,
    }));

  const handleClose = () => {
    setImageError(null);
    setFormErrors({});
    onClose();
  };

  const validateForm = () => {
    const errors: { name?: string; category?: string; price?: string; stock?: string } = {};

    if (!name.trim()) {
      errors.name = 'Product name is required';
    }

    if (!category.trim()) {
      errors.category = 'Category is required';
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || price.trim() === '') {
      errors.price = 'Price is required';
    } else if (numPrice <= 0) {
      errors.price = 'Price must be greater than 0';
    }

    const numStock = parseInt(stock, 10);
    if (isNaN(numStock) && stock.trim() !== '') {
      errors.stock = 'Stock must be a valid number';
    } else if (!isNaN(numStock) && numStock < 0) {
      errors.stock = 'Stock cannot be negative';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !validateForm()) return;

    const numStock = parseInt(stock, 10);
    const finalInStock = inStock && (isNaN(numStock) || numStock > 0);

    const updatedItem: MenuItem = {
      ...item,
      category,
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      image: image.trim() || DEFAULT_PRODUCT_IMAGE,
      imagePublicId,
      badge: badge.trim() || (isPopular ? 'POPULAR' : null),
      tag: isPopular ? 'Popular' : undefined,
      inStock: finalInStock,
    };

    onEdit(updatedItem);
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen && Boolean(item)}
      onClose={handleClose}
      title={`Edit Menu Product (${item?.id})`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Row 1: Product Name */}
        <div>
          <Input
            label="Product Name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: undefined }));
            }}
            placeholder="e.g. Miso Soup"
            error={formErrors.name}
            required
          />
        </div>

        {/* Row 2: Category & Price */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              if (formErrors.category) setFormErrors((prev) => ({ ...prev, category: undefined }));
            }}
            error={formErrors.category}
            options={categorySelectOptions}
            required
          />
          <Input
            label="Price ($)"
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              if (formErrors.price) setFormErrors((prev) => ({ ...prev, price: undefined }));
            }}
            placeholder="e.g. 13.50"
            error={formErrors.price}
            required
          />
        </div>

        {/* Row 3: Stock Quantity & Device Image Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          <Input
            label="Stock Quantity"
            type="number"
            value={stock}
            onChange={(e) => {
              setStock(e.target.value);
              if (formErrors.stock) setFormErrors((prev) => ({ ...prev, stock: undefined }));
            }}
            placeholder="e.g. 10"
            error={formErrors.stock}
          />

          <ImagePicker
            image={image}
            imagePublicId={imagePublicId}
            onChange={(url, publicId) => {
              setImage(url);
              setImagePublicId(publicId);
            }}
            error={imageError}
            onErrorChange={setImageError}
            onUploadingChange={setIsUploadingImage}
          />
        </div>

        {/* Row 4: Ribbon Badge Tag & Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <Input
            label="Ribbon Badge Tag"
            type="text"
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            placeholder="e.g. POPULAR / SPICY / VEGAN / CHEF PICK"
          />
          <div className="flex items-center gap-4 py-2 px-3 bg-slate-50 border border-slate-100 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => setInStock(e.target.checked)}
                className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
              />
              <span>In Stock</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={isPopular}
                onChange={(e) => setIsPopular(e.target.checked)}
                className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
              />
              <span>Mark Popular</span>
            </label>
          </div>
        </div>

        {/* Row 5: Description */}
        <div className="space-y-1">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Rich pork broth, chashu slices, seasoned soft egg..."
            className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white h-20 resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-100">
          <Button type="button" variant="secondary" size="md" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary" 
            size="md"
            disabled={isUploadingImage}
          >
            {isUploadingImage ? 'Uploading Image...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
