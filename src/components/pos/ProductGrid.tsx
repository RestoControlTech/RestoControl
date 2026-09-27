/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Product } from '../../types';
import { EmptyState } from '../ui';
import { ProductCard } from './ProductCard';

export interface ProductGridProps {
  products: Product[];
  onAddToCart?: (product: Product) => void;
  onSelectProduct?: (product: Product) => void;
  onClearFilters?: () => void;
  className?: string;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onAddToCart,
  onSelectProduct,
  onClearFilters,
  className = '',
}) => {
  if (products.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-3xl p-8 my-4 shadow-xs">
        <EmptyState
          title="No products found"
          description="Try another search or category."
          actionText={onClearFilters ? 'Clear Search' : undefined}
          onAction={onClearFilters}
        />
      </div>
    );
  }

  return (
    <div
      id="pos-product-grid"
      className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 ${className}`}
    >
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={onAddToCart || onSelectProduct}
          onSelect={onSelectProduct || onAddToCart}
        />
      ))}
    </div>
  );
};

export default ProductGrid;
