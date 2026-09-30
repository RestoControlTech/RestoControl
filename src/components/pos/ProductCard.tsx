/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Plus } from 'lucide-react';
import { Product } from '../../types';
import { formatPrice } from '../../utils/format';
import { Card, Badge, Button } from '../ui';
import { getOptimizedCloudinaryUrl, DEFAULT_PRODUCT_IMAGE } from '../../services/cloudinary';

export interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onSelect?: (product: Product) => void;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onSelect,
  className = '',
}) => {
  const isOutOfStock = !product.available || product.stock === 0;

  const handleAdd = () => {
    if (!isOutOfStock) {
      if (onAddToCart) {
        onAddToCart(product);
      } else if (onSelect) {
        onSelect(product);
      }
    }
  };

  const displayImage = getOptimizedCloudinaryUrl(product.image, { width: 340, height: 255, crop: 'fill' }) || DEFAULT_PRODUCT_IMAGE;

  return (
    <Card
      padding="sm"
      hoverEffect={!isOutOfStock}
      onClick={handleAdd}
      className={`flex flex-col justify-between group transition-all duration-200 ${
        isOutOfStock ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
    >
      <div>
        {/* Product Image Box with Badge Overlays */}
        <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-50 mb-2.5">
          <img
            src={displayImage}
            alt={product.name}
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {product.badge && (
            <span className="absolute top-2 left-2">
              <Badge variant="orange" size="xs">
                {product.badge}
              </Badge>
            </span>
          )}
          <span className="absolute bottom-1.5 right-1.5 bg-stone-900/75 text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded backdrop-blur-xs">
            {product.category}
          </span>
        </div>

        {/* Product Meta */}
        <div>
          <div className="flex items-start justify-between gap-1 mb-1">
            <h3 className="font-extrabold text-slate-800 text-xs leading-snug truncate">
              {product.name}
            </h3>
            <span className="font-black text-slate-900 text-xs shrink-0">
              {formatPrice(product.price)}
            </span>
          </div>

          {product.jpName && (
            <p className="text-[10px] text-slate-400 font-bold mb-1 leading-none">
              {product.jpName}
            </p>
          )}

          <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed mb-2">
            {product.description}
          </p>
        </div>
      </div>

      {/* Stock Footer & Action Button */}
      <div className="flex items-center justify-between border-t border-slate-50 pt-2 mt-auto">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isOutOfStock ? 'bg-red-500' : 'bg-emerald-500'
            }`}
          />
          <span className="text-[9px] font-bold text-slate-400">
            {isOutOfStock ? 'Out of Stock' : `${product.stock} left`}
          </span>
        </div>

        <Button
          variant={isOutOfStock ? 'secondary' : 'subtle-orange'}
          size="xs"
          disabled={isOutOfStock}
          onClick={(e) => {
            e.stopPropagation();
            handleAdd();
          }}
          icon={<Plus className="w-3 h-3" />}
        >
          Add
        </Button>
      </div>
    </Card>
  );
};

export default ProductCard;
