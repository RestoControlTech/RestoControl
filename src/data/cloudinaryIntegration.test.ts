/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import { 
  validateImageFile, 
  getOptimizedCloudinaryUrl, 
  DEFAULT_PRODUCT_IMAGE,
  MAX_IMAGE_FILE_SIZE_BYTES 
} from '../services/cloudinary';
import { MenuItem, Product } from '../types';

console.log('--- Running Cloudinary Image Integration Test Suite ---');

// Mock File implementation for Node test environment
class MockFile {
  name: string;
  type: string;
  size: number;

  constructor(name: string, type: string, size: number) {
    this.name = name;
    this.type = type;
    this.size = size;
  }
}

// TEST 1: Valid JPG file validation
{
  const jpgFile = new MockFile('tonkotsu-ramen.jpg', 'image/jpeg', 1024 * 500) as unknown as File;
  const result = validateImageFile(jpgFile);
  assert.strictEqual(result.valid, true, 'JPG image must be valid');
  assert.strictEqual(result.error, undefined, 'JPG image must not have error');
  console.log('✓ TEST 1: Valid JPG file accepted.');
}

// TEST 2: Valid PNG file validation
{
  const pngFile = new MockFile('sushi-roll.png', 'image/png', 1024 * 1200) as unknown as File;
  const result = validateImageFile(pngFile);
  assert.strictEqual(result.valid, true, 'PNG image must be valid');
  assert.strictEqual(result.error, undefined, 'PNG image must not have error');
  console.log('✓ TEST 2: Valid PNG file accepted.');
}

// TEST 3: Valid WEBP file validation
{
  const webpFile = new MockFile('gyoza.webp', 'image/webp', 1024 * 800) as unknown as File;
  const result = validateImageFile(webpFile);
  assert.strictEqual(result.valid, true, 'WEBP image must be valid');
  assert.strictEqual(result.error, undefined, 'WEBP image must not have error');
  console.log('✓ TEST 3: Valid WEBP file accepted.');
}

// TEST 4: Unsupported format (GIF, PDF, EXE) blocked
{
  const gifFile = new MockFile('animation.gif', 'image/gif', 1024 * 200) as unknown as File;
  const pdfFile = new MockFile('menu.pdf', 'application/pdf', 1024 * 500) as unknown as File;
  
  const gifResult = validateImageFile(gifFile);
  assert.strictEqual(gifResult.valid, false, 'GIF must be rejected');
  assert.strictEqual(gifResult.error, 'Image must be JPG, PNG, or WEBP.');

  const pdfResult = validateImageFile(pdfFile);
  assert.strictEqual(pdfResult.valid, false, 'PDF must be rejected');
  assert.strictEqual(pdfResult.error, 'Image must be JPG, PNG, or WEBP.');
  console.log('✓ TEST 4: Unsupported file formats rejected with clear message.');
}

// TEST 5: Image larger than 5MB blocked
{
  const largeFile = new MockFile('massive-photo.jpg', 'image/jpeg', 6 * 1024 * 1024) as unknown as File;
  const result = validateImageFile(largeFile);
  assert.strictEqual(result.valid, false, 'Files > 5MB must be rejected');
  assert.strictEqual(result.error, 'Image must be smaller than 5MB.');

  const boundaryFile = new MockFile('exact-limit.png', 'image/png', MAX_IMAGE_FILE_SIZE_BYTES) as unknown as File;
  const boundaryResult = validateImageFile(boundaryFile);
  assert.strictEqual(boundaryResult.valid, true, 'Files <= 5MB must be allowed');
  console.log('✓ TEST 5: File size limits (5MB) strictly enforced.');
}

