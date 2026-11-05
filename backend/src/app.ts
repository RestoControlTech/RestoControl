/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { requestLogger } from './middleware/logger.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiRouter } from './routes/index.js';

export function createApp(): Application {
  const app = express();

  // Security HTTP headers
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: [config.frontendUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role'],
    })
  );

  // Request logging
  app.use(requestLogger);

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Mount API Router under /api
  app.use('/api', apiRouter);

  // Top-level /health route alias for load balancers and orchestrators
  app.use('/health', (req, res, next) => {
    // Forward directly to health handler
    if (req.path === '/' || req.path === '') {
      import('./controllers/health.controller.js').then((m) => m.getHealth(req, res)).catch(next);
    } else {
      next();
    }
  });

  // 404 Handler for undefined routes
  app.use(notFoundHandler);

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
