/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Image as ImageIcon, 
  X, 
  AlertCircle, 
  RefreshCw, 
  CheckCircle2, 
  Link as LinkIcon,
  Loader2
} from 'lucide-react';
import { 
  uploadImageToCloudinary, 
  validateImageFile,
  getOptimizedCloudinaryUrl 
} from '../../services/cloudinary';

export interface ImagePickerProps {
  image: string;
  imagePublicId?: string;
  onChange: (url: string, publicId?: string) => void;
  error?: string | null;
  onErrorChange?: (error: string | null) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  label?: string;
  placeholder?: string;
}

export const ImagePicker: React.FC<ImagePickerProps> = ({
  image,
  imagePublicId,
  onChange,
  error,
  onErrorChange,
  onUploadingChange,
  label = 'Product Image',
  placeholder = 'https://res.cloudinary.com/example/image/upload/...',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [lastSelectedFile, setLastSelectedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const setUploadingState = (uploading: boolean) => {
    setIsUploading(uploading);
    onUploadingChange?.(uploading);
  };

  const handleFileProcess = async (file: File) => {
    setLastSelectedFile(file);
    onErrorChange?.(null);
    setLoadError(false);

    // 1. Client-Side Validation
    const validation = validateImageFile(file);
    if (!validation.valid) {
      onErrorChange?.(validation.error || 'Invalid image file.');
      return;
    }

    // 2. Upload to Cloudinary
    try {
      setUploadingState(true);
      setUploadProgress(0);

      const result = await uploadImageToCloudinary(file, {
        onProgress: (percent) => setUploadProgress(percent),
      });

      onChange(result.secure_url, result.public_id);
      onErrorChange?.(null);
      setUploadProgress(100);
    } catch (err: any) {
      const message =
        err?.message ||
        'Failed to upload image to Cloudinary. Please check your connection and try again.';
      onErrorChange?.(message);
    } finally {
      setUploadingState(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
    // Reset file input so selecting the same file triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleRetry = () => {
    if (lastSelectedFile) {
      handleFileProcess(lastSelectedFile);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = () => {
    onChange('', undefined);
    setLoadError(false);
    onErrorChange?.(null);
    setLastSelectedFile(null);
    setUploadProgress(0);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    setLoadError(false);
    onErrorChange?.(null);
    onChange(val, undefined);
  };

  const isCloudinary = Boolean(image && image.includes('res.cloudinary.com'));
  const optimizedPreviewUrl = isCloudinary
    ? getOptimizedCloudinaryUrl(image, { width: 300, height: 300, crop: 'fill' })
    : image;

  return (
    <div className="space-y-2">
      {/* Header Label and Mode Switcher */}
      <div className="flex items-center justify-between">
        {label && (
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
            {label}
          </label>
        )}
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[10px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <LinkIcon className="w-3 h-3" />
          <span>{showUrlInput ? 'Upload File' : 'Paste Image URL'}</span>
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={isUploading}
      />

      {/* Manual URL Input Mode */}
      {showUrlInput && (
        <div className="relative mb-2">
          <input
            type="url"
            value={image}
            onChange={handleUrlChange}
            placeholder={placeholder}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all pr-8"
          />
          {image && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
              title="Clear Image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Main Upload / Preview Container */}
      {isUploading ? (
        /* Uploading State with Progress Indicator */
        <div className="border border-orange-200 bg-orange-50/60 rounded-2xl p-5 text-center transition-all animate-pulse">
          <div className="w-10 h-10 mx-auto rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-2 shadow-xs">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <p className="text-xs font-bold text-slate-800">Uploading image to Cloudinary...</p>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Please wait while the image is optimized.</p>

          <div className="w-full max-w-xs mx-auto mt-3 bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-orange-500 h-1.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.max(5, uploadProgress)}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-orange-600 block mt-1.5">{uploadProgress}%</span>
        </div>
      ) : image ? (
        /* Image Preview & Replace / Remove State */
        <div className="border border-slate-200 rounded-2xl p-3 bg-white shadow-xs">
          <div className="flex items-center gap-3">
            {/* Image Preview Box */}
            <div className="relative w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
              {loadError ? (
                <div className="text-center p-1">
                  <AlertCircle className="w-4 h-4 text-rose-500 mx-auto mb-0.5" />
                  <span className="text-[8px] font-bold text-rose-600 block leading-tight">Failed</span>
                </div>
              ) : (
                <img
                  src={optimizedPreviewUrl}
                  alt="Product preview"
                  onError={() => setLoadError(true)}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Details & Actions */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-slate-800 truncate">Product Image</p>
                {isCloudinary && (
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold px-1.5 py-0.2 rounded-full inline-flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                    <span>Cloudinary</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                {imagePublicId ? `ID: ${imagePublicId}` : image}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Replace</span>
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
                >
                  <X className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty Dropzone State: Click or Drag & Drop */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-orange-500 bg-orange-50/60 scale-[1.01]'
              : 'border-slate-200 hover:border-orange-400 bg-slate-50/60 hover:bg-white'
          }`}
        >
          <div className="w-9 h-9 mx-auto rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-1.5">
            <UploadCloud className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-slate-700">
            <span className="text-orange-600 hover:underline">Click to upload</span> or drag and drop
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
            JPG, PNG or WEBP (Max 5MB)
          </p>
        </div>
      )}

      {/* User-friendly Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-xl flex items-center justify-between text-xs font-semibold gap-2 animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="text-[10px] font-bold uppercase tracking-wider text-rose-800 hover:text-rose-950 underline shrink-0 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default ImagePicker;
