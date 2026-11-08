/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import { PrismaClient } from '@prisma/client';
import { prisma, connectPrisma, disconnectPrisma } from '../src/config/prisma.js';

async function runPrismaTests() {
  console.log('--- Running Prisma ORM Configuration & Client Verification Tests ---');

  // Test 1: Verify Prisma Client connects to PostgreSQL
  {
    console.log('1. Testing Prisma Client connection ($connect) ...');
    await connectPrisma();
    console.log('✓ 1. Prisma Client connected successfully.');
  }

  // Test 2: Verify Prisma Client can execute safe read-only queries on PostgreSQL
  {
    console.log('2. Testing Prisma safe read-only queries on PostgreSQL ...');
    const result = await prisma.$queryRawUnsafe<Array<{
      ping: number;
      server_time: string;
      db_name: string;
      pg_version: string;
    }>>(`
      SELECT 
        1 as ping, 
        NOW()::text as server_time, 
        current_database() as db_name, 
        version() as pg_version;
    `);

    assert(Array.isArray(result), 'Expected array response from raw query');
    assert.strictEqual(result.length, 1, 'Expected 1 row returned');
    assert.strictEqual(Number(result[0].ping), 1, 'Expected ping to equal 1');
    assert.strictEqual(result[0].db_name, 'restocontrol_dev', 'Expected connected database to be "restocontrol_dev"');
    assert(Boolean(result[0].server_time), 'Expected non-empty server time string');
    assert(result[0].pg_version.toLowerCase().includes('postgresql'), 'Expected PostgreSQL in version string');

    console.log('✓ 2. Safe read-only queries executed successfully on PostgreSQL.');
    console.log(`     Database:    ${result[0].db_name}`);
    console.log(`     Server Time: ${result[0].server_time}`);
    console.log(`     Version:     ${result[0].pg_version.split(' on ')[0]}`);
  }

  // Test 3: Disconnect main Prisma Client cleanly
  {
    console.log('3. Testing Prisma Client graceful disconnect ($disconnect) ...');
    await disconnectPrisma();
    console.log('✓ 3. Prisma Client disconnected cleanly.');
  }

  // Test 4: Verify Prisma Client handles connection errors gracefully without unhandled rejections
  {
    console.log('4. Testing error handling on unreachable database host ...');
    const badPrisma = new PrismaClient({
      datasources: {
        db: {
          url: 'postgresql://postgres:wrong_password@127.0.0.1:5439/nonexistent_db',
        },
      },
      log: [],
    });

    let caughtError = false;
    try {
      await badPrisma.$connect();
      await badPrisma.$queryRawUnsafe('SELECT 1');
    } catch (err: any) {
      caughtError = true;
      assert(Boolean(err.message), 'Expected meaningful error message on connection failure');
    } finally {
      await badPrisma.$disconnect().catch(() => {});
    }

    assert.strictEqual(caughtError, true, 'Expected bad Prisma connection to throw a catchable error');
    console.log('✓ 4. Connection errors handled properly and caught gracefully without crashes.');
  }

  console.log('=======================================================');
  console.log('✔ ALL Prisma ORM Configuration Tests Passed Successfully!');
  console.log('=======================================================');
}

runPrismaTests().catch(async (err) => {
  console.error('❌ Prisma test failure:', err);
  await disconnectPrisma().catch(() => {});
  process.exit(1);
});
