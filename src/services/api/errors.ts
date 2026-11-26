/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiBackendErrorEnvelope, ApiErrorCategory } from './types';

export interface ApiErrorOptions {
  message: string;
  status: number;
  code: string;
  category: ApiErrorCategory;
  details?: unknown;
  isNetworkError?: boolean;
  isTimeout?: boolean;
  isAborted?: boolean;
}

const SENSITIVE_DETAIL_KEYS = new Set([
  'stack',
  'password',
  'passwordhash',
  'pinhash',
  'token',
  'jwt',
  'secret',
  'authorization',
  'cookie',
  'set-cookie',
]);

/**
 * Strips sensitive backend fields (stack traces, credentials, tokens) before
 * attaching error details to client-facing ApiError instances.
 */
export function sanitizeErrorDetails(details: unknown, depth = 0): unknown {
  if (details === null || details === undefined) {
    return undefined;
  }
  if (depth > 4) {
    return undefined;
  }
  if (typeof details === 'string' || typeof details === 'number' || typeof details === 'boolean') {
    return details;
  }
  if (Array.isArray(details)) {
    return details.map((item) => sanitizeErrorDetails(item, depth + 1));
  }
  if (typeof details === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(details as Record<string, unknown>)) {
      if (SENSITIVE_DETAIL_KEYS.has(key.toLowerCase())) {
        continue;
      }
      const cleanVal = sanitizeErrorDetails(value, depth + 1);
      if (cleanVal !== undefined) {
        sanitized[key] = cleanVal;
      }
    }
    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
  }
  return undefined;
}

/**
 * Maps an HTTP status code into a consistent error classification and safe fallback message.
 */
export function classifyHttpStatus(status: number): {
  category: ApiErrorCategory;
  code: string;
  fallbackMessage: string;
} {
  if (status === 401) {
    return {
      category: 'UNAUTHORIZED',
      code: 'UNAUTHORIZED',
      fallbackMessage: 'Authentication required or session expired.',
    };
  }
  if (status === 403) {
    return {
      category: 'FORBIDDEN',
      code: 'FORBIDDEN',
      fallbackMessage: 'You do not have permission to perform this action.',
    };
  }
  if (status === 404) {
    return {
      category: 'NOT_FOUND',
      code: 'NOT_FOUND',
      fallbackMessage: 'Requested resource was not found.',
    };
  }
  if (status === 409) {
    return {
      category: 'CONFLICT',
      code: 'CONFLICT',
      fallbackMessage: 'Request conflicted with existing data.',
    };
  }
  if (status === 400 || status === 422) {
    return {
      category: 'VALIDATION',
      code: 'VALIDATION_ERROR',
      fallbackMessage: 'Invalid request data. Please check your input.',
    };
  }
  if (status >= 500) {
    return {
      category: 'SERVER',
      code: 'SERVER_ERROR',
      fallbackMessage: 'A server error occurred. Please try again later.',
    };
  }
  return {
    category: 'HTTP_ERROR',
    code: `HTTP_${status}`,
    fallbackMessage: 'Request failed. Please try again.',
  };
}

/**
 * Centralized API Error class for consistent frontend error handling.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly category: ApiErrorCategory;
  public readonly details?: unknown;
  public readonly isNetworkError: boolean;
  public readonly isTimeout: boolean;
  public readonly isAborted: boolean;
  public readonly isUnauthorized: boolean;

  constructor(options: ApiErrorOptions) {
    super(options.message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.category = options.category;
    this.details = options.details;
    this.isNetworkError = Boolean(options.isNetworkError);
    this.isTimeout = Boolean(options.isTimeout);
    this.isAborted = Boolean(options.isAborted);
    this.isUnauthorized = options.status === 401 || options.category === 'UNAUTHORIZED';
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Builds a sanitized ApiError from a non-2xx HTTP response and optional parsed body.
 */
export function createApiErrorFromResponse(
  status: number,
  parsedBody?: unknown
): ApiError {
  const classification = classifyHttpStatus(status);

  if (parsedBody && typeof parsedBody === 'object') {
    const envelope = parsedBody as ApiBackendErrorEnvelope;
    const rawMsg =
      typeof envelope.error === 'string' && envelope.error.trim()
        ? envelope.error.trim()
        : typeof envelope.message === 'string' && envelope.message.trim()
        ? envelope.message.trim()
        : '';

    // Avoid leaking raw internal error strings on 5xx if a generic fallback is safer
    const safeMessage =
      status >= 500 && !rawMsg
        ? classification.fallbackMessage
        : rawMsg || classification.fallbackMessage;

    const code =
      typeof envelope.code === 'string' && envelope.code.trim()
        ? envelope.code.trim()
        : classification.code;

    return new ApiError({
      message: safeMessage,
      status,
      code,
      category: classification.category,
      details: sanitizeErrorDetails(envelope.details),
    });
  }

  return new ApiError({
    message: classification.fallbackMessage,
    status,
    code: classification.code,
    category: classification.category,
  });
}

/**
 * Normalizes thrown errors (network errors, timeouts, aborts, unexpected errors) into ApiError.
 */
export function normalizeRequestError(
  error: unknown,
  flags: { timedOut?: boolean; externalAborted?: boolean } = {}
): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (flags.timedOut) {
    return new ApiError({
      message: 'Request timed out. Please check your connection and try again.',
      status: 0,
      code: 'TIMEOUT',
      category: 'TIMEOUT',
      isTimeout: true,
    });
  }

  if (flags.externalAborted || (error instanceof Error && error.name === 'AbortError')) {
    return new ApiError({
      message: 'Request was cancelled.',
      status: 0,
      code: 'ABORTED',
      category: 'ABORTED',
      isAborted: true,
    });
  }

  return new ApiError({
    message: 'Network error. Unable to reach the server.',
    status: 0,
    code: 'NETWORK_ERROR',
    category: 'NETWORK',
    isNetworkError: true,
  });
}
