/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import QRCode from 'qrcode';
import { Table } from '../types';

/**
 * Returns the relative client route for a specific table's customer menu.
 * Example: getTableMenuPath('t1') => '/menu/t1'
 */
export function getTableMenuPath(tableId: string): string {
  const cleanId = encodeURIComponent(tableId.trim().toLowerCase());
  return `/menu/${cleanId}`;
}

/**
 * Returns the full URL for a table's QR code destination.
 * Uses window.location.origin in the browser, with fallback to 'https://restocontrol.menu'.
 */
export function getTableMenuUrl(tableId: string, customOrigin?: string): string {
  const path = getTableMenuPath(tableId);
  const base =
    customOrigin ||
    (typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://restocontrol.menu');
  return `${base.replace(/\/+$/, '')}${path}`;
}

/**
 * Generates a high-contrast, scannable QR Code as a PNG data URL.
 */
export async function generateTableQRCodeDataUrl(
  tableId: string,
  options?: QRCode.QRCodeToDataURLOptions,
  customOrigin?: string
): Promise<string> {
  const url = getTableMenuUrl(tableId, customOrigin);
  return QRCode.toDataURL(url, {
    width: options?.width || 360,
    margin: options?.margin ?? 2,
    color: {
      dark: options?.color?.dark || '#000000',
      light: options?.color?.light || '#FFFFFF',
    },
    errorCorrectionLevel: options?.errorCorrectionLevel || 'M',
    ...options,
  });
}

/**
 * Generates a clean download filename (e.g. 'table-01-qr.png').
 */
export function getTableQRFilename(table: Pick<Table, 'name' | 'id'>): string {
  const cleanName = table.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${cleanName || table.id}-qr.png`;
}

/**
 * Triggers a browser download of an image data URL.
 */
export function triggerFileDownload(dataUrl: string, filename: string): void {
  if (typeof document === 'undefined') return;
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
