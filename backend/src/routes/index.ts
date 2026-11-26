/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { authRouter } from './auth.routes.js';
import { salesRouter } from './sales.routes.js';

export const apiRouter = Router();

// Mount Health check endpoint (/api/health)
apiRouter.use('/health', healthRouter);

// Mount Authentication endpoints (/api/auth)
apiRouter.use('/auth', authRouter);

// Mount Sales History endpoints (/api/sales)
apiRouter.use('/sales', salesRouter);

