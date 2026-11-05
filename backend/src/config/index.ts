/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from 'dotenv';
import path from 'node:path';

// Load environment variables from .env file
dotenv.config();

export interface ServerConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  frontendUrl: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
}

function parsePort(val: string | undefined, defaultPort = 4000): number {
  if (!val) return defaultPort;
  const parsed = parseInt(val, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid PORT configuration: "${val}". Must be an integer between 1 and 65535.`);
  }
  return parsed;
}

function parseNodeEnv(val: string | undefined): 'development' | 'production' | 'test' {
  const env = (val || 'development').toLowerCase().trim();
  if (env === 'production' || env === 'test' || env === 'development') {
    return env;
  }
  return 'development';
}

function parseFrontendUrl(val: string | undefined): string {
  const url = (val || 'http://localhost:3000').trim();
  // Basic sanity check
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error(`Invalid FRONTEND_URL: "${url}". Must start with http:// or https://`);
  }
  return url;
}

export const config: ServerConfig = {
  port: parsePort(process.env.PORT, 4000),
  nodeEnv: parseNodeEnv(process.env.NODE_ENV),
  frontendUrl: parseFrontendUrl(process.env.FRONTEND_URL),
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test',
  isTest: process.env.NODE_ENV === 'test',
};

