/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { healthRouter } from './health.routes.js';

export const apiRouter = Router();

// Mount Health check endpoint (/api/health)
apiRouter.use('/health', healthRouter);

