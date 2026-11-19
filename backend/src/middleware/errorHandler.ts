/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // 1. Handle malformed JSON body from express.json()
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400 && 'body' in err) {
    res.status(400).json({
      success: false,
      error: 'Invalid JSON payload in request body.',
    });
    return;
  }

  // 2. Handle custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
      ...(config.isDevelopment ? { stack: err.stack } : {}),
    });
    return;
  }

  // 3. Handle raw Zod validation errors
  if (err instanceof ZodError) {
    const formattedDetails = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
    res.status(400).json({
      success: false,
      error: 'Validation error: invalid request payload',
      details: formattedDetails,
      ...(config.isDevelopment ? { stack: err.stack } : {}),
    });
    return;
  }

  // 4. Handle JWT token errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: 'Invalid authentication token signature',
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: 'Authentication token has expired',
    });
    return;
  }

  // 5. Handle Prisma client known request errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[]) || [];
        res.status(409).json({
          success: false,
          error: `Resource conflict: unique constraint violated on [${target.join(', ')}]`,
          code: 'P2002',
        });
        return;
      }
      case 'P2003': {
        res.status(400).json({
          success: false,
          error: 'Foreign key constraint violated: referenced entity does not exist',
          code: 'P2003',
        });
        return;
      }
      case 'P2025': {
        res.status(404).json({
          success: false,
          error: 'Record not found or operation aborted by constraint',
          code: 'P2025',
        });
        return;
      }
      default:
        res.status(400).json({
          success: false,
          error: `Database error: ${err.message}`,
          code: err.code,
        });
        return;
    }
  }

  // 6. Handle PostgreSQL specific error codes (from stored procedures or direct queries)
  if (err.code) {
    switch (err.code) {
      case '23505': // unique_violation
        res.status(409).json({
          success: false,
          error: 'A record with this identifier already exists',
          code: '23505',
        });
        return;
      case '23503': // foreign_key_violation
        res.status(400).json({
          success: false,
          error: 'Invalid reference: related entity not found',
          code: '23503',
        });
        return;
      case '23514': // check_violation
        res.status(400).json({
          success: false,
          error: err.message || 'Operation violates business constraint rule',
          code: '23514',
        });
        return;
      case '42501': // insufficient_privilege
        res.status(403).json({
          success: false,
          error: 'Access denied: insufficient database privileges',
          code: '42501',
        });
        return;
    }
  }

  // 7. General Internal Server Error
  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`[${req.method} ${req.originalUrl}] ${statusCode} - ${message}`, {
    stack: config.isDevelopment ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 && config.isProduction ? 'Internal Server Error' : message,
    ...(config.isDevelopment ? { stack: err.stack } : {}),
  });
};
