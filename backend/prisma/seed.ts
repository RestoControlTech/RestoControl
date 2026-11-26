/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import { createHash } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RESTAURANT_SLUG = 'autumn';

interface SeedCategoryInput {
  key: string;
  name: string;
  sortOrder: number;
}

interface SeedProductInput {
  legacyId: string;
  category: string;
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  isPopular: boolean;
  isAvailable: boolean;
}

interface SeedTableInput {
  legacyId: string;
  name: string;
  section: string;
  seats: number;
  qrCodeKey: string;
  qrCodeUrl: string;
}

/**
 * Generates a deterministic RFC 4122-compliant UUID from a restaurant ID,
 * entity namespace, and stable legacy identifier so re-runs stay idempotent
 * without matching records by name alone.
 */
function deterministicUuid(restaurantId: string, entity: 'category' | 'product' | 'table', legacyKey: string): string {
  const hash = createHash('sha256')
    .update(`${restaurantId}:${entity}:${legacyKey}`)
    .digest();

  // Set RFC 4122 version 4 and variant bits
  hash[6] = (hash[6] & 0x0f) | 0x40;
  hash[8] = (hash[8] & 0x3f) | 0x80;

  const hex = hash.subarray(0, 16).toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

const SEED_CATEGORIES: SeedCategoryInput[] = [
  { key: 'fried', name: 'ចៀន/បំពង', sortOrder: 1 },
  { key: 'main', name: 'ម្ហូបចម្បង', sortOrder: 2 },
  { key: 'seafood', name: 'អាហារសមុទ្រ', sortOrder: 3 },
  { key: 'drinks', name: 'ភេសជ្ជៈ', sortOrder: 4 },
  { key: 'beer', name: 'ស្រាបៀរ', sortOrder: 5 },
];

const SEED_TABLES: SeedTableInput[] = [
  {
    legacyId: 't1',
    name: 'Table 01',
    section: 'Main Dining',
    seats: 4,
    qrCodeKey: 'autumn-table-t1',
    qrCodeUrl: 'restocontrol.menu/menu/t1',
  },
  {
    legacyId: 't2',
    name: 'Table 02',
    section: 'Main Dining',
    seats: 2,
    qrCodeKey: 'autumn-table-t2',
    qrCodeUrl: 'restocontrol.menu/menu/t2',
  },
  {
    legacyId: 't3',
    name: 'Table 03',
    section: 'Main Dining',
    seats: 4,
    qrCodeKey: 'autumn-table-t3',
    qrCodeUrl: 'restocontrol.menu/menu/t3',
  },
  {
    legacyId: 't4',
    name: 'Table 04',
    section: 'Main Dining',
    seats: 4,
    qrCodeKey: 'autumn-table-t4',
    qrCodeUrl: 'restocontrol.menu/menu/t4',
  },
  {
    legacyId: 't5',
    name: 'Table 05',
    section: 'Indoor Booths',
    seats: 6,
    qrCodeKey: 'autumn-table-t5',
    qrCodeUrl: 'restocontrol.menu/menu/t5',
  },
  {
    legacyId: 't6',
    name: 'Table 06',
    section: 'Indoor Booths',
    seats: 4,
    qrCodeKey: 'autumn-table-t6',
    qrCodeUrl: 'restocontrol.menu/menu/t6',
  },
  {
    legacyId: 't7',
    name: 'Table 07',
    section: 'Outdoor Terrace',
    seats: 2,
    qrCodeKey: 'autumn-table-t7',
    qrCodeUrl: 'restocontrol.menu/menu/t7',
  },
  {
    legacyId: 't8',
    name: 'Table 08',
    section: 'Outdoor Terrace',
    seats: 4,
    qrCodeKey: 'autumn-table-t8',
    qrCodeUrl: 'restocontrol.menu/menu/t8',
  },
];

const SEED_PRODUCTS: SeedProductInput[] = [
  {
    legacyId: 'main-32',
    category: 'ម្ហូបចម្បង',
    name: 'ខ្យងបារាំងអាំងអំបិលម្ទេស',
    description: 'ខ្យងបារាំងអាំងឈ្ងុយជាមួយអំបិលម្ទេស និងម្រេចកំពត',
    price: '6.00',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929420/%E1%9E%81%E1%9F%92%E1%9E%99%E1%9E%84%E1%9E%86%E1%9E%B6%E1%9E%98%E1%9F%92%E1%9E%91%E1%9F%81%E1%9E%9F.png',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'main-33',
    category: 'ម្ហូបចម្បង',
    name: 'កង្កែបឆាម្ទេសជ្រក់',
    description: 'សាច់កង្កែបឆាក្តៅៗជាមួយម្ទេសជ្រក់ជូរហិរឈ្ងុយឆ្ងាញ់',
    price: '5.00',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929418/%E1%9E%80%E1%9E%84%E1%9F%92%E1%9E%80%E1%9F%82%E1%9E%94%E1%9E%86%E1%9E%B6%E1%9E%98%E1%9F%92%E1%9E%91%E1%9F%81%E1%9E%9F%E1%9E%87%E1%9F%92%E1%9E%9A%E1%9E%80%E1%9F%8B.png',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'main-34',
    category: 'ម្ហូបចម្បង',
    name: 'សសៃកែងលីងម្ទេសគ្រៀម',
    description: 'សសៃកែងមាន់លីងស្រួយជាមួយម្ទេសគ្រៀម និងស្លឹកក្រូចសើច',
    price: '4.50',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929441/%E1%9E%9F%E1%9E%9F%E1%9F%83%E1%9E%80%E1%9F%82%E1%9E%84%E1%9E%9B%E1%9E%B8%E1%9E%84%E1%9E%98%E1%9F%92%E1%9E%91%E1%9F%81%E1%9E%9F%E1%9E%82%E1%9F%92%E1%9E%9A%E1%9F%80%E1%9E%98.png',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'main-35',
    category: 'ម្ហូបចម្បង',
    name: 'ស្បាហ្គេទី',
    description: 'មីស្ប៉ាហ្គេទីអ៊ីតាលីជាមួយទឹកជ្រលក់ប៉េងប៉ោះសាច់ minced meat',
    price: '5.00',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929448/%E1%9E%9F%E1%9F%92%E1%9E%94%E1%9E%B6%E1%9E%A0%E1%9F%92%E1%9E%82%E1%9F%81%E1%9E%91%E1%9E%B8.png',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'main-36',
    category: 'ម្ហូបចម្បង',
    name: 'ក្តាមអប់មីសួរ',
    description: 'ក្តាមសមុទ្រស្រស់អប់ឆ្នាំងដីជាមួយមីសួរ ខ្ទឹមស និងម្រេចកំពត',
    price: '6.00',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929418/%E1%9E%80%E1%9F%92%E1%9E%8F%E1%9E%B6%E1%9E%98%E1%9E%A2%E1%9E%94%E1%9F%8B%E1%9E%98%E1%9E%B8%E1%9E%9F%E1%9E%BD%E1%9E%9A.png',
    isPopular: true,
    isAvailable: true,
  },
  {
    legacyId: 'main-38',
    category: 'ម្ហូបចម្បង',
    name: 'ស្បាហ្គេទីឆា',
    description: 'ស្ប៉ាហ្គេទីឆាហិរគ្រឿងសមុទ្របែបអាស៊ីឈ្ងុយស្លឹកកំផេះ',
    price: '5.00',
    imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=500&auto=format&fit=crop&q=80',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'main-39',
    category: 'ម្ហូបចម្បង',
    name: 'មឹកឆាពងទាប្រៃ',
    description: 'មឹកបំពង់ស្រស់ឆាជាមួយពងទាប្រៃ និងស្លឹកខ្ទឹម',
    price: '6.00',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929440/%E1%9E%98%E1%9E%B9%E1%9E%80%E1%9E%86%E1%9E%B6%E1%9E%96%E1%9E%84%E1%9E%91%E1%9E%B6%E1%9E%94%E1%9F%92%E1%9E%9A%E1%9F%83.png',
    isPopular: true,
    isAvailable: true,
  },
  {
    legacyId: 'main-40',
    category: 'ម្ហូបចម្បង',
    name: 'ស៊ុបត្រីម្ទេស',
    description: 'ស៊ុបសាច់ត្រីស្រស់ទឹកថ្លាហិរម្ទេស ជីរវ៉ាន់ស៊ុយ និងក្រូចឆ្មា',
    price: '5.50',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929447/%E1%9E%9F%E1%9F%8A%E1%9E%BB%E1%9E%94%E1%9E%8F%E1%9F%92%E1%9E%9A%E1%9E%B8%E1%9E%98%E1%9F%92%E1%9E%91%E1%9F%81%E1%9E%9F.png',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'main-41',
    category: 'ម្ហូបចម្បង',
    name: 'ស៊ុបជូរហិរគ្រឿងសមុទ្រ',
    description: 'ស៊ុបតុមយ៉ាំគ្រឿងសមុទ្រជូរហិរ បង្គារ មឹក និងផ្សិត',
    price: '5.50',
    imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500&auto=format&fit=crop&q=80',
    isPopular: true,
    isAvailable: true,
  },
  {
    legacyId: 'main-42',
    category: 'ម្ហូបចម្បង',
    name: 'បាយឆាគីមឈី',
    description: 'បាយឆាគីមឈីកូរ៉េហិរឈ្ងុយជាមួយពងទាចៀន និងសារ៉ាយ (ធម្មតា $3.50 / ធំ $6.00)',
    price: '3.50',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929429/%E1%9E%94%E1%9E%B6%E1%9E%99%E1%9E%86%E1%9E%B6%E1%9E%82%E1%9E%B8%E1%9E%98%E1%9E%88%E1%9E%B8.png',
    isPopular: true,
    isAvailable: true,
  },
  {
    legacyId: 'main-43',
    category: 'ម្ហូបចម្បង',
    name: 'ភីហ្សា',
    description: 'ភីហ្សាដុតស្រួយស្រោបឈីស Mozzarella និងគ្រឿងផ្សំពិសេស',
    price: '7.90',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'main-44',
    category: 'ម្ហូបចម្បង',
    name: 'ប្រហិតសាច់គោអប់',
    description: 'ប្រហិតសាច់គោអប់ឆ្នាំងដីជាមួយទឹកជ្រលក់ពិសេស និងជីរគ្រប់មុខ',
    price: '5.00',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929434/%E1%9E%94%E1%9F%92%E1%9E%9A%E1%9E%A0%E1%9E%B7%E1%9E%8F%E1%9E%9F%E1%9E%B6%E1%9E%85%E1%9F%8B%E1%9E%82%E1%9F%84%E1%9E%A2%E1%9E%94%E1%9F%8B.png',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'main-45',
    category: 'ម្ហូបចម្បង',
    name: 'ត្រីសាលម៉ុនចៀន',
    description: 'សាច់ត្រីសាលម៉ុនស្តេកចៀនស្រួយស្បែកទន់សាច់ ទឹកជ្រលក់ប៊័រក្រូចឆ្មា',
    price: '8.90',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929426/%E1%9E%8F%E1%9F%92%E1%9E%9A%E1%9E%B8%E1%9E%9F%E1%9E%B6%E1%9E%9B%E1%9E%98%E1%9F%89%E1%9E%BB%E1%9E%93%E1%9E%85%E1%9F%80%E1%9E%93.png',
    isPopular: true,
    isAvailable: true,
  },
  {
    legacyId: 'seafood-16',
    category: 'អាហារសមុទ្រ',
    name: 'ភ្លា',
    description: 'ភ្លាសាច់ស្រស់ជាមួយជីរគ្រប់មុខ ខ្ទឹមបារាំង ក្រូចឆ្មា និងទឹកត្រីកោះកុង',
    price: '5.00',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929435/%E1%9E%97%E1%9F%92%E1%9E%9B%E1%9E%B6.png',
    isPopular: true,
    isAvailable: true,
  },
  {
    legacyId: 'seafood-17',
    category: 'អាហារសមុទ្រ',
    name: 'បង្គារកោះកុង',
    description: 'បង្គារស្រស់លើទឹកកកជាមួយទឹកត្រីកោះកុងហិរឈ្ងុយឆ្ងាញ់',
    price: '5.00',
    imageUrl: '/images/koh-kong-shrimp.jpg',
    isPopular: true,
    isAvailable: true,
  },
  {
    legacyId: 'seafood-18',
    category: 'អាហារសមុទ្រ',
    name: 'ញ៉ាំត្រយូងចេក',
    description: 'ញ៉ាំត្រយូងចេកស្រួយជាមួយសាច់មាន់ បង្គារ និងសណ្តែកដីលីង',
    price: '5.00',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929424/%E1%9E%89%E1%9F%89%E1%9E%B6%E1%9F%86%E1%9E%8F%E1%9F%92%E1%9E%9A%E1%9E%99%E1%9E%BC%E1%9E%84%E1%9E%85%E1%9F%81%E1%9E%80.png',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'seafood-19',
    category: 'អាហារសមុទ្រ',
    name: 'ទ្រង់មាន់ / បង្គារ',
    description: 'ញ៉ាំទ្រង់មាន់ស្រួយជាមួយបង្គារស្រស់រសជាតិហិរជូរអែម',
    price: '5.00',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929427/%E1%9E%91%E1%9F%92%E1%9E%9A%E1%9E%84%E1%9F%8B%E1%9E%98%E1%9E%B6%E1%9E%93%E1%9F%8B_%E1%9E%94%E1%9E%84%E1%9F%92%E1%9E%82%E1%9E%B6%E1%9E%9A.png',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'seafood-20',
    category: 'អាហារសមុទ្រ',
    name: 'ខាត់ណាទឹកភ្នែក',
    description: 'ដើមខាត់ណាស្រួយស្រស់ស្រោបទឹកជ្រលក់ហិរកប់ក្តោង',
    price: '5.00',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929419/%E1%9E%81%E1%9E%B6%E1%9E%8F%E1%9F%8B%E1%9E%8E%E1%9E%B6%E1%9E%91%E1%9E%B9%E1%9E%80%E1%9E%97%E1%9F%92%E1%9E%93%E1%9F%82%E1%9E%80.png',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'seafood-21',
    category: 'អាហារសមុទ្រ',
    name: 'ងាវស្រស់',
    description: 'ងាវស្រស់ផ្អែមជាមួយទឹកត្រីកោះកុងម្ទេសខ្ទឹម',
    price: '5.00',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929422/%E1%9E%84%E1%9E%B6%E1%9E%9C%E1%9E%9F%E1%9F%92%E1%9E%9A%E1%9E%9F%E1%9F%8B.jpg',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'seafood-22',
    category: 'អាហារសមុទ្រ',
    name: 'អយស្ទ័រស្រស់',
    description: 'អយស្ទ័រស្រស់ធំៗលើទឹកកក ជាមួយខ្ទឹមបំពង ទឹកម្ទេស និងក្រូចឆ្មា',
    price: '6.00',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929449/%E1%9E%A2%E1%9E%99%E1%9E%9F%E1%9F%92%E1%9E%91%E1%9F%90%E1%9E%9A%E1%9E%9F%E1%9F%92%E1%9E%9A%E1%9E%9F%E1%9F%8B.png',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'seafood-23',
    category: 'អាហារសមុទ្រ',
    name: 'សាលម៉ុនស្រស់',
    description: 'សាច់ត្រីសាលម៉ុនស្រស់ផ្អែម វ៉ាសាប៊ី និងទឹកស៊ីអ៊ីវជប៉ុន',
    price: '6.00',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929449/%E1%9E%9F%E1%9E%B6%E1%9E%9B%E1%9E%98%E1%9F%89%E1%9E%BB%E1%9E%93%E1%9E%9F%E1%9F%92%E1%9E%9A%E1%9E%9F%E1%9F%8B.png',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'seafood-24',
    category: 'អាហារសមុទ្រ',
    name: 'បុកល្ហុងសាលម៉ុន',
    description: 'បុកល្ហុងបែបថៃ/ខ្មែរហិរឆ្ងាញ់ជាមួយសាច់ត្រីសាលម៉ុនបន្ទះធំៗ',
    price: '8.00',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929435/%E1%9E%94%E1%9E%BB%E1%9E%80%E1%9E%9B%E1%9F%92%E1%9E%A0%E1%9E%BB%E1%9E%84%E1%9E%9F%E1%9E%B6%E1%9E%9B%E1%9E%98%E1%9F%89%E1%9E%BB%E1%9E%93.png',
    isPopular: true,
    isAvailable: true,
  },
  {
    legacyId: 'seafood-26',
    category: 'អាហារសមុទ្រ',
    name: 'បុកល្ហុងចម្រុះ',
    description: 'ថាសបុកល្ហុងគ្រឿងសមុទ្រចម្រុះ បង្គារ មឹក ក្តាម និងសាលម៉ុន',
    price: '12.50',
    imageUrl: '/images/salmon-papaya-salad.jpg',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'seafood-27',
    category: 'អាហារសមុទ្រ',
    name: 'សាច់គោហិរអង្ករលីង',
    description: 'ឡាបសាច់គោហិរប្រឡាក់អង្ករលីងឈ្ងុយ ម្ទេស និងជីរណា',
    price: '5.00',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929443/%E1%9E%9F%E1%9E%B6%E1%9E%85%E1%9F%8B%E1%9E%82%E1%9F%84%E1%9E%A0%E1%9E%B7%E1%9E%9A%E1%9E%A2%E1%9E%84%E1%9F%92%E1%9E%80%E1%9E%9A%E1%9E%9B%E1%9E%B8%E1%9E%84.png',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'seafood-28',
    category: 'អាហារសមុទ្រ',
    name: 'ជ្រក់ត្រចៀកជ្រូក',
    description: 'ត្រចៀកជ្រូកស្រួយស្រុបជ្រក់ជូរអែម ខ្ទឹមស និងម្ទេស',
    price: '5.00',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929424/%E1%9E%87%E1%9F%92%E1%9E%9A%E1%9E%80%E1%9F%8B%E1%9E%8F%E1%9F%92%E1%9E%9A%E1%9E%85%E1%9F%80%E1%9E%80%E1%9E%87%E1%9F%92%E1%9E%9A%E1%9E%BC%E1%9E%80.png',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'seafood-29',
    category: 'អាហារសមុទ្រ',
    name: 'សាលម៉ុនទឹកស៊ីអ៊ីវ',
    description: 'ត្រីសាលម៉ុនត្រាំទឹកស៊ីអ៊ីវកូរ៉េ/ជប៉ុន ផ្អែមឈ្ងុយ ជាមួយម្ទេសខ្ទឹម',
    price: '8.00',
    imageUrl: 'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=500&auto=format&fit=crop&q=80',
    isPopular: true,
    isAvailable: true,
  },
  {
    legacyId: 'seafood-30',
    category: 'អាហារសមុទ្រ',
    name: 'បង្គារទឹកស៊ីអ៊ីវ',
    description: 'បង្គារស្រស់ត្រាំទឹកស៊ីអ៊ីវកូរ៉េផ្អែមប្រៃល្មម ញ៉ាំជាមួយសារ៉ាយសមុទ្រ',
    price: '5.00',
    imageUrl: '/images/koh-kong-shrimp.jpg',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'seafood-31',
    category: 'អាហារសមុទ្រ',
    name: 'បុកពោត',
    description: 'បុកពោតផ្អែមជាមួយពងទាប្រៃ បង្គារក្រៀម ជូរអែមហិរឆ្ងាញ់',
    price: '5.00',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790923924/%E1%9E%94%E1%9E%BB%E1%9E%80%E1%9E%96%E1%9F%84%E1%9E%8F.png',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'fried-1',
    category: 'ចៀន/បំពង',
    name: 'ពោតឆា',
    description: 'ពោតផ្អែមឆាជាមួយខ្ទឹមស ស្លឹកខ្ទឹម និងប៊័រ',
    price: '3.50',
    imageUrl: '/images/fried-corn.jpg',
    isPopular: true,
    isAvailable: true,
  },
  {
    legacyId: 'fried-2',
    category: 'ចៀន/បំពង',
    name: 'គោបំពងល្ងរ',
    description: 'សាច់គោបំពងស្រួយប្រឡាក់ល្ងរឈ្ងុយឆ្ងាញ់',
    price: '5.00',
    imageUrl: '/images/sesame-beef.jpg',
    isPopular: true,
    isAvailable: true,
  },
  {
    legacyId: 'fried-3',
    category: 'ចៀន/បំពង',
    name: 'ប្រហិតបំពងខ្ទឹមស',
    description: 'ប្រហិតបំពងស្រួយជាមួយខ្ទឹមសបំពងឈ្ងុយ',
    price: '3.50',
    imageUrl: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=500&auto=format&fit=crop&q=80',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'fried-4',
    category: 'ចៀន/បំពង',
    name: 'សសៃរកែងមាន់',
    description: 'សសៃរកែងមាន់បំពងស្រួយស្រុបជាមួយទឹកជ្រលក់ពិសេស',
    price: '3.50',
    imageUrl: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=500&auto=format&fit=crop&q=80',
    isPopular: true,
    isAvailable: true,
  },
  {
    legacyId: 'fried-6',
    category: 'ចៀន/បំពង',
    name: 'ស្លាបមាន់ហិរ',
    description: 'ស្លាបមាន់បំពងស្រោបទឹកជ្រលក់ហិរពិសេស',
    price: '3.50',
    imageUrl: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=500&auto=format&fit=crop&q=80',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'fried-9',
    category: 'ចៀន/បំពង',
    name: 'ឆ្អឹងជំនីជ្រកបំពងខ្ទឹមស',
    description: 'ឆ្អឹងជំនីជ្រូកបំពងជាមួយខ្ទឹមសបំពងឈ្ងុយឆ្ងាញ់',
    price: '4.50',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'fried-10',
    category: 'ចៀន/បំពង',
    name: 'ងាវលីងអំបិលម្ទេស',
    description: 'ងាវស្រស់លីងជាមួយអំបិលម្ទេស និងម្រេចកំពត',
    price: '5.00',
    imageUrl: '/images/blood-clams.jpg',
    isPopular: true,
    isAvailable: true,
  },
  {
    legacyId: 'fried-11',
    category: 'ចៀន/បំពង',
    name: 'បង្គារបំពងខ្ទឹមស',
    description: 'បង្គារស្រស់បំពងស្រួយរោយខ្ទឹមសបំពងឈ្ងុយ',
    price: '5.00',
    imageUrl: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=500&auto=format&fit=crop&q=80',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'fried-13',
    category: 'ចៀន/បំពង',
    name: 'មាន់បំពងគល់ស្លឹកគ្រៃ',
    description: 'សាច់មាន់បំពងស្រួយជាមួយគល់ស្លឹកគ្រៃឈ្ងុយឆ្ងាញ់',
    price: '3.50',
    imageUrl: '/images/lemongrass-chicken.jpg',
    isPopular: true,
    isAvailable: true,
  },
  {
    legacyId: 'fried-14',
    category: 'ចៀន/បំពង',
    name: 'កង្កែបបំពងស្រួយ',
    description: 'កង្កែបបំពងស្រួយស្រុបជាមួយអំបិលម្រេចក្រូចឆ្មា',
    price: '4.50',
    imageUrl: '/images/crispy-frog.jpg',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'fried-15',
    category: 'ចៀន/បំពង',
    name: 'មឹកបំពងសាច់ជ្រូក',
    description: 'មឹកញាត់សាច់ជ្រូកបំពងស្រួយរសជាតិឆ្ងាញ់ប្លែកមាត់',
    price: '5.00',
    imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=500&auto=format&fit=crop&q=80',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'drink-11',
    category: 'ភេសជ្ជៈ',
    name: 'Coca-Cola',
    description: 'កូកាកូឡាត្រជាក់ស្រួយ',
    price: '1.00',
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'drink-12',
    category: 'ភេសជ្ជៈ',
    name: 'Pepsi',
    description: 'ប៉ិបស៊ីត្រជាក់ស្រស់ស្រាយ',
    price: '1.00',
    imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'drink-13',
    category: 'ភេសជ្ជៈ',
    name: 'Sprite',
    description: 'ស្ប្រាយក្លិនក្រូចឆ្មាស្រស់ស្រាយ',
    price: '1.00',
    imageUrl: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=500&auto=format&fit=crop&q=80',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'drink-14',
    category: 'ភេសជ្ជៈ',
    name: 'Fanta',
    description: 'ហ្វាន់តាទឹកក្រូចផ្អែមត្រជាក់',
    price: '1.00',
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'drink-15',
    category: 'ភេសជ្ជៈ',
    name: 'Soda',
    description: 'ទឹកសូដាក្លាស្សេត្រជាក់',
    price: '1.00',
    imageUrl: 'https://images.unsplash.com/photo-1559839914-17aae19cec71?w=500&auto=format&fit=crop&q=80',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'drink-16',
    category: 'ភេសជ្ជៈ',
    name: 'Tonic Water',
    description: 'ថូនិកវ៉ត់ធ័រត្រជាក់ក្លាស្សេ',
    price: '1.50',
    imageUrl: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=500&auto=format&fit=crop&q=80',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'drink-17',
    category: 'ភេសជ្ជៈ',
    name: 'ទឹកក្រូចស្រស់',
    description: 'ទឹកក្រូចពោធិ៍សាត់ច្របាច់ស្រស់ៗធម្មជាតិ 100%',
    price: '2.50',
    imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&auto=format&fit=crop&q=80',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'drink-18',
    category: 'ភេសជ្ជៈ',
    name: 'ទឹកក្រូចឆ្មា',
    description: 'ទឹកក្រូចឆ្មាស្រស់ជូរអែមត្រជាក់កាត់បំពង់ក',
    price: '2.00',
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'drink-19',
    category: 'ភេសជ្ជៈ',
    name: 'ទឹកឪឡឹក',
    description: 'ទឹកឪឡឹកក្រឡុកស្រស់ផ្អែមត្រជាក់ឈ្ងុយ',
    price: '2.50',
    imageUrl: 'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=500&auto=format&fit=crop&q=80',
    isPopular: true,
    isAvailable: true,
  },
  {
    legacyId: 'drink-20',
    category: 'ភេសជ្ជៈ',
    name: 'ទឹកម្នាស់',
    description: 'ទឹកម្នាស់ស្រស់ជូរអែមត្រជាក់ស្រស់ស្រាយ',
    price: '2.50',
    imageUrl: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=500&auto=format&fit=crop&q=80',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'drink-21',
    category: 'ភេសជ្ជៈ',
    name: 'ទឹកស្វាយ',
    description: 'ទឹកស្វាយទុំក្រឡុកផ្អែមឈ្ងុយឆ្ងាញ់',
    price: '2.50',
    imageUrl: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=500&auto=format&fit=crop&q=80',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'drink-22',
    category: 'ភេសជ្ជៈ',
    name: 'Passion Fruit Juice',
    description: 'ទឹកផាសិនស្រស់ជូរអែមឆ្ងាញ់ត្រជាក់បេះដូង',
    price: '2.50',
    imageUrl: '/images/passion-fruit-juice.jpg',
    isPopular: true,
    isAvailable: true,
  },
  {
    legacyId: 'drink-23',
    category: 'ភេសជ្ជៈ',
    name: 'Fresh Lemon Tea',
    description: 'តែក្រូចឆ្មាស្រស់ក្លិនឈ្ងុយត្រជាក់ស្រស់ស្រាយ',
    price: '2.00',
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=80',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'food-12',
    category: 'ស្រាបៀរ',
    name: 'ABC Smooth Draft',
    description: 'ABC Extra Stout Smooth Draft',
    price: '3.00',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790918890/17288708064b7ff23731cdf370c924658d6cc5b6548.jpg',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'food-13',
    category: 'ស្រាបៀរ',
    name: 'Cambodia Draft',
    description: 'Cambodia Draft Beer',
    price: '1.50',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929387/Cambodia_Draft.jpg',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'food-14',
    category: 'ស្រាបៀរ',
    name: 'Cambodia Tower',
    description: 'Cambodia Beer Tower 3L',
    price: '9.00',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929389/Cambodia_Tower_beer.png',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'food-15',
    category: 'ស្រាបៀរ',
    name: 'Hanuman Draft',
    description: 'Hanuman Premium Draft Beer',
    price: '2.00',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929388/Hanuman_Draft.jpg',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'food-16',
    category: 'ស្រាបៀរ',
    name: 'Hanuman Tower',
    description: 'Hanuman Beer Tower 3L',
    price: '11.00',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929392/hunauma_Tower_beer.jpg',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'food-17',
    category: 'ស្រាបៀរ',
    name: 'Hoegaarden Draft',
    description: 'Belgian Wheat Beer Draft',
    price: '3.50',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929389/Hoegaarden_Draft.jpg',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'food-18',
    category: 'ស្រាបៀរ',
    name: 'Hoegaarden Tower',
    description: 'Hoegaarden Original Beer Tower 3L',
    price: '20.00',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929391/Hoegaarden_only_tower.png',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'food-19',
    category: 'ស្រាបៀរ',
    name: 'Hoegaarden Rosée Tower',
    description: 'Hoegaarden Rosée Raspberry Beer Tower 3L',
    price: '22.00',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929388/Budweiser_Draft_rose.png',
    isPopular: true,
    isAvailable: true,
  },
  {
    legacyId: 'food-20',
    category: 'ស្រាបៀរ',
    name: 'Budweiser Draft',
    description: 'King of Beers Fresh Draft',
    price: '2.00',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929386/Budweiser_Draft.webp',
    isPopular: false,
    isAvailable: true,
  },
  {
    legacyId: 'food-21',
    category: 'ស្រាបៀរ',
    name: 'Budweiser Tower',
    description: 'Budweiser Beer Tower 3L',
    price: '15.00',
    imageUrl: 'https://res.cloudinary.com/cc67bunh/image/upload/v1790929388/Budweiser_Tower.png',
    isPopular: false,
    isAvailable: true,
  },
];

async function seedCategories(
  tx: Prisma.TransactionClient,
  restaurantId: string
): Promise<Map<string, string>> {
  const categoryIdMap = new Map<string, string>();
  let created = 0;
  let skipped = 0;

  for (const cat of SEED_CATEGORIES) {
    const deterministicId = deterministicUuid(restaurantId, 'category', cat.key);
    const existing = await tx.category.findFirst({
      where: {
        restaurantId,
        OR: [{ id: deterministicId }, { name: cat.name }],
      },
    });

    if (existing) {
      categoryIdMap.set(cat.name, existing.id);
      skipped++;
      continue;
    }

    const inserted = await tx.category.create({
      data: {
        id: deterministicId,
        restaurantId,
        name: cat.name,
        sortOrder: cat.sortOrder,
        isActive: true,
      },
    });
    categoryIdMap.set(cat.name, inserted.id);
    created++;
  }

  console.log(`[Seed] Categories: ${created} created, ${skipped} already present.`);
  return categoryIdMap;
}

async function seedProducts(
  tx: Prisma.TransactionClient,
  restaurantId: string,
  categoryIdMap: Map<string, string>
): Promise<void> {
  let created = 0;
  let skipped = 0;

  for (const item of SEED_PRODUCTS) {
    const categoryId = categoryIdMap.get(item.category);
    if (!categoryId) {
      throw new Error(`Missing seeded category for "${item.category}" (product ${item.legacyId})`);
    }

    const deterministicId = deterministicUuid(restaurantId, 'product', item.legacyId);

    // Match by deterministic UUID (bound to legacyId) OR composite (restaurantId, categoryId, name)
    const existing = await tx.product.findFirst({
      where: {
        restaurantId,
        OR: [
          { id: deterministicId },
          { categoryId, name: item.name },
        ],
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await tx.product.create({
      data: {
        id: deterministicId,
        restaurantId,
        categoryId,
        name: item.name,
        description: item.description,
        price: item.price,
        isAvailable: item.isAvailable,
        isPopular: item.isPopular,
        imageUrl: item.imageUrl,
      },
    });
    created++;
  }

  console.log(`[Seed] Products: ${created} created, ${skipped} already present.`);
}

async function seedTables(
  tx: Prisma.TransactionClient,
  restaurantId: string
): Promise<void> {
  let created = 0;
  let skipped = 0;

  for (const tbl of SEED_TABLES) {
    const deterministicId = deterministicUuid(restaurantId, 'table', tbl.legacyId);
    const existing = await tx.table.findFirst({
      where: {
        restaurantId,
        OR: [
          { id: deterministicId },
          { legacyId: tbl.legacyId },
          { name: tbl.name },
        ],
      },
    });

    if (existing) {
      // Backfill legacyId safely if matched by name/id without deleting or resetting live state
      if (!existing.legacyId) {
        await tx.table.update({
          where: { id: existing.id },
          data: { legacyId: tbl.legacyId },
        });
      }
      skipped++;
      continue;
    }

    await tx.table.create({
      data: {
        id: deterministicId,
        restaurantId,
        legacyId: tbl.legacyId,
        name: tbl.name,
        section: tbl.section,
        seats: tbl.seats,
        status: 'AVAILABLE',
        qrCodeKey: tbl.qrCodeKey,
        qrCodeUrl: tbl.qrCodeUrl,
        isActive: false,
        totalAmount: '0.00',
      },
    });
    created++;
  }

  console.log(`[Seed] Tables: ${created} created, ${skipped} already present.`);
}

async function main(): Promise<void> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: RESTAURANT_SLUG },
  });

  if (!restaurant) {
    throw new Error(
      `Existing restaurant with slug "${RESTAURANT_SLUG}" was not found in PostgreSQL.`
    );
  }

  console.log(`[Seed] Target restaurant: ${restaurant.name} (${restaurant.id})`);

  await prisma.$transaction(
    async (tx) => {
      const categoryIdMap = await seedCategories(tx, restaurant.id);
      await seedProducts(tx, restaurant.id, categoryIdMap);
      await seedTables(tx, restaurant.id);
    },
    { maxWait: 10000, timeout: 30000 }
  );

  console.log('[Seed] Completed idempotently without deleting existing data.');
}

main()
  .catch((err) => {
    console.error('[Seed] Failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
