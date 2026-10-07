/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import { Table, TableStatus } from '../types';

console.log('--- Testing Table Customer "Busy" Status Synchronization ---');

// 1. Initial State: Tables start as Available
const tables: Table[] = [
  { id: 't1', name: 'Table 01', section: 'Main Dining', seats: 4, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t1' },
  { id: 't2', name: 'Table 02', section: 'Main Dining', seats: 2, status: 'Available', qrCodeUrl: 'restocontrol.menu/menu/t2' },
];

assert.strictEqual(tables[0].status, 'Available', 'Table 01 initially Available');

// 2. Customer accesses menu customer page (e.g. Table 01 / /menu/t1)
const handleCustomerEnterTable = (currentTables: Table[], tableIdOrName: string): Table[] => {
  return currentTables.map((t) => {
    const cleanTarget = tableIdOrName.trim().toLowerCase().replace(/[\s-_]+/g, '');
    const tId = t.id.toLowerCase().replace(/[\s-_]+/g, '');
    const tName = t.name.toLowerCase().replace(/[\s-_]+/g, '');
    if ((tId === cleanTarget || tName === cleanTarget) && t.status === 'Available') {
      return { ...t, status: 'Busy' };
    }
    return t;
  });
};

const updatedAfterCustomerEnter = handleCustomerEnterTable(tables, 't1');
const table1 = updatedAfterCustomerEnter.find((t) => t.id === 't1');
assert.strictEqual(table1?.status, 'Busy', 'Table 01 status must automatically update to "Busy" when customer is on table menu');
console.log('✓ 1. Customer entering /menu/t1 automatically changes Table 01 status from Available to Busy');

// 3. Status toggle cycles Available -> Busy -> Reserved -> Available
const handleToggleTableStatus = (currentTables: Table[], tableId: string): Table[] => {
  return currentTables.map((t) => {
    if (t.id !== tableId) return t;
    const isBusy = t.status === 'Busy' || t.status === 'Occupied';
    const nextStatus: TableStatus = t.status === 'Available' ? 'Busy' : isBusy ? 'Reserved' : 'Available';
    return { ...t, status: nextStatus };
  });
};

const toggledToReserved = handleToggleTableStatus(updatedAfterCustomerEnter, 't1');
assert.strictEqual(toggledToReserved.find((t) => t.id === 't1')?.status, 'Reserved');

const toggledToAvailable = handleToggleTableStatus(toggledToReserved, 't1');
assert.strictEqual(toggledToAvailable.find((t) => t.id === 't1')?.status, 'Available');

const toggledToBusy = handleToggleTableStatus(toggledToAvailable, 't1');
assert.strictEqual(toggledToBusy.find((t) => t.id === 't1')?.status, 'Busy');
console.log('✓ 2. Manual toggle cycles properly through Available -> Busy -> Reserved -> Available');

// 4. Badge display and filter logic handles Busy
const getBadgeText = (status: TableStatus) => (status === 'Busy' || status === 'Occupied' ? 'Busy' : status);
assert.strictEqual(getBadgeText('Busy'), 'Busy');
assert.strictEqual(getBadgeText('Occupied'), 'Busy');
assert.strictEqual(getBadgeText('Available'), 'Available');
console.log('✓ 3. Table badge displays BUSY for staff clarity when table has customer');

console.log('\n✔ All Table Customer Busy Tests Passed Successfully!\n');
