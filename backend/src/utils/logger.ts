/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const logger = {
  info: (message: string, ...meta: any[]) => {
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[INFO] [${new Date().toISOString()}] ${message}`, ...meta);
    }
  },
  warn: (message: string, ...meta: any[]) => {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, ...meta);
    }
  },
  error: (message: string, ...meta: any[]) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, ...meta);
    }
  },
  debug: (message: string, ...meta: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] [${new Date().toISOString()}] ${message}`, ...meta);
    }
  },
};

