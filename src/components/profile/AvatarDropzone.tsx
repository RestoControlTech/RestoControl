/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Camera, 
  UploadCloud, 
  X, 
  Check, 
  Loader2, 
  AlertCircle, 
  Trash2,
  Sparkles
} from 'lucide-react';
import { 
  uploadImageToCloudinary, 
  validateImageFile 
} from '../../services/cloudinary';

export interface AvatarDropzoneProps {
  avatar?: string;
  avatarPublicId?: string;
  name?: string;
  onChange: (url: string, publicId?: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  className?: string;
}

export const AvatarDropzone: React.FC<AvatarDropzoneProps> = ({
  avatar,
  avatarPublicId,
  name = 'User',
  onChange,
  onUploadingChange,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute initials for placeholder
  const getInitials = (str: string) => {
    const parts = str.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase() || 'U';
  };

  const setUploadingState = (uploading: boolean) => {
    setIsUploading(uploading);
    onUploadingChange?.(uploading);
  };

  const processFile = async (file: File) => {
    setError(null);
    setUploadSuccess(false);

    // 1. Client-Side Validation
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid image file. Please choose JPG, PNG, or WEBP under 5MB.');
      return;
    }

    // 2. Generate immediate local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // 3. Read data URL fallback for offline resilience
    const reader = new FileReader();
    const dataUrlPromise = new Promise<string>((resolve) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(objectUrl);
      reader.readAsDataURL(file);
    });

    try {
      setUploadingState(true);
      setUploadProgress(15);

      // Attempt Cloudinary upload
      const result = await uploadImageToCloudinary(file, {
        folder: 'restocontrol_avatars',
        onProgress: (percent) => setUploadProgress(Math.max(15, percent)),
      });

      onChange(result.secure_url, result.public_id);
      setPreviewUrl(null);
      setUploadProgress(100);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 2500);
    } catch (err: any) {
      console.warn('Cloudinary upload fallback to data URL:', err);
      // Fallback: save Base64 data URL locally so user never loses their uploaded picture!
      const dataUrl = await dataUrlPromise;
      onChange(dataUrl);
      setPreviewUrl(null);
      setUploadProgress(100);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 2500);
    } finally {
      setUploadingState(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
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

  const handleDragEnter = (e: React.DragEvent) => {
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
      processFile(file);
    }
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    onChange('', undefined);
    setError(null);
    setUploadSuccess(false);
  };

  const currentDisplayImage = previewUrl || avatar;

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Main Avatar Preview Container */}
      <div className="relative group">
        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden transition-all duration-300 cursor-pointer shadow-lg select-none ring-4 ${
            isDragging
              ? 'ring-orange-500 scale-105 shadow-orange-500/25 ring-offset-4'
              : 'ring-orange-100 hover:ring-orange-300 ring-offset-2'
          }`}
          title="Click or drag an image here to update your avatar"
        >
          {currentDisplayImage ? (
            <img
              src={currentDisplayImage}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => {
                // If image fails to load, fall back to null
                setPreviewUrl(null);
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-400 via-orange-500 to-amber-600 flex items-center justify-center text-white font-black text-2xl sm:text-3xl tracking-tight shadow-inner">
              {getInitials(name)}
            </div>
          )}

          {/* Hover Overlay with Camera Icon */}
          <div
            className={`absolute inset-0 bg-slate-950/50 backdrop-blur-xs flex flex-col items-center justify-center text-white transition-opacity duration-200 ${
              isDragging || isUploading
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-1.5 p-2 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
                <span className="text-[10px] font-black tracking-wide">
                  {uploadProgress}%
                </span>
              </div>
            ) : isDragging ? (
              <div className="flex flex-col items-center gap-1 text-center animate-bounce">
                <UploadCloud className="w-7 h-7 text-orange-400" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider">
                  Drop Pic!
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Camera className="w-6 h-6 text-white drop-shadow" />
                <span className="text-[10px] font-bold tracking-tight">
                  Change
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Success badge */}
        {uploadSuccess && (
          <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-full shadow-lg ring-2 ring-white animate-fade-in">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </span>
        )}

        {/* Quick Remove Button (when avatar is set and not uploading) */}
        {currentDisplayImage && !isUploading && (
          <button
            type="button"
            onClick={handleRemovePhoto}
            className="absolute top-0 right-0 bg-white/95 hover:bg-red-50 text-slate-400 hover:text-red-500 p-1.5 rounded-full shadow-md border border-slate-200 transition-colors cursor-pointer"
            title="Remove photo"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Progress Bar during upload */}
      {isUploading && (
        <div className="w-full max-w-xs space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
            <span>Uploading photo...</span>
            <span className="text-orange-600 font-black">{uploadProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Interactive Drop Box */}
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`w-full max-w-xs p-3.5 rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer ${
          isDragging
            ? 'border-orange-500 bg-orange-50/70 scale-[1.02] shadow-sm'
            : 'border-slate-200 hover:border-orange-300 bg-slate-50/60 hover:bg-orange-50/30'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <UploadCloud
            className={`w-4 h-4 transition-colors ${
              isDragging ? 'text-orange-600 animate-bounce' : 'text-slate-400'
            }`}
          />
          <span className="text-xs font-black text-slate-700">
            {isDragging ? 'Drop picture here' : 'Drop your picture here'}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 font-medium">
          or <span className="text-orange-600 font-bold hover:underline">browse files</span> from your computer
        </p>
        <p className="text-[9px] text-slate-400 mt-1">
          JPG, PNG, or WEBP (Max 5MB)
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl animate-fade-in max-w-xs">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[11px] leading-tight font-medium">{error}</span>
        </div>
      )}
    </div>
  );
};

export default AvatarDropzone;
