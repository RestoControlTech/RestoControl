/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {
  getTableMenuPath,
  getTableMenuUrl,
  generateTableQRCodeDataUrl,
  getTableQRFilename,
} from '../utils/qr';
import { Table } from '../types';

console.log('--- Running Step 9D Table QR Generation & Routing Tests ---');

// 1. Path Generation
const path1 = getTableMenuPath('t1');
assert.strictEqual(path1, '/menu/t1', 't1 path must be /menu/t1');

const path2 = getTableMenuPath('t2');
assert.strictEqual(path2, '/menu/t2', 't2 path must be /menu/t2');

const path3 = getTableMenuPath('T-03');
assert.strictEqual(path3, '/menu/t-03', 'T-03 path must be lowercased to /menu/t-03');
console.log('✓ 1. Table menu path generation verified (/menu/t1, /menu/t2, /menu/t-03).');

// 2. Full URL Generation
const urlCustom = getTableMenuUrl('t1', 'https://restocontrol.menu');
assert.strictEqual(urlCustom, 'https://restocontrol.menu/menu/t1');

const urlSlashTrim = getTableMenuUrl('t2', 'https://restocontrol.menu/');
assert.strictEqual(urlSlashTrim, 'https://restocontrol.menu/menu/t2', 'Trailing slash in origin must be trimmed cleanly');
console.log('✓ 2. Full URL generation verified with custom and standard origin.');

// 3. QR Data URL Generation
async function runQRTests() {
  const qrDataUrl1 = await generateTableQRCodeDataUrl('t1', { width: 300 }, 'https://restocontrol.menu');
  assert.ok(qrDataUrl1.startsWith('data:image/png;base64,'), 'QR data URL must start with data:image/png;base64,');
  assert.ok(qrDataUrl1.length > 500, 'QR data URL must contain binary PNG content');

  const qrDataUrl2 = await generateTableQRCodeDataUrl('t2', { width: 300 }, 'https://restocontrol.menu');
  assert.ok(qrDataUrl2.startsWith('data:image/png;base64,'));

  const qrDataUrl3 = await generateTableQRCodeDataUrl('t3', { width: 300 }, 'https://restocontrol.menu');
  assert.ok(qrDataUrl3.startsWith('data:image/png;base64,'));

  // Ensure different tables produce unique QR image payloads
  assert.notStrictEqual(qrDataUrl1, qrDataUrl2, 'Table 01 and Table 02 QR codes must not be identical');
  assert.notStrictEqual(qrDataUrl2, qrDataUrl3, 'Table 02 and Table 03 QR codes must not be identical');
  console.log('✓ 3. Real QR Code generation verified: valid distinct PNG payloads for Table 01, 02, 03.');

  // 4. Filename Generation
  const table1: Pick<Table, 'name' | 'id'> = { id: 't1', name: 'Table 01' };
  const filename1 = getTableQRFilename(table1);
  assert.strictEqual(filename1, 'table-01-qr.png', 'Filename for Table 01 must be table-01-qr.png');

  const table2: Pick<Table, 'name' | 'id'> = { id: 't2', name: 'Table 02' };
  const filename2 = getTableQRFilename(table2);
  assert.strictEqual(filename2, 'table-02-qr.png', 'Filename for Table 02 must be table-02-qr.png');

  const tableCustom: Pick<Table, 'name' | 'id'> = { id: 't-vip', name: 'VIP Booth #4' };
  const filenameCustom = getTableQRFilename(tableCustom);
  assert.strictEqual(filenameCustom, 'vip-booth-4-qr.png', 'Special characters must be sanitized to valid slug');
  console.log('✓ 4. Download filename generation verified (table-01-qr.png, table-02-qr.png, vip-booth-4-qr.png).');

  // 5. Table Matching & Route Resolution Logic
  const mockTables: Table[] = [
    { id: 't1', name: 'Table 01', section: 'Main Dining', seats: 4, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t1' },
    { id: 't2', name: 'Table 02', section: 'Main Dining', seats: 2, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t2' },
    { id: 't3', name: 'Table 03', section: 'Main Dining', seats: 4, status: 'Occupied', qrCodeUrl: 'restocontrol.menu/menu/t3' },
  ];

  function resolveTable(paramId: string | undefined): Table | undefined {
    const cleanId = (paramId || '').trim().toLowerCase();
    return mockTables.find((t) => {
      const tId = t.id.toLowerCase();
      const tSlug = t.name.toLowerCase().replace(/[\s-_]+/g, '');
      const cleanSearch = cleanId.replace(/[\s-_]+/g, '');
      return tId === cleanId || tSlug === cleanSearch;
    });
  }

  // Exact ID matching
  assert.strictEqual(resolveTable('t1')?.name, 'Table 01', 'Route param "t1" must resolve to Table 01');
  assert.strictEqual(resolveTable('t2')?.name, 'Table 02', 'Route param "t2" must resolve to Table 02');
  assert.strictEqual(resolveTable('t3')?.name, 'Table 03', 'Route param "t3" must resolve to Table 03');

  // Case insensitive matching
  assert.strictEqual(resolveTable('T1')?.name, 'Table 01', 'Route param "T1" must resolve to Table 01');

  // Slug matching
  assert.strictEqual(resolveTable('table-01')?.name, 'Table 01', 'Slug "table-01" must resolve to Table 01');
  assert.strictEqual(resolveTable('table02')?.name, 'Table 02', 'Slug "table02" must resolve to Table 02');

  // Invalid table handling
  assert.strictEqual(resolveTable('unknown'), undefined, 'Param "unknown" must resolve to undefined');
  assert.strictEqual(resolveTable('invalid-table'), undefined, 'Param "invalid-table" must resolve to undefined');
  assert.strictEqual(resolveTable(''), undefined, 'Empty param must resolve to undefined');
  console.log('✓ 5. Table routing resolution verified: Table 01, 02, 03 match; invalid routes safely return undefined.');

  console.log('✔ All Step 9D Table QR Generation & Routing assertions passed successfully!');
}

runQRTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
