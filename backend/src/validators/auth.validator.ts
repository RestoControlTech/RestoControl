/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

/**
 * Validation schema for POST /api/auth/login
 */
export const loginSchema = z.object({
  email: z
    .string('Email is required')
    .trim()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(120, 'Email must be at most 120 characters'),
  password: z
    .string('Password is required')
    .min(1, 'Password is required')
    .max(128, 'Password must be at most 128 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;
