/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { authRepository, UserWithDetails } from '../repositories/auth.repository.js';
import { LoginInput } from '../validators/auth.validator.js';
import { generateToken } from '../utils/jwt.js';
import { UnauthorizedError } from '../utils/errors.js';
import { SafeUserProfile } from '../types/auth.types.js';

export interface LoginResult {
  token: string;
  user: SafeUserProfile;
}

export class AuthService {
  /**
   * Authenticate a user with email and password
   */
  async login(input: LoginInput): Promise<LoginResult> {
    const normalizedEmail = input.email.trim().toLowerCase();

    // 1. Find user by email
    const user = await authRepository.findByEmail(normalizedEmail);

    if (!user) {
      // Mitigate email enumeration timing attacks by running a dummy crypt
      await authRepository.dummyVerifyPassword(input.password);
      throw new UnauthorizedError('Invalid email or password');
    }

    // 2. Cryptographic password verification via PostgreSQL pgcrypto crypt()
    const isPasswordValid = await authRepository.verifyPassword(user.id, input.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // 3. Verify user active status (generic error to prevent account discovery)
    if (!user.isActive) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // 4. Verify restaurant active status (generic error to prevent account discovery)
    if (!user.restaurant || !user.restaurant.isActive) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // 5. Update last login timestamp only on fully successful authentication
    await authRepository.updateLastLogin(user.id);

    // 6. Generate signed JWT token with minimal payload
    const token = generateToken({
      userId: user.id,
      restaurantId: user.restaurantId,
    });

    // 7. Return token and safe user profile (strictly excluding passwordHash)
    return {
      token,
      user: this.formatSafeUser(user),
    };
  }

  /**
   * Get safe profile of currently authenticated user with fresh database permissions
   */
  async getCurrentUser(userId: string): Promise<SafeUserProfile> {
    const user = await authRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedError('Authenticated user no longer exists');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('User account is deactivated');
    }

    if (!user.restaurant || !user.restaurant.isActive) {
      throw new UnauthorizedError('Restaurant account is deactivated');
    }

    return this.formatSafeUser(user);
  }

  /**
   * Format user into safe profile, strictly excluding passwordHash and pinHash
   */
  private formatSafeUser(user: UserWithDetails): SafeUserProfile {
    return {
      id: user.id,
      restaurantId: user.restaurantId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: {
        id: user.role.id,
        name: user.role.name,
        displayName: user.role.displayName,
      },
      restaurant: {
        id: user.restaurant.id,
        name: user.restaurant.name,
        slug: user.restaurant.slug,
      },
      permissions: user.role.permissions.map((rp) => rp.permission.code),
    };
  }
}

export const authService = new AuthService();