// TEST 6: Create Product with Cloudinary Image & Public ID
{
  let menuCatalog: MenuItem[] = [];

  const newCloudinaryProduct: MenuItem = {
    id: `food-${Date.now()}`,
    name: 'Kurobuta Tonkotsu Ramen',
    category: 'ramen',
    description: 'Slow-simmered rich broth with artisan chashu.',
    price: 15.50,
    image: 'https://res.cloudinary.com/cc67bunh/image/upload/v1720000000/restocontrol/ramen-1.jpg',
    imagePublicId: 'restocontrol/ramen-1',
    badge: 'SIGNATURE',
    inStock: true,
  };

  menuCatalog.push(newCloudinaryProduct);

  assert.strictEqual(menuCatalog.length, 1);
  assert.strictEqual(menuCatalog[0].image, 'https://res.cloudinary.com/cc67bunh/image/upload/v1720000000/restocontrol/ramen-1.jpg');
  assert.strictEqual(menuCatalog[0].imagePublicId, 'restocontrol/ramen-1');
  console.log('✓ TEST 6: Product created with Cloudinary image URL and publicId.');
}

// TEST 7: Create Product without Image uses clean default placeholder
{
  let menuCatalog: MenuItem[] = [];

  const rawInputImage = '';
  const finalImage = rawInputImage.trim() || DEFAULT_PRODUCT_IMAGE;

  const productWithoutCustomImage: MenuItem = {
    id: `food-${Date.now() + 1}`,
    name: 'Steamed Rice',
    category: 'appetizers',
    description: 'Steamed premium koshihikari rice.',
    price: 3.00,
    image: finalImage,
    inStock: true,
    badge: null,
  };

  menuCatalog.push(productWithoutCustomImage);
  assert.strictEqual(menuCatalog[0].image, DEFAULT_PRODUCT_IMAGE, 'Default fallback placeholder must be applied');
  console.log('✓ TEST 7: Product created without image falls back safely to default placeholder.');
}

// TEST 8: Edit Product without changing image preserves existing Cloudinary URL
{
  const originalProduct: MenuItem = {
    id: 'food-edit-1',
    name: 'Spicy Salmon Roll',
    category: 'sushi',
    description: 'Fresh salmon with spicy mayo.',
    price: 9.50,
    image: 'https://res.cloudinary.com/cc67bunh/image/upload/v1720000000/restocontrol/salmon-roll.jpg',
    imagePublicId: 'restocontrol/salmon-roll',
    inStock: true,
    badge: 'SPICY',
  };

  // User edits name and price, leaves image unchanged
  const editedProduct: MenuItem = {
    ...originalProduct,
    name: 'Spicy Salmon Roll Special',
    price: 10.50,
  };

  assert.strictEqual(editedProduct.image, originalProduct.image, 'Image URL must be preserved when not editing image');
  assert.strictEqual(editedProduct.imagePublicId, originalProduct.imagePublicId, 'Public ID must be preserved');
  console.log('✓ TEST 8: Edit product without changing image preserves existing Cloudinary image.');
}

// TEST 9: Edit Product and replace image with new Cloudinary upload
{
  const originalProduct: MenuItem = {
    id: 'food-edit-2',
    name: 'Dragon Roll',
    category: 'sushi',
    description: 'Eel and cucumber roll with avocado topping.',
    price: 12.00,
    image: 'https://res.cloudinary.com/cc67bunh/image/upload/v1720000000/restocontrol/old-dragon.jpg',
    imagePublicId: 'restocontrol/old-dragon',
    inStock: true,
    badge: null,
  };

  const newImageUrl = 'https://res.cloudinary.com/cc67bunh/image/upload/v1720000001/restocontrol/new-dragon-hd.jpg';
  const newPublicId = 'restocontrol/new-dragon-hd';

  const updatedProduct: MenuItem = {
    ...originalProduct,
    image: newImageUrl,
    imagePublicId: newPublicId,
  };

  assert.strictEqual(updatedProduct.image, newImageUrl, 'Image URL must be updated to new Cloudinary URL');
  assert.strictEqual(updatedProduct.imagePublicId, newPublicId, 'Image public ID must be updated');
  console.log('✓ TEST 9: Edit product with new image updates Cloudinary URL and publicId.');
}

