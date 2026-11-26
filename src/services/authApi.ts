/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================================
 * RestoControl Centralized Authentication API Client & Token Management
 * ============================================================================
 *
 * TOKEN STORAGE SECURITY NOTICE:
 * ----------------------------------------------------------------------------
 * This module stores the JWT in browser localStorage under 'restocontrol_jwt_token'.
 *
 * Security Considerations:
 * 1. Unlike HttpOnly cookies, tokens in localStorage are accessible to client-side
 *    JavaScript and are therefore vulnerable if an XSS (Cross-Site Scripting) flaw exists.
 * 2. To mitigate risks:
 *    - Strict Content Security Policy (CSP) and sanitization of user-generated content
 *      must be maintained across the application.
 *    - Tokens have a finite lifespan (configured on the backend, e.g., 8 hours).
 *    - Sensitive cryptographic credentials (passwordHash, pinHash) are never stored or logged.
 *    - Tokens are strictly attached via the 'Authorization: Bearer <token>' header.
 *    - Tokens are NEVER printed to browser console or telemetry logs.
 * ============================================================================
 */

import { apiClient } from './api/client';
import { isApiError } from './api/errors';

export const TOKEN_STORAGE_KEY = 'restocontrol_jwt_token';

export interface BackendRole {
  id: string;
  name: string;
  displayName: string;
}

export interface BackendRestaurant {
  id: string;
  name: string;
  slug: string;
}

export interface BackendSafeUser {
  id: string;
  restaurantId: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: BackendRole;
  restaurant: BackendRestaurant;
  permissions: string[];
}

export interface LoginApiResponse {
  success: boolean;
  data?: {
    token: string;
    user: BackendSafeUser;
  };
  error?: string;
  details?: unknown;
}

export interface MeApiResponse {
  success: boolean;
  data?: {
    user: BackendSafeUser;
  };
  error?: string;
  status?: number;
  isUnauthorized?: boolean;
}

export interface LogoutApiResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// In-memory fallback storage for non-browser / test environments
let inMemoryToken: string | null = null;

/**
 * Retrieve the active authentication token
 */
export function getToken(): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Fallback if localStorage access is restricted
  }
  return inMemoryToken;
}

/**
 * Store the active authentication token
 */
export function setToken(token: string): void {
  inMemoryToken = token;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
  } catch {
    // Fallback to in-memory if storage is blocked
  }
}

/**
 * Purge stored authentication token from storage
 */
export function clearToken(): void {
  inMemoryToken = null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage deletion errors
  }
}

/**
 * Generate authenticated HTTP headers attaching Bearer JWT
 */
export function getAuthHeaders(): HeadersInit {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Deduplicate concurrent logout calls to prevent duplicate POST /api/auth/logout requests
let inFlightLogout: Promise<LogoutApiResponse> | null = null;

/**
 * POST /api/auth/login
 * Authenticates user credentials with Express + PostgreSQL backend
 */
export async function apiLogin(credentials: {
  email: string;
  password: string;
}): Promise<LoginApiResponse> {
  try {
    const data = await apiClient.post<LoginApiResponse>(
      '/auth/login',
      {
        email: credentials.email.trim(),
        password: credentials.password,
      },
      { skipAuth: true }
    );

    if (!data || !data.success) {
      return {
        success: false,
        error: data?.error || 'Invalid email or password. Please try again.',
      };
    }

    if (data.data?.token) {
      setToken(data.data.token);
    }

    return data;
  } catch (err: unknown) {
    if (isApiError(err)) {
      if (err.isNetworkError || err.isTimeout || err.isAborted) {
        return {
          success: false,
          error: 'Cannot connect to authentication service. Please check your connection and try again.',
        };
      }
      return {
        success: false,
        error: err.message || 'Invalid email or password. Please try again.',
      };
    }

    return {
      success: false,
      error: 'Cannot connect to authentication service. Please check your connection and try again.',
    };
  }
}

/**
 * GET /api/auth/me
 * Restores user session, verifying JWT against PostgreSQL database state
 */
export async function apiGetMe(): Promise<MeApiResponse> {
  const token = getToken();
  if (!token) {
    return {
      success: false,
      error: 'No active session token.',
    };
  }

  try {
    const data = await apiClient.get<MeApiResponse>('/auth/me', {
      cache: 'no-store',
    });

    if (!data || !data.success) {
      return {
        success: false,
        error: data?.error || 'Session is invalid or has expired.',
        status: 200,
        isUnauthorized: false,
      };
    }

    return data;
  } catch (err: unknown) {
    if (isApiError(err)) {
      if (err.isNetworkError || err.isTimeout || err.isAborted) {
        return {
          success: false,
          error: 'Network error verifying session with server.',
          status: err.status,
          isUnauthorized: false,
        };
      }
      return {
        success: false,
        error: err.message || 'Session is invalid or has expired.',
        status: err.status,
        isUnauthorized: err.isUnauthorized,
      };
    }

    return {
      success: false,
      error: 'Network error verifying session with server.',
      status: 0,
      isUnauthorized: false,
    };
  }
}

/**
 * POST /api/auth/logout
 * Formal stateless logout terminating session on client
 */
export async function apiLogout(): Promise<LogoutApiResponse> {
  if (inFlightLogout) {
    return inFlightLogout;
  }

  inFlightLogout = (async () => {
    try {
      const token = getToken();
      if (token) {
        await apiClient.post<LogoutApiResponse>('/auth/logout', undefined, {
          clearTokenOn401: false,
        });
      }
    } catch {
      // Silent fail on network or 401 error: client MUST clear token anyway
    } finally {
      clearToken();
      inFlightLogout = null;
    }

    return {
      success: true,
      message: 'Logged out successfully.',
    };
  })();

  return inFlightLogout;
}
