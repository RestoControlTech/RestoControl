/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import pg from 'pg';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getDatabasePool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
      max: 10,
    });

    pool.on('error', (err) => {
      logger.error('Unexpected idle client error in PostgreSQL pool:', err);
    });
  }
  return pool;
}

export interface DatabaseVerificationResult {
  connected: boolean;
  timestamp?: string;
  version?: string;
  database?: string;
  error?: string;
}

/**
 * Connects to PostgreSQL, executes SELECT NOW(), and returns verification results.
 */
export async function verifyDatabaseConnection(): Promise<DatabaseVerificationResult> {
  const currentPool = getDatabasePool();
  let client: pg.PoolClient | null = null;

  try {
    client = await currentPool.connect();

    // Query current database server time, version, and connected database name
    const result = await client.query<{
      server_time: string;
      server_version: string;
      current_db: string;
    }>(`
      SELECT 
        NOW()::text as server_time, 
        version() as server_version, 
        current_database() as current_db;
    `);

    const row = result.rows[0];
    const verification: DatabaseVerificationResult = {
      connected: true,
      timestamp: row.server_time,
      version: row.server_version,
      database: row.current_db,
    };

    logger.info(`PostgreSQL Connection Verified successfully.`);
    logger.info(`Database: ${verification.database}`);
    logger.info(`Server Time: ${verification.timestamp}`);
    logger.info(`Engine: ${verification.version?.split(' on ')[0]}`);

    return verification;
  } catch (err: any) {
    const errorMsg = err?.message || 'Unknown database connection error';
    logger.error(`PostgreSQL connection failed: ${errorMsg}`);
    return {
      connected: false,
      error: errorMsg,
    };
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Gracefully terminates the connection pool.
 */
export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('PostgreSQL connection pool closed.');
  }
}

