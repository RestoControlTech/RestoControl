/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import pg from 'pg';
import { verifyDatabaseConnection, closeDatabasePool } from '../src/config/database.js';

const { Pool } = pg;

async function runDbTests() {
  console.log('--- Running PostgreSQL Database Connection Verification Tests ---');

  // Test 1: Verify successful connection, SELECT NOW(), database name, and version
  {
    console.log('1. Testing active PostgreSQL connection and SELECT NOW() ...');
    const result = await verifyDatabaseConnection();

    assert.strictEqual(
      result.connected,
      true,
      `Expected database connection to succeed, but got error: ${result.error}`
    );
    assert(Boolean(result.timestamp), 'Expected a valid server timestamp');
    assert(Boolean(result.version), 'Expected PostgreSQL version string');
    assert(
      result.version?.toLowerCase().includes('postgresql'),
      `Expected version to mention PostgreSQL, got: ${result.version}`
    );
    assert.strictEqual(
      result.database,
      'restocontrol_dev',
      `Expected connected database to be "restocontrol_dev", got "${result.database}"`
    );

    console.log('✓ 1. Successfully connected to PostgreSQL.');
    console.log(`     Database:    ${result.database}`);
    console.log(`     Server Time: ${result.timestamp}`);
    console.log(`     Version:     ${result.version?.split(' on ')[0]}`);
  }

  // Test 2: Verify graceful error handling on unreachable database host/port
  {
    console.log('2. Testing graceful handling of invalid connection parameters ...');
    const badPool = new Pool({
      connectionString: 'postgresql://postgres:wrong_password@127.0.0.1:5439/nonexistent_db',
      connectionTimeoutMillis: 1500,
    });

    let caughtError = false;
    try {
      const client = await badPool.connect();
      client.release();
    } catch (err: any) {
      caughtError = true;
      assert(Boolean(err.message), 'Expected meaningful error message on connection failure');
    } finally {
      await badPool.end();
    }

    assert.strictEqual(caughtError, true, 'Expected invalid pool connection to fail gracefully');
    console.log('✓ 2. Invalid connection parameters handled gracefully without crashing.');
  }

  // Test 3: Close main database pool cleanly
  {
    console.log('3. Closing database connection pool ...');
    await closeDatabasePool();
    console.log('✓ 3. Connection pool closed cleanly.');
  }

  console.log('=======================================================');
  console.log('✔ ALL PostgreSQL Connection Tests Passed Successfully!');
  console.log('=======================================================');
}

runDbTests().catch((err) => {
  console.error('❌ PostgreSQL connection test failed:', err);
  process.exit(1);
});

