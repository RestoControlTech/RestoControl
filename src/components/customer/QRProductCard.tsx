/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MenuItem } from '../../types';
import { formatPrice } from '../../utils/format';
import { Button } from '../ui';

export interface QRProductCardProps {
  item: MenuItem;
  cartQuantity: number;
  onAddToCart: (item: MenuItem) => void;
  onDecrement: (itemId: string) => void;
}

export const QRProductCard: React.FC<QRProductCardProps> = ({
  item,
  cartQuantity,
  onAddToCart,
  onDecrement,
}) => {
  return (
    <article
      className="bg-white border border-stone-200/90 rounded-2xl p-2 flex flex-col justify-between hover:border-stone-300 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.03)] group"
    >
      {/* Food thumbnail image with absolute badge */}
      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-stone-100 mb-2">
        <img
          src={item.image}
          alt={item.name}
          loading="lazy"
          className={`w-full h-full object-cover transition-transform duration-300 ${
            item.inStock ? 'group-hover:scale-105' : 'opacity-40 grayscale'
          }`}
        />
        {item.badge && item.inStock && (
          <span className="absolute top-1.5 left-1.5 bg-stone-900/80 backdrop-blur-xs text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-md uppercase">
            {item.badge}
          </span>
        )}
        {!item.inStock && (
          <div className="absolute inset-0 bg-stone-900/40 flex items-center justify-center p-1">
            <span className="bg-red-600 text-white font-black text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded shadow-xs text-center leading-tight">
              Unavailable
            </span>
          </div>
        )}
        {cartQuantity > 0 && (
          <span className="absolute top-1.5 right-1.5 bg-orange-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md">
            {cartQuantity}
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
            {!item.inStock ? (
              <span className="text-[9px] font-bold text-stone-400 bg-stone-100 px-2 py-1 rounded-md border border-stone-200/80">
                Unavailable
              </span>
            ) : cartQuantity === 0 ? (
              <Button
                onClick={() => onAddToCart(item)}
                variant="primary"
                size="xs"
                className="h-7 px-2.5"
              >
                <span>+ Add</span>
              </Button>
            ) : (
              <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200/80">
                <button
                  type="button"
                  onClick={() => onDecrement(item.id)}
                  className="w-6 h-6 rounded-md bg-white hover:bg-stone-200 text-stone-700 flex items-center justify-center text-xs font-bold transition-colors shadow-xs active:scale-90 cursor-pointer"
                >
                  −
                </button>
                <span className="px-1.5 min-w-[18px] text-center text-[11px] font-black text-stone-800">{cartQuantity}</span>
                <button
                  type="button"
                  onClick={() => onAddToCart(item)}
                  className="w-6 h-6 rounded-md bg-orange-600 hover:bg-orange-500 text-white flex items-center justify-center text-xs font-bold transition-colors shadow-xs active:scale-90 cursor-pointer"
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
};
