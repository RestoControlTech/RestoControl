/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QueryParamValue } from './config';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiErrorCategory =
  | 'NETWORK'
  | 'TIMEOUT'
  | 'ABORTED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'SERVER'
  | 'UNEXPECTED_RESPONSE'
  | 'HTTP_ERROR';

export interface ApiBackendErrorEnvelope {
  success?: boolean;
  error?: string;
  message?: string;
  code?: string;
  details?: unknown;
}

export interface ApiRequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, QueryParamValue>;
  timeoutMs?: number;
  signal?: AbortSignal;
  /**
   * When true, omits Authorization header and disables automatic token purge on 401.
   * Useful for public/login endpoints.
   */
  skipAuth?: boolean;
  /**
   * Override whether a 401 response should clear stored JWT tokens.
   * Defaults to !skipAuth.
   */
  clearTokenOn401?: boolean;
}
