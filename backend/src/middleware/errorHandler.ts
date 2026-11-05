/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export interface AppError extends Error {
  statusCode?: number;
  status?: number;
  type?: string;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Handle malformed JSON body errors from express.json()
  if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
    res.status(400).json({
      success: false,
      error: 'Invalid JSON payload in request body.',
    });
    return;
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`[${req.method} ${req.originalUrl}] ${statusCode} - ${message}`, {
    stack: config.isDevelopment ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(config.isDevelopment ? { stack: err.stack } : {}),
  });
};

