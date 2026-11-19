/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TokenPayload {
  userId: string;
  restaurantId: string;
}

export interface SafeRestaurantProfile {
  id: string;
  name: string;
  slug: string;
}

export interface SafeRoleProfile {
  id: string;
  name: string;
  displayName: string;
}

export interface SafeUserProfile {
  id: string;
  restaurantId: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: SafeRoleProfile;
  restaurant: SafeRestaurantProfile;
  permissions: string[];
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
  restaurant?: SafeRestaurantProfile;
}
