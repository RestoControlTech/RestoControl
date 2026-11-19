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
    expiresIn: (expiresIn || config.jwtExpiresIn) as any,
  };
  return jwt.sign(payload, config.jwtSecret, options);
}

export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    return decoded as TokenPayload;
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Authentication token has expired');
    }
    throw new UnauthorizedError('Invalid authentication token signature');
  }
}
