/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PosCategoryRecord,
  PosProductRecord,
  PosTableRecord,
  posRepository,
} from '../repositories/pos.repository.js';
import {
  PosCategoriesQueryInput,
  PosProductsQueryInput,
  PosTablesQueryInput,
} from '../validators/pos.validator.js';

export interface PosProductDto {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  price: string;
  stockQuantity: number;
  trackStock: boolean;
  isAvailable: boolean;
  isPopular: boolean;
  imageUrl: string | null;
  prepTime: number | null;
  kitchenStation: string | null;
}

export interface PosCategoryDto {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

export interface PosTableDto {
  id: string;
  legacyId: string | null;
  name: string;
  section: string;
  seats: number;
  status: string;
  qrCodeUrl: string | null;
  isActive: boolean;
  totalAmount: string;
  lastActivityAt: string | null;
}

function mapProductDto(record: PosProductRecord): PosProductDto {
  return {
    id: record.id,
    categoryId: record.categoryId,
    categoryName: record.category.name,
    name: record.name,
    description: record.description,
    price: record.price.toFixed(2),
    stockQuantity: record.stockQuantity,
    trackStock: record.trackStock,
    isAvailable: record.isAvailable,
    isPopular: record.isPopular,
    imageUrl: record.imageUrl,
    prepTime: record.prepTime,
    kitchenStation: record.kitchenStation,
  };
}

function mapCategoryDto(record: PosCategoryRecord): PosCategoryDto {
  return {
    id: record.id,
    name: record.name,
    icon: record.icon,
    color: record.color,
    sortOrder: record.sortOrder,
    isActive: record.isActive,
    productCount: record._count.products,
  };
}

function mapTableDto(record: PosTableRecord): PosTableDto {
  return {
    id: record.id,
    legacyId: record.legacyId,
    name: record.name,
    section: record.section,
    seats: record.seats,
    status: record.status,
    qrCodeUrl: record.qrCodeUrl,
    isActive: record.isActive,
    totalAmount: record.totalAmount.toFixed(2),
    lastActivityAt: record.lastActivityAt ? record.lastActivityAt.toISOString() : null,
  };
}

export class PosService {
  async listProducts(
    restaurantId: string,
    query: PosProductsQueryInput
  ): Promise<{ products: PosProductDto[]; total: number }> {
    const records = await posRepository.findProducts(restaurantId, query);
    const products = records.map(mapProductDto);
    return { products, total: products.length };
  }

  async listCategories(
    restaurantId: string,
    query: PosCategoriesQueryInput
  ): Promise<{ categories: PosCategoryDto[]; total: number }> {
    const records = await posRepository.findCategories(restaurantId, query);
    const categories = records.map(mapCategoryDto);
    return { categories, total: categories.length };
  }

  async listTables(
    restaurantId: string,
    query: PosTablesQueryInput
  ): Promise<{ tables: PosTableDto[]; total: number }> {
    const records = await posRepository.findTables(restaurantId, query);
    const tables = records.map(mapTableDto);
    return { tables, total: tables.length };
  }
}

export const posService = new PosService();
