/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getToken, clearToken } from '../authApi';
import { buildApiUrl, DEFAULT_API_TIMEOUT_MS } from './config';
import {
  ApiError,
  createApiErrorFromResponse,
  normalizeRequestError,
} from './errors';
import { ApiRequestOptions, HttpMethod } from './types';

interface ParsedResponse {
  hasBody: boolean;
  isJson: boolean;
  data: unknown;
}

/**
 * Safely parses Fetch Response bodies across JSON, empty bodies, 204 No Content,
 * and non-JSON (e.g. HTML proxy/server error) responses.
 */
async function parseResponseBody(res: Response): Promise<ParsedResponse> {
  if (res.status === 204 || res.status === 205) {
    return { hasBody: false, isJson: false, data: undefined };
  }

  if (typeof res.text === 'function') {
    const rawText = await res.text();
    if (!rawText || rawText.trim() === '') {
      return { hasBody: false, isJson: false, data: undefined };
    }

    const contentType =
      typeof res.headers?.get === 'function'
        ? (res.headers.get('content-type') || '').toLowerCase()
        : '';

    const looksLikeJson =
      contentType.includes('application/json') ||
      contentType.includes('+json') ||
      contentType === '' ||
      rawText.trim().startsWith('{') ||
      rawText.trim().startsWith('[');

    if (!looksLikeJson) {
      return { hasBody: true, isJson: false, data: undefined };
    }

    try {
      const parsed = JSON.parse(rawText);
      return { hasBody: true, isJson: true, data: parsed };
    } catch {
      return { hasBody: true, isJson: false, data: undefined };
    }
  }

  // Fallback for minimal Response mocks that only implement .json()
  if (typeof res.json === 'function') {
    try {
      const parsed = await res.json();
      return { hasBody: parsed !== undefined, isJson: true, data: parsed };
    } catch {
      return { hasBody: true, isJson: false, data: undefined };
    }
  }

  return { hasBody: false, isJson: false, data: undefined };
}

function isPlainObjectOrRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !(value instanceof FormData) &&
    !(value instanceof Blob) &&
    !(value instanceof ArrayBuffer) &&
    !(value instanceof URLSearchParams)
  );
}

/**
 * Executes an HTTP request against the backend API using centralized configuration,
 * JWT Bearer token attachment, timeout management, and unified ApiError normalization.
 */
async function executeRequest<T = unknown>(
  method: HttpMethod,
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const url = buildApiUrl(path, options.params);
  const timeoutMs = options.timeoutMs ?? DEFAULT_API_TIMEOUT_MS;
  const skipAuth = Boolean(options.skipAuth);
  const clearTokenOn401 = options.clearTokenOn401 ?? !skipAuth;

  const headers: Record<string, string> = {
    ...(options.headers || {}),
  };

  let requestBody: BodyInit | undefined;
  if (options.body !== undefined) {
    if (isPlainObjectOrRecord(options.body) || Array.isArray(options.body)) {
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json';
      }
      requestBody = JSON.stringify(options.body);
    } else if (typeof options.body === 'string') {
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json';
      }
      requestBody = options.body;
    } else {
      requestBody = options.body as BodyInit;
    }
  } else if (method !== 'GET' && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Attach JWT Bearer token automatically when available and not skipped
  if (!skipAuth) {
    const token = getToken();
    if (token && !headers['Authorization'] && !headers['authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const controller = new AbortController();
  let timedOut = false;
  let externalAborted = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const onExternalAbort = () => {
    externalAborted = true;
    controller.abort(options.signal?.reason);
  };

  if (options.signal) {
    if (options.signal.aborted) {
      externalAborted = true;
      controller.abort(options.signal.reason);
    } else {
      options.signal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  if (timeoutMs > 0 && Number.isFinite(timeoutMs)) {
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: method === 'GET' || method === 'DELETE' ? (options.body !== undefined ? requestBody : undefined) : requestBody,
      signal: controller.signal,
      ...(options.cache ? { cache: options.cache } : {}),
    });

    const parsed = await parseResponseBody(response);

    if (!response.ok) {
      if (response.status === 401 && clearTokenOn401) {
        clearToken();
      }
      throw createApiErrorFromResponse(
        response.status,
        parsed.isJson ? parsed.data : undefined
      );
    }

    if (!parsed.hasBody) {
      return undefined as T;
    }

    if (!parsed.isJson) {
      throw new ApiError({
        message: 'Unexpected response format received from server.',
        status: response.status,
        code: 'INVALID_RESPONSE',
        category: 'UNEXPECTED_RESPONSE',
      });
    }

    return parsed.data as T;
  } catch (error) {
    throw normalizeRequestError(error, { timedOut, externalAborted });
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    if (options.signal) {
      options.signal.removeEventListener('abort', onExternalAbort);
    }
  }
}

export const apiClient = {
  request<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    return executeRequest<T>(options.method ?? 'GET', path, options);
  },

  get<T = unknown>(
    path: string,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
  ): Promise<T> {
    return executeRequest<T>('GET', path, options);
  },

  post<T = unknown>(
    path: string,
    body?: unknown,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
  ): Promise<T> {
    return executeRequest<T>('POST', path, { ...options, body });
  },

  put<T = unknown>(
    path: string,
    body?: unknown,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
  ): Promise<T> {
    return executeRequest<T>('PUT', path, { ...options, body });
  },

  patch<T = unknown>(
    path: string,
    body?: unknown,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
  ): Promise<T> {
    return executeRequest<T>('PATCH', path, { ...options, body });
  },

  delete<T = unknown>(
    path: string,
    options: Omit<ApiRequestOptions, 'method'> = {}
  ): Promise<T> {
    return executeRequest<T>('DELETE', path, options);
  },
};
