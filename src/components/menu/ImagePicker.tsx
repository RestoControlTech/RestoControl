/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { Upload, X } from 'lucide-react';

export interface ImagePickerProps {
  image: string;
  onChange: (dataUrl: string) => void;
  error?: string | null;
  onErrorChange?: (error: string | null) => void;
  label?: string;
}

export const ImagePicker: React.FC<ImagePickerProps> = ({
  image,
  onChange,
  error,
  onErrorChange,
  label = 'Product Image (Select from Device)',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onErrorChange?.(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onErrorChange?.('Invalid file type. Please select an image file (e.g. JPG, PNG, WEBP, GIF).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onChange(event.target.result as string);
        onErrorChange?.(null);
      }
    };
    reader.onerror = () => {
      onErrorChange?.('Failed to read selected image file. Please try another file.');
    };
    reader.readAsDataURL(file);
  };

  const handleTriggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleCancelImageSelection = () => {
    onChange('');
    onErrorChange?.(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-1">
      {label && (
        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
          {label}
        </label>
      )}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileChange}
        accept="image/*"
        className="hidden"
      />

      {image ? (
        <div className="relative border border-slate-200 rounded-xl p-2 bg-slate-50 flex items-center gap-2.5">
          <img
            src={image}
            alt="Product preview"
            className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-700 truncate">Image Selected</p>
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={handleTriggerFileSelect}
                className="text-[10px] font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <Upload className="w-3 h-3" />
                <span>Change</span>
              </button>
              <button
                type="button"
                onClick={handleCancelImageSelection}
                className="text-[10px] font-bold text-rose-500 hover:text-rose-600 hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <X className="w-3 h-3" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={handleTriggerFileSelect}
          className="border-2 border-dashed border-slate-200 hover:border-orange-400 bg-slate-50/80 hover:bg-orange-50/40 rounded-xl p-3 text-center cursor-pointer transition-colors"
        >
          <Upload className="w-5 h-5 text-slate-400 mx-auto mb-0.5" />
          <p className="text-xs font-bold text-slate-700">Select Image</p>
          <p className="text-[9px] text-slate-400 font-medium">PNG, JPG, WEBP</p>
        </div>
      )}

      {error && (
        <p className="text-[10px] font-bold text-rose-600 mt-0.5">{error}</p>
      )}
    </div>
  );
};
