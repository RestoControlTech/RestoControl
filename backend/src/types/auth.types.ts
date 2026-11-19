/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TokenPayload {
  userId: string;
  restaurantId: string;
  roleId: string;
  roleName: string;
  email: string;
}

export interface AuthenticatedUser {
  id: string;
  restaurantId: string;
  roleId: string;
  roleName: string;
  name: string;
  email: string;
  isActive: boolean;
  permissions: string[];
}
