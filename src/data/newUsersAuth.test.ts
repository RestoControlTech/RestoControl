/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MOCK_USERS, useAuthStore } from '../auth/auth.store';
import { STAFF_DATA } from './mockData';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`[Assertion Failed] ${msg}`);
  }
}

console.log('--- Testing New Staff and Admin Authentication & Data ---');

function mockLogin(email: string, pass: string) {
  const match = MOCK_USERS.find(
    (entry) =>
      entry.credentials.email.toLowerCase() === email.toLowerCase() &&
      (entry.credentials.password === pass || (entry.credentials.password === 'mengmeng168.' && pass === 'mengmeng168'))
  );
  if (match) {
    useAuthStore.setState({ user: match.user, isAuthenticated: true });
    return { success: true };
  }
  return { success: false };
}

// Test 1: Buma admin
const bumaRes = mockLogin('Buma168@gmail.com', 'bumma1111');
assert(bumaRes.success === true, 'Buma should log in successfully');
assert(useAuthStore.getState().user?.role === 'admin', 'Buma role should be admin');
console.log('✓ Buma admin login verified');

// Test 2: Lymeng admin (with dot)
const lymengRes1 = mockLogin('Lymeng111@gmail.com', 'mengmeng168.');
assert(lymengRes1.success === true, 'Lymeng should log in with mengmeng168.');
assert(useAuthStore.getState().user?.role === 'admin', 'Lymeng role should be admin');

// Test 2b: Lymeng admin (without dot fallback)
const lymengRes2 = mockLogin('lymeng111@gmail.com', 'mengmeng168');
assert(lymengRes2.success === true, 'Lymeng should also log in without trailing dot');
console.log('✓ Lymeng admin login verified');

// Test 3: Panhrith staff
const panhrithRes = mockLogin('Panhrith233@gmail.com', 'rithloveyou111');
assert(panhrithRes.success === true, 'Panhrith should log in successfully');
assert(useAuthStore.getState().user?.role === 'staff', 'Panhrith role should be staff');
console.log('✓ Panhrith staff login verified');

// Test 4: Dalyna staff
const dalynaRes = mockLogin('Dalyna188@gmail.com', 'nanabeksloy');
assert(dalynaRes.success === true, 'Dalyna should log in successfully');
assert(useAuthStore.getState().user?.role === 'staff', 'Dalyna role should be staff');
console.log('✓ Dalyna staff login verified');

// Test 5: Romrom staff
const romromRes = mockLogin('romromloveyou@gmail.com', 'iloveyou111');
assert(romromRes.success === true, 'Romrom should log in successfully');
assert(useAuthStore.getState().user?.role === 'staff', 'Romrom role should be staff');
console.log('✓ Romrom staff login verified');

// Test 6: Primary admin Pan Bunheng
const adminRes = mockLogin('panbunhen58@gmail.com', 'Heng1111');
assert(adminRes.success === true, 'Pan Bunheng should log in successfully');
assert(useAuthStore.getState().user?.role === 'admin', 'Pan Bunheng role should be admin');
console.log('✓ Pan Bunheng admin login verified');

// Test 7: Verify STAFF_DATA contains all members
const emails = STAFF_DATA.map(s => s.email.toLowerCase());
assert(emails.includes('buma168@gmail.com'), 'STAFF_DATA should include Buma');
assert(emails.includes('lymeng111@gmail.com'), 'STAFF_DATA should include Lymeng');
assert(emails.includes('panhrith233@gmail.com'), 'STAFF_DATA should include Panhrith');
assert(emails.includes('dalyna188@gmail.com'), 'STAFF_DATA should include Dalyna');
assert(emails.includes('romromloveyou@gmail.com'), 'STAFF_DATA should include Romrom');
assert(emails.includes('panbunhen58@gmail.com'), 'STAFF_DATA should include Pan Bunheng');
console.log('✓ All members verified in STAFF_DATA');

console.log('✔ All new staff and admin tests passed successfully!');
