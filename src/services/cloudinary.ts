/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  original_filename?: string;
}

export interface CloudinaryUploadOptions {
  onProgress?: (percent: number) => void;
  folder?: string;
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

/**
 * Validates an image file before upload.
 * Enforces allowed formats (JPG, PNG, WEBP) and maximum file size (5MB).
 */
export function validateImageFile(file?: File | null): ImageValidationResult {
  if (!file) {
    return { valid: false, error: 'Please select an image file.' };
  }

  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  const mimeType = (file.type || '').toLowerCase();

  const isMimeValid = ALLOWED_IMAGE_MIME_TYPES.includes(mimeType);
  const isExtensionValid = ALLOWED_IMAGE_EXTENSIONS.includes(extension);

  if (!isMimeValid && !isExtensionValid) {
    return { valid: false, error: 'Image must be JPG, PNG, or WEBP.' };
  }

  if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
    return { valid: false, error: 'Image must be smaller than 5MB.' };
  }

  return { valid: true };
}

/**
 * Uploads an image file to Cloudinary using an unsigned upload preset.
 * Never requires or exposes Cloudinary API Secret.
 */
export async function uploadImageToCloudinary(
  file: File,
  options?: CloudinaryUploadOptions
): Promise<CloudinaryUploadResult> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid image file.');
  }

  // Retrieve configuration from Vite environment variables with fallback
  const cloudName = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'cc67bunh').trim();
  const uploadPreset = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'restocontrol_images').trim();

  if (!cloudName) {
    throw new Error('Cloudinary cloud name is not configured. Please check VITE_CLOUDINARY_CLOUD_NAME.');
  }
  if (!uploadPreset) {
    throw new Error('Cloudinary upload preset is not configured. Please check VITE_CLOUDINARY_UPLOAD_PRESET.');
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  if (options?.folder) {
    formData.append('folder', options.folder);
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track real upload progress percentage
    if (xhr.upload && options?.onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
          options.onProgress?.(percent);
        }
      };
    }

    xhr.onload = () => {
      let data: any;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        return reject(new Error('Failed to parse Cloudinary upload response.'));
      }

      if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
        resolve({
          secure_url: data.secure_url,
          public_id: data.public_id,
          width: data.width,
          height: data.height,
          format: data.format,
          original_filename: data.original_filename,
        });
      } else {
        const errorMessage =
          data?.error?.message ||
          `Cloudinary upload failed with HTTP status ${xhr.status}.`;
        reject(new Error(errorMessage));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during image upload. Please check your internet connection.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Image upload timed out. Please try again.'));
    };

    xhr.open('POST', endpoint, true);
    xhr.send(formData);
  });
}

/**
 * Optimizes a Cloudinary image URL for responsive delivery.
 * Injects automatic format (f_auto), automatic quality (q_auto), and optional sizing.
 */
export function getOptimizedCloudinaryUrl(
  url?: string | null,
  transformations: {
    width?: number;
    height?: number;
    crop?: 'fill' | 'scale' | 'fit' | 'thumb';
  } = {}
): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // Only transform Cloudinary URLs
  if (!url.includes('res.cloudinary.com')) {
    return url;
  }

  const uploadPattern = '/image/upload/';
  const uploadIndex = url.indexOf(uploadPattern);
  if (uploadIndex === -1) {
    return url;
  }

  const parts: string[] = ['f_auto', 'q_auto'];
  if (transformations.width) {
    parts.push(`w_${transformations.width}`);
  }
  if (transformations.height) {
    parts.push(`h_${transformations.height}`);
  }
  if (transformations.crop) {
    parts.push(`c_${transformations.crop}`);
  }

  const transformString = parts.join(',');
  const prefix = url.slice(0, uploadIndex + uploadPattern.length);
  const suffix = url.slice(uploadIndex + uploadPattern.length);

  // If already contains these transformations, return directly
  if (suffix.startsWith('f_auto') || suffix.startsWith('q_auto')) {
    return url;
  }

  return `${prefix}${transformString}/${suffix}`;
}

export const DEFAULT_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&auto=format&fit=crop&q=80';
