/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

const TABLE_STATUSES = ['AVAILABLE', 'BUSY', 'OCCUPIED', 'RESERVED'] as const;

function parseOptionalBoolean(val: unknown): unknown {
  if (val === undefined || val === null || val === '') {
    return undefined;
  }
  if (typeof val === 'boolean') {
    return val;
  }
  if (typeof val === 'string') {
    const normalized = val.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return val;
}

/**
 * Query validation schema for GET /api/pos/products
 */
export const posProductsQuerySchema = z.object({
  categoryId: z
    .preprocess(
      (val) => (typeof val === 'string' && val.trim() !== '' ? val.trim() : undefined),
      z.string().uuid('Invalid categoryId format').optional()
    ),
  search: z.string().trim().max(120, 'Search query must be at most 120 characters').optional(),
  availableOnly: z.preprocess(
    parseOptionalBoolean,
    z.boolean('availableOnly must be true or false').optional()
  ),
});

/**
 * Query validation schema for GET /api/pos/categories
 */
export const posCategoriesQuerySchema = z.object({
  activeOnly: z.preprocess(
    parseOptionalBoolean,
    z.boolean('activeOnly must be true or false').optional()
  ),
});

/**
 * Query validation schema for GET /api/pos/tables
 */
export const posTablesQuerySchema = z.object({
  status: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '' ? val.trim().toUpperCase() : undefined),
    z.enum(TABLE_STATUSES).optional()
  ),
  activeOnly: z.preprocess(
    parseOptionalBoolean,
    z.boolean('activeOnly must be true or false').optional()
  ),
});

export type PosProductsQueryInput = z.infer<typeof posProductsQuerySchema>;
export type PosCategoriesQueryInput = z.infer<typeof posCategoriesQuerySchema>;
export type PosTablesQueryInput = z.infer<typeof posTablesQuerySchema>;
