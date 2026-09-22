/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserSession {
  name: string;
  email: string;
  role: 'Admin' | 'Staff' | 'Manager' | 'Cashier' | 'Kitchen' | 'Waiter';
  station: string;
}

/**
 * Validate a PIN credential for logging in to a staff terminal
 */
export function validatePin(pin: string): UserSession | null {
  // Standard simulated PIN configurations matching Kuro Bistro staff profiles
  if (pin === '4091' || pin === '1234') {
    return {
      name: 'Kenji Sato',
      email: 'kenji.s@kurobistro.com',
      role: 'Manager',
      station: 'Register 01'
    };
  }
  
  if (pin === '8888') {
    return {
      name: 'Yumi Tanaka',
      email: 'yumi.t@kurobistro.com',
      role: 'Kitchen',
      station: 'Kitchen Display'
    };
  }

  if (pin === '9999') {
    return {
      name: 'Alex M.',
      email: 'alex.m@kurobistro.com',
      role: 'Cashier',
      station: 'Register 01'
    };
  }

  return null;
}
