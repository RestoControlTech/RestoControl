/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import http from 'node:http';
import { app } from './app.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';

const server = http.createServer(app);

// Handle server startup errors
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${config.port} is already in use. Please terminate the conflicting process or choose another port.`);
  } else {
    logger.error(`Server startup encountered an error:`, err);
  }
  process.exit(1);
});

// Start listening
server.listen(config.port, () => {
  logger.info(`=======================================================`);
  logger.info(`🚀 RestoControl Backend running independently`);
  logger.info(`📡 Port:        ${config.port}`);
  logger.info(`🌍 Environment: ${config.nodeEnv}`);
  logger.info(`🔗 Health API:  http://localhost:${config.port}/api/health`);
  logger.info(`🖥️ Frontend:    ${config.frontendUrl}`);
  logger.info(`=======================================================`);
});

// Graceful Shutdown Handlers
function handleGracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down HTTP server gracefully...`);

  server.close((err) => {
    if (err) {
      logger.error('Error occurred while closing server:', err);
      process.exit(1);
    }
    logger.info('HTTP server closed successfully. Goodbye!');
    process.exit(0);
  });

  // Force close after 10 seconds if hanging
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout waiting for active connections to close.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

export { server };

