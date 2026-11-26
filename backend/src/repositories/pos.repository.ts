/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Prisma, TableStatus } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import {
  PosCategoriesQueryInput,
  PosProductsQueryInput,
  PosTablesQueryInput,
} from '../validators/pos.validator.js';

export const posProductSelect = {
  id: true,
  categoryId: true,
  name: true,
  description: true,
  price: true,
  stockQuantity: true,
  trackStock: true,
  isAvailable: true,
  isPopular: true,
  imageUrl: true,
  prepTime: true,
  kitchenStation: true,
  category: {
    select: {
      id: true,
      name: true,
      sortOrder: true,
    },
  },
} satisfies Prisma.ProductSelect;

export const posCategorySelect = {
  id: true,
  name: true,
  icon: true,
  color: true,
  sortOrder: true,
  isActive: true,
  _count: {
    select: {
      products: {
        where: {
          deletedAt: null,
        },
      },
    },
  },
} satisfies Prisma.CategorySelect;

export const posTableSelect = {
  id: true,
  legacyId: true,
  name: true,
  section: true,
  seats: true,
  status: true,
  qrCodeUrl: true,
  isActive: true,
  totalAmount: true,
  lastActivityAt: true,
} satisfies Prisma.TableSelect;

export type PosProductRecord = Prisma.ProductGetPayload<{ select: typeof posProductSelect }>;
export type PosCategoryRecord = Prisma.CategoryGetPayload<{ select: typeof posCategorySelect }>;
export type PosTableRecord = Prisma.TableGetPayload<{ select: typeof posTableSelect }>;

export class PosRepository {
  /**
   * Queries POS products strictly scoped to the verified restaurantId.
   */
  async findProducts(
    restaurantId: string,
    query: PosProductsQueryInput
  ): Promise<PosProductRecord[]> {
    const where: Prisma.ProductWhereInput = {
      restaurantId,
      deletedAt: null,
    };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.availableOnly !== undefined) {
      where.isAvailable = query.availableOnly;
    }

    if (query.search && query.search.length > 0) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return prisma.product.findMany({
      where,
      select: posProductSelect,
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }, { id: 'asc' }],
    });
  }

  /**
   * Queries POS categories strictly scoped to the verified restaurantId.
   */
  async findCategories(
    restaurantId: string,
    query: PosCategoriesQueryInput
  ): Promise<PosCategoryRecord[]> {
    const where: Prisma.CategoryWhereInput = {
      restaurantId,
    };

    if (query.activeOnly !== undefined) {
      where.isActive = query.activeOnly;
    }

    return prisma.category.findMany({
      where,
      select: posCategorySelect,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }],
    });
  }

  /**
   * Queries POS tables strictly scoped to the verified restaurantId.
   */
  async findTables(
    restaurantId: string,
    query: PosTablesQueryInput
  ): Promise<PosTableRecord[]> {
    const where: Prisma.TableWhereInput = {
      restaurantId,
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status as TableStatus;
    }

    if (query.activeOnly !== undefined) {
      where.isActive = query.activeOnly;
    }

    return prisma.table.findMany({
      where,
      select: posTableSelect,
      orderBy: [{ legacyId: 'asc' }, { name: 'asc' }, { id: 'asc' }],
    });
  }
}

export const posRepository = new PosRepository();
