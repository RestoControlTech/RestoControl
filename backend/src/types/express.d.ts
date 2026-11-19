/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthenticatedUser } from './auth.types.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      restaurantId?: string;
    }
  }
}
