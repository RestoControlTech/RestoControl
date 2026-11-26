/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

const ORDER_TYPES = ['DINE_IN', 'TAKEAWAY', 'DELIVERY'] as const;
const ORDER_STATUSES = ['PENDING', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'] as const;
const MUTABLE_KITCHEN_STATUSES = ['PENDING', 'PREPARING', 'READY', 'SERVED'] as const;
const PAYMENT_STATUSES = ['UNPAID', 'PARTIALLY_PAID', 'PAID'] as const;

const optionalTrimmedString = (max: number, label: string) =>
  z.preprocess(
    (val) => {
      if (val === undefined || val === null) return val;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed === '' ? null : trimmed;
      }
      return val;
    },
    z.string().max(max, `${label} must be at most ${max} characters`).nullable().optional()
  );

export const posOrderItemInputSchema = z.object({
  productId: z.string().uuid('Invalid productId format'),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(999, 'Quantity must be at most 999'),
  instructions: optionalTrimmedString(255, 'instructions'),
});

/**
 * Body schema for POST /api/pos/orders
 */
export const createPosOrderSchema = z
  .object({
    orderType: z.enum(ORDER_TYPES).default('DINE_IN'),
    tableId: z.string().uuid('Invalid tableId format').optional(),
    sessionId: z.string().uuid('Invalid sessionId format').optional(),
    customerId: z.string().uuid('Invalid customerId format').optional(),
    idempotencyKey: z
      .string()
      .trim()
      .min(1, 'idempotencyKey cannot be empty')
      .max(64, 'idempotencyKey must be at most 64 characters')
      .optional(),
    notes: optionalTrimmedString(500, 'notes'),
    items: z
      .array(posOrderItemInputSchema)
      .max(100, 'Cannot add more than 100 items in a single request')
      .optional()
      .default([]),
  })
  .superRefine((data, ctx) => {
    if (data.orderType === 'DINE_IN') {
      if (!data.tableId && !data.sessionId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tableId'],
          message: 'DINE_IN orders require either tableId or sessionId',
        });
      }
    } else {
      if (data.tableId !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tableId'],
          message: `${data.orderType} orders must not specify tableId`,
        });
      }
      if (data.sessionId !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sessionId'],
          message: `${data.orderType} orders must not specify sessionId`,
        });
      }
    }
  });

/**
 * Query schema for GET /api/pos/orders
 */
export const posOrdersListQuerySchema = z.object({
  orderType: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '' ? val.trim().toUpperCase() : undefined),
    z.enum(ORDER_TYPES).optional()
  ),
  status: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '' ? val.trim().toUpperCase() : undefined),
    z.enum(ORDER_STATUSES).optional()
  ),
  paymentStatus: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '' ? val.trim().toUpperCase() : undefined),
    z.enum(PAYMENT_STATUSES).optional()
  ),
  sessionId: z.string().uuid('Invalid sessionId format').optional(),
  tableId: z.string().uuid('Invalid tableId format').optional(),
  limit: z.preprocess(
    (val) => (val === undefined || val === '' ? undefined : Number(val)),
    z.number().int().min(1).max(100).optional().default(50)
  ),
});

/**
 * Route params for /api/pos/orders/:orderId
 */
export const posOrderIdParamsSchema = z.object({
  orderId: z.string().uuid('Invalid orderId format'),
});

/**
 * Route params for /api/pos/orders/:orderId/items/:itemId
 */
export const posOrderItemParamsSchema = z.object({
  orderId: z.string().uuid('Invalid orderId format'),
  itemId: z.string().uuid('Invalid itemId format'),
});

/**
 * Body schema for POST /api/pos/orders/:orderId/items
 */
export const addPosOrderItemSchema = posOrderItemInputSchema;

/**
 * Body schema for PATCH /api/pos/orders/:orderId/items/:itemId
 */
export const updatePosOrderItemSchema = z
  .object({
    quantity: z
      .number()
      .int('Quantity must be an integer')
      .min(1, 'Quantity must be at least 1')
      .max(999, 'Quantity must be at most 999')
      .optional(),
    instructions: optionalTrimmedString(255, 'instructions'),
  })
  .refine((data) => data.quantity !== undefined || data.instructions !== undefined, {
    message: 'At least one of quantity or instructions must be provided',
  });

/**
 * Body schema for PATCH /api/pos/orders/:orderId
 */
export const updatePosOrderSchema = z
  .object({
    status: z.enum(MUTABLE_KITCHEN_STATUSES).optional(),
    notes: optionalTrimmedString(500, 'notes'),
  })
  .refine((data) => data.status !== undefined || data.notes !== undefined, {
    message: 'At least one of status or notes must be provided',
  });

/**
 * Body schema for POST /api/pos/orders/:orderId/cancel
 */
export const cancelPosOrderSchema = z.object({
  reason: optionalTrimmedString(255, 'reason'),
});

export type PosOrderItemInput = z.infer<typeof posOrderItemInputSchema>;
export type CreatePosOrderInput = z.infer<typeof createPosOrderSchema>;
export type PosOrdersListQueryInput = z.infer<typeof posOrdersListQuerySchema>;
export type AddPosOrderItemInput = z.infer<typeof addPosOrderItemSchema>;
export type UpdatePosOrderItemInput = z.infer<typeof updatePosOrderItemSchema>;
export type UpdatePosOrderInput = z.infer<typeof updatePosOrderSchema>;
export type CancelPosOrderInput = z.infer<typeof cancelPosOrderSchema>;
