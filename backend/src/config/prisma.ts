/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PrismaClient } from '@prisma/client';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

// Global singleton declaration to avoid multiple client instances during dev hot-reloads
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.isDevelopment
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'stdout', level: 'info' },
          { emit: 'stdout', level: 'warn' },
          { emit: 'stdout', level: 'error' },
        ]
      : [
          { emit: 'stdout', level: 'warn' },
          { emit: 'stdout', level: 'error' },
        ],
  });

if (config.isDevelopment) {
  globalForPrisma.prisma = prisma;
}

/**
 * Connects Prisma Client to PostgreSQL and verifies the link.
 */
export async function connectPrisma(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Prisma Client connected to PostgreSQL database successfully.');
  } catch (err: any) {
    logger.error('Failed to connect Prisma Client to database:', err);
    throw err;
  }
}

/**
 * Disconnects Prisma Client gracefully.
 */
export async function disconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Prisma Client disconnected from PostgreSQL database.');
  } catch (err: any) {
    logger.error('Error disconnecting Prisma Client:', err);
  }
}

