/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Centralized API Configuration
 *
 * Uses relative '/api' paths so Vite dev & preview proxies forward Express routes
 * (e.g. /api/auth/*) to the backend without hardcoding hostnames or ports,
 * while preserving existing legacy JSON API routes.
 */
export const API_BASE_URL = '/api';

export const DEFAULT_API_TIMEOUT_MS = 15_000;

export type QueryParamValue = string | number | boolean | null | undefined;

/**
 * Resolves a relative endpoint path against the centralized API base URL
 * and appends any defined query parameters.
 */
export function buildApiUrl(
  path: string,
  params?: Record<string, QueryParamValue>,
  baseUrl: string = API_BASE_URL
): string {
  let resolvedPath: string;

  if (/^https?:\/\//i.test(path)) {
    resolvedPath = path;
  } else {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    if (
      cleanBase &&
      (normalizedPath === cleanBase || normalizedPath.startsWith(`${cleanBase}/`))
    ) {
      resolvedPath = normalizedPath;
    } else {
      resolvedPath = `${cleanBase}${normalizedPath}`;
    }
  }

  if (!params) {
    return resolvedPath;
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  if (!queryString) {
    return resolvedPath;
  }

  const separator = resolvedPath.includes('?') ? '&' : '?';
  return `${resolvedPath}${separator}${queryString}`;
}
