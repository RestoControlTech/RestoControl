/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/index.js';
import { TokenPayload } from '../types/auth.types.js';
import { UnauthorizedError } from './errors.js';

export function generateToken(payload: TokenPayload, expiresIn?: string): string {
  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: (expiresIn || config.jwtExpiresIn) as any,
  };
  return jwt.sign(payload, config.jwtSecret, options);
}

export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'],
    }) as any;

    if (
      !decoded ||
      typeof decoded !== 'object' ||
      typeof decoded.userId !== 'string' ||
      !decoded.userId.trim() ||
      typeof decoded.restaurantId !== 'string' ||
      !decoded.restaurantId.trim()
    ) {
      throw new UnauthorizedError('Invalid authentication token payload');
    }

    return {
      userId: decoded.userId,
      restaurantId: decoded.restaurantId,
    };
  } catch (err: any) {
    if (err instanceof UnauthorizedError) {
      throw err;
    }
    if (err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Authentication token has expired');
    }
    throw new UnauthorizedError('Invalid authentication token signature');
  }
}
