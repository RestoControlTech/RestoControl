/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Check } from 'lucide-react';
import { CartItem, MenuItem } from '../../types';
import { formatPrice } from '../../utils/format';
import { Button } from '../ui';

export interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tableName: string;
  cart: Record<string, CartItem>;
  cartTotal: number;
  onAddToCart: (item: MenuItem) => void;
  onDecrementItem: (itemId: string) => void;
  onSubmitOrder: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  tableName,
  cart,
  cartTotal,
  onAddToCart,
  onDecrementItem,
  onSubmitOrder,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end justify-center">
      <div className="bg-white w-full max-w-[420px] rounded-t-2xl shadow-2xl p-4 max-h-[80vh] flex flex-col border-t border-stone-200 animate-slide-up">
        
        {/* Header drawer info */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <h3 className="font-extrabold text-stone-900 text-sm">Your Order</h3>
            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">{tableName} · Send to Kitchen</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 active:scale-95 cursor-pointer"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items checklist rows */}
        <div className="py-3 overflow-y-auto divide-y divide-stone-100 flex-1 space-y-1">
          {Object.keys(cart).length === 0 ? (
            <div className="py-12 text-center text-stone-400 flex flex-col items-center justify-center">
              <p className="text-xs font-bold text-stone-600">Your order is empty</p>
              <p className="text-[10px] text-stone-400 mt-1">Tap items on the menu to add them to your order</p>
            </div>
          ) : (
            Object.values(cart).map((cartItem) => {
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
                        type="button"
                        onClick={() => onDecrementItem(cartItem.id)}
                        className="w-6 h-6 rounded-md bg-white hover:bg-stone-200 text-stone-700 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                      >
                        −
                      </button>
                      <span className="px-1.5 min-w-[18px] text-center text-xs font-black text-stone-800">{cartItem.quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          onAddToCart({
                            id: cartItem.id,
                            name: cartItem.name,
                            image: cartItem.image,
                            price: cartItem.unitPrice,
                          } as MenuItem)
                        }
                        className="w-6 h-6 rounded-md bg-orange-600 hover:bg-orange-500 text-white flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-mono font-bold text-xs text-stone-900 w-14 text-right">{formatPrice(lineTotal)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom fire actions CTA */}
        <div className="pt-3 border-t border-stone-100 space-y-3 shrink-0">
          <div className="flex justify-between items-center text-xs font-black">
            <span className="text-stone-500 uppercase tracking-wider">Subtotal</span>
            <span className="text-stone-900 font-extrabold text-sm">{formatPrice(cartTotal)}</span>
          </div>

          <Button
            onClick={onSubmitOrder}
            variant="primary"
            size="lg"
            fullWidth
            disabled={Object.keys(cart).length === 0}
            iconRight={<Check className="w-4 h-4" />}
          >
            Send Order to Kitchen
          </Button>
        </div>

      </div>
    </div>
  );
};