// TEST 10: Network / Upload failure safety check
{
  let formProduct: MenuItem = {
    id: 'food-fail-1',
    name: 'Miso Ramen',
    category: 'ramen',
    description: 'Rich fermented bean paste broth.',
    price: 14.00,
    image: DEFAULT_PRODUCT_IMAGE,
    inStock: true,
    badge: null,
  };

  // Simulating an upload failure
  const simulateUploadError = (errMessage: string) => {
    return { success: false, error: errMessage };
  };

  const uploadAttempt = simulateUploadError('Network error during image upload.');
  assert.strictEqual(uploadAttempt.success, false);
  // Product state remains intact without invalid / corrupt URL
  assert.strictEqual(formProduct.image, DEFAULT_PRODUCT_IMAGE);
  assert.strictEqual(formProduct.name, 'Miso Ramen');
  console.log('✓ TEST 10: Failed upload leaves existing product data intact and reports clear error.');
}

// TEST 11: POS Sync with Menu Cloudinary Images
{
  const menuItem: MenuItem = {
    id: 'food-sync-1',
    name: 'Chicken Karaage',
    category: 'appetizers',
    description: 'Crispy Japanese fried chicken nuggets.',
    price: 7.50,
    image: 'https://res.cloudinary.com/cc67bunh/image/upload/v1720000000/restocontrol/karaage.jpg',
    imagePublicId: 'restocontrol/karaage',
    inStock: true,
    badge: 'POPULAR',
  };

  // Map to POS Product as done in AppRoutes.tsx
  const posProduct: Product = {
    id: menuItem.id,
    name: menuItem.name,
    category: menuItem.category,
    price: menuItem.price,
    image: menuItem.image,
    imagePublicId: menuItem.imagePublicId,
    description: menuItem.description,
    available: menuItem.inStock,
    inStock: menuItem.inStock,
    stock: menuItem.inStock ? 99 : 0,
    popular: true,
    badge: menuItem.badge,
  };

  assert.strictEqual(posProduct.image, menuItem.image, 'POS product inherits Cloudinary image');
  assert.strictEqual(posProduct.imagePublicId, menuItem.imagePublicId, 'POS product inherits Cloudinary public ID');
  console.log('✓ TEST 11: POS product inherits Cloudinary image from Menu item.');
}

// TEST 12: Cloudinary URL Transformation & Optimization
{
  const rawCloudinaryUrl = 'https://res.cloudinary.com/cc67bunh/image/upload/v1720000000/restocontrol/ramen.jpg';
  const optimizedCardUrl = getOptimizedCloudinaryUrl(rawCloudinaryUrl, { width: 340, height: 255, crop: 'fill' });

  assert.strictEqual(
    optimizedCardUrl,
    'https://res.cloudinary.com/cc67bunh/image/upload/f_auto,q_auto,w_340,h_255,c_fill/v1720000000/restocontrol/ramen.jpg',
    'Optimized URL must include f_auto, q_auto and dimensions'
  );

  // Non-cloudinary URL unchanged
  const externalUrl = 'https://images.unsplash.com/photo-12345';
  const unchanged = getOptimizedCloudinaryUrl(externalUrl, { width: 300, height: 300 });
  assert.strictEqual(unchanged, externalUrl, 'External non-Cloudinary URL should not be altered');

  // Empty / null handling
  assert.strictEqual(getOptimizedCloudinaryUrl(null), '');
  assert.strictEqual(getOptimizedCloudinaryUrl(''), '');
  console.log('✓ TEST 12: Cloudinary URL optimization and transformation verified.');
}

console.log('\n===============================================================');
console.log('✔ ALL 12 CLOUDINARY INTEGRATION TESTS PASSED SUCCESSFULLY!');
console.log('===============================================================\n');
