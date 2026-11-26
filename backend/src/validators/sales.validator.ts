/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

const PAYMENT_METHODS = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'KHQR', 'DIGITAL_WALLET'] as const;
const SALE_STATUSES = ['ACTIVE', 'COMPLETED', 'CANCELLED', 'PAID', 'PARTIALLY_PAID', 'UNPAID'] as const;

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateString(value: string): boolean {
  if (DATE_ONLY_REGEX.test(value)) {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
  }
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

/**
 * Query validation schema for GET /api/sales
 */
export const salesListQuerySchema = z
  .object({
    search: z.string().trim().max(120, 'Search query must be at most 120 characters').optional(),
    paymentMethod: z
      .preprocess(
        (val) => (typeof val === 'string' && val.trim() !== '' ? val.trim().toUpperCase() : undefined),
        z.enum(PAYMENT_METHODS).optional()
      ),
    status: z
      .preprocess(
        (val) => (typeof val === 'string' && val.trim() !== '' ? val.trim().toUpperCase() : undefined),
        z.enum(SALE_STATUSES).optional()
      ),
    startDate: z
      .preprocess(
        (val) => (typeof val === 'string' && val.trim() !== '' ? val.trim() : undefined),
        z.string().refine(isValidDateString, 'Invalid startDate format').optional()
      ),
    endDate: z
      .preprocess(
        (val) => (typeof val === 'string' && val.trim() !== '' ? val.trim() : undefined),
        z.string().refine(isValidDateString, 'Invalid endDate format').optional()
      ),
    page: z.coerce.number().int('Page must be an integer').min(1, 'Page must be at least 1').default(1),
    limit: z.coerce
      .number()
      .int('Limit must be an integer')
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit must be at most 100')
      .default(20),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        const start = new Date(DATE_ONLY_REGEX.test(data.startDate) ? `${data.startDate}T00:00:00.000Z` : data.startDate);
        const end = new Date(DATE_ONLY_REGEX.test(data.endDate) ? `${data.endDate}T23:59:59.999Z` : data.endDate);
        return start.getTime() <= end.getTime();
      }
      return true;
    },
    {
      message: 'startDate must not be after endDate',
      path: ['startDate'],
    }
  );

/**
 * Path parameter validation schema for GET /api/sales/:id
 */
export const saleIdParamsSchema = z.object({
  id: z.string().uuid('Invalid sale transaction ID format'),
});

export type SalesListQueryInput = z.infer<typeof salesListQuerySchema>;
export type SaleIdParamsInput = z.infer<typeof saleIdParamsSchema>;
export type AllowedPaymentMethod = (typeof PAYMENT_METHODS)[number];
export type AllowedSaleStatus = (typeof SALE_STATUSES)[number];
