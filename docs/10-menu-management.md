# Step 8 — Menu Management (Step 8 Final Cleanup)

## Overview
Step 8 establishes the standardized Menu Management list view, Add Product modal, Edit Product modal, Delete Product confirmation workflow, Product Availability management, Category Management system, Multi-Faceted Search & Filtering, Device Image Selection, Single Product Name model, and Emoji-Free Category architecture ([`Menu.tsx`](file:///Users/mac/Documents/RestoControl/RestoControl/src/pages/dashboard/Menu.tsx) & [`QRMenu.tsx`](file:///Users/mac/Documents/RestoControl/RestoControl/src/pages/customer/QRMenu.tsx)).

---

## Final Step 8 Cleanup Specifications (Step 8H)

### 1. Device-Based Image Selection
- **File Input Picker**: Change from text URL input to device-based image selection (`<input type="file" accept="image/*">`).
- **No Image URL Input**: User selects files directly from device storage without pasting URLs or relying on cloud/external image hosting.
- **Image Preview**: Live thumbnail preview rendered immediately upon selection.
- **Image Manipulation**:
  - **Replace/Change Image**: Clickable button to trigger file picker and select a different image file.
  - **Remove/Cancel Image**: Clickable button to reset image selection.
- **File Type Validation**:
  - Validates `file.type.startsWith('image/')`.
  - Rejects non-image files (e.g. `.txt`, `.pdf`) with clear red error message: *"Invalid file type. Please select an image file (e.g. JPG, PNG, WEBP, GIF)."*
- **Architecture Compatibility**: Converts selected image file to base64 Data URL string via `FileReader.readAsDataURL()`, keeping full compatibility with client state and existing product thumbnails in Menu List, POS, and QR Menu.
- **Form Support**: Supported uniformly across **Add Product** and **Edit Product** modals.

### 2. Single Product Name & Japanese Name Removal
- **Single Name Model**: Products use a single `name` property (`MenuItem.name`).
- **Complete Japanese Name Cleanup**:
  - Removed `jpName` property from [`src/types/index.ts`](file:///Users/mac/Documents/RestoControl/RestoControl/src/types/index.ts), [`src/data/mockData.ts`](file:///Users/mac/Documents/RestoControl/RestoControl/src/data/mockData.ts), and test files.
  - Removed Japanese name input fields, placeholders, labels, and display `<p>` tags from Add Product, Edit Product, Grid View, and Table View.
  - Removed Japanese name search filtering logic.
  - Single dish name works cleanly across Menu List, Add Product, Edit Product, Delete Product, Product Availability, Search, POS, and Customer QR Menu.

### 3. Category Model & Emoji Removal
- **Simple & Professional Category Model**:
  ```typescript
  export interface Category {
    id: string;
    label: string;
  }
  ```
- **No Emoji / Icons**:
  - Removed `icon` field from `Category` interface and `CATEGORIES` data array.
  - Removed emoji picker, emoji grid, icon input, and automatic emoji logic from Add/Edit Category forms.
  - Add Category modal contains ONLY: **Category Name** input + action buttons.
  - Categories display cleanly as text labels without emojis across Menu List tabs, Category Management table, POS categories rail, and Customer QR Menu tabs.

---

## Menu List Architecture & Layout (Step 8A)

1. **Header & Summary Metrics Cards**:
   - Title: *"Menu Management"*
   - Subtitle: *"Browse, inspect, and monitor catalog products, categories, price points, and stock status."*
   - Live Stat Counters:
     - **Total Products**: Count of all catalog items (`menuItems.length`).
     - **In Stock**: Count of available products (`menuItems.filter(i => i.inStock).length`).
     - **Out of Stock**: Count of unavailable products (`menuItems.filter(i => !i.inStock).length`).
     - **Categories**: Total distinct categories count.

2. **Toolbar Controls**:
   - **Category Navigation Tabs**: Filters catalog by text category tabs (`All Items`, `Popular`, `Ramen`, `Sushi & Rolls`, `Appetizers`, `Drinks`).
   - **Real-Time Search Bar**: Reuses [`SearchBar`](file:///Users/mac/Documents/RestoControl/RestoControl/src/components/ui/SearchBar.tsx) for searching by product name, item ID, description, category, or ribbon badge/tag.
   - **View Switcher**: Toggle button group switching between **Grid View** (visual cards) and **Table View** (structured tabular list).

3. **Product Attribute Display**:
   - **Product Image**: High-res thumbnail with rounded border, item ID badge (e.g. `#D1`, `#D2`), and dimmed grayscale overlay for out-of-stock items.
   - **Product Name**: Bold primary dish name (`name`).
   - **Category Pill Badge**: Styled badge representing category (`ramen`, `sushi`, `appetizers`, `drinks`, `popular`).
   - **Ribbon Tag / Badge**: Special badges (`POPULAR`, `SPICY`, `SIGNATURE`, `CHEF PICK`, `VEGAN`, `LOW STOCK`).
   - **Formatted Price**: Standardized USD currency display (`formatPrice(price)` e.g. `$13.50`).
   - **Availability Status**:
     - `In Stock` (Emerald badge + green status indicator dot).
     - `Out of Stock` (Rose/Red badge + red status indicator dot).
   - **Actions**:
     - **Availability Toggle Action**: Quickly toggles product status (`Set Available` / `Set Unavailable`) protected by `<PermissionGate permission="products.update">`.
     - **Edit Action**: Opens Edit Product modal with pre-filled fields (protected by `<PermissionGate permission="products.update">`).
     - **Delete Action**: Triggers deletion confirmation modal with product name display (protected by `<PermissionGate permission="products.delete">`).
     - **Add Product Trigger**: Header button opening Add Product modal (protected by `<PermissionGate permission="products.create">`).
     - **Category Management Trigger**: Header button opening Category Management modal (protected by `<PermissionGate permission="menu.manage">`).

4. **Empty State Fallback**:
   - When no menu items match search/category filters (`filteredItems.length === 0`), renders reusable [`EmptyState`](file:///Users/mac/Documents/RestoControl/RestoControl/src/components/ui/EmptyState.tsx) component with an action button to clear active filters.

---

## Add Product Functionality & Validation Rules (Step 8B)

### 1. Form Fields & State Model
- **Product Name** (`name`, Required string): Main title of dish or drink.
- **Category** (`category`, Required string): Select dropdown (`ramen`, `sushi`, `appetizers`, `drinks`, `popular`).
- **Price** (`price`, Required number > 0): Formatted numeric price string converted to float.
- **Initial Stock** (`stock`, Optional number >= 0): Stock count integer default 10.
- **Description** (`description`, Optional string): Dish ingredients or flavor description.
- **Availability** (`inStock`, Boolean): Toggle status (`In Stock` / `Out of Stock`).
- **Popular Option** (`isPopular`, Boolean): Flag marking product as featured/popular.
- **Badge / Ribbon Tag** (`badge`, Optional string): Badge tag selection (`POPULAR`, `SPICY`, `SIGNATURE`, `CHEF PICK`, `VEGAN`).
- **Product Image**: Selected directly from device with live image preview and change/remove options.

### 2. Form Validation Rules
- **Product Name**: Must be non-empty (`!name.trim()`). Error: *"Product name is required"*.
- **Category**: Must be selected (`!category.trim()`). Error: *"Category is required"*.
- **Price**: Must be numeric and greater than $0.00 (`parseFloat(price) <= 0`). Error: *"Price must be greater than $0.00"*.
- **Stock**: Cannot be negative (`parseInt(stock) < 0`). Error: *"Stock cannot be negative"*.
- **Device Image**: Validates image MIME type (`file.type.startsWith('image/')`).

---

## Edit Product Functionality (Step 8C)

### 1. Data Pre-filling & Modal Controls
- **Edit Action Trigger**: Clicking the Edit icon button (`Pencil`) on any product card or table row populates the edit form state with current product attributes (`id`, `name`, `category`, `price`, `description`, `stock`, `inStock`, `isPopular`, `badge`, `image`).
- **Preserve Product ID**: Product ID (e.g. `food-1`) is strictly preserved; no duplicate product is created upon saving.
- **Device Image Editing**: Displays current product image preview with options to replace image from device or remove.

### 2. State & POS Synchronization
- **Immediate State Mutation**: Calling `onEditItem()` updates targeted product in global `menuItems` state array (`App.tsx`).
- **Immediate POS & QR Sync**: Updated name, category, price, stock, or image immediately reflect in POS order selection and Customer QR Menu.
- **RBAC Enforcement**: Edit action is wrapped in `<PermissionGate permission="products.update">`.

---

## Delete Product Functionality & Data Safety (Step 8D)

### 1. Delete Workflow & Confirmation Dialog
- **Delete Action Trigger**: Trash icon button (`Trash2`) prompts [`ConfirmDialog`](file:///Users/mac/Documents/RestoControl/RestoControl/src/components/ui/ConfirmDialog.tsx).
- **Target Display**: Confirmation dialog displays dish name and ID (e.g. *"Are you sure you want to delete 'Tonkotsu Ramen' (#D1)?"*).
- **Double-Submit Protection**: `isDeleting` state locks controls during execution.

### 2. Data Safety & Order Integrity
- **Catalog State Removal**: Confirming deletion calls `onDeleteItem()`, removing the product from active state.
- **Immediate POS & QR Menu Removal**: Deleted product cannot be selected for new POS orders or QR Menu carts.
- **Historical Order Integrity**: Existing order transaction records preserve item snapshots (`name`, `price`, `quantity`), ensuring historical reports remain uncorrupted.

---

## Product Availability Management (Step 8E)

### 1. Availability Toggle & Visual Indications
- **Toggle Action**: Single click on `Set Available` / `Set Unavailable` buttons on Grid card or Table row.
- **Visual Indications**:
  - `Available`: Green status dot, emerald badge ("In Stock"), full-color thumbnail image.
  - `Unavailable`: Red status dot, rose badge ("Out of Stock"), dimmed grayscale thumbnail overlay.
- **Attribute Preservation**: Toggles `inStock` boolean while strictly preserving Product ID, Name, Price, Category, and Description.

### 2. POS & Customer QR Menu Behavior
- **POS & QR Menu Block**: Unavailable products are disabled/blocked from being selected for new orders in POS and Customer QR Menu.
- **Live Restoration**: Setting status back to `Available` instantly restores selection capability across POS and QR Menu without page refresh.

---

## Category Management (Step 8F)

### 1. Simple Category Architecture
- **State Model**: Dynamic state array (`categories` in `App.tsx`).
- **Category Schema**: `id` (slug string e.g. `sushi`), `label` (name string e.g. `Sushi & Rolls`). No emojis or icon fields.
- **Product Counts**: Modal lists all categories with live assigned product count counters.

### 2. Add / Edit Category Validation
- **Required Name**: Empty category name is blocked (*"Category name is required"*).
- **Duplicate Name Rejection**: Rejects duplicate category names or slug IDs (*"A category with this name already exists"*).

### 3. Safe Deletion & Protection Rules
- **In-Use Category Protection**: Deleting a category containing active products is strictly **BLOCKED** with warning dialog (*"Cannot delete category because X product(s) currently use this category"*).
- **Empty Category Deletion**: Categories with 0 assigned products can be deleted safely after user confirmation.
- **Product Safety**: Deleting a category does NOT delete products or corrupt orders.

---

## Menu Search & Filters (Step 8G)

1. **Real-Time Search**: Instant filtering by product name, item ID (`#D1`), description, category, or ribbon badge.
2. **Category Tabs Filter**: Filters by category slug.
3. **Availability Filter**: Filters In Stock vs Out of Stock products.
4. **Popular Filter**: Filters Popular vs Regular products.
5. **Catalog Sorting**: Sorts by Name (A-Z, Z-A), Price (Low-High, High-Low), and Availability (In Stock First).
6. **Active Filter Bar & Reset**: Displays active filter tags with a single-click `Clear Filters` action button.

---

## Product Data Source & Interfaces

Products utilize the standardized source of truth `MenuItem` interface defined in [`src/types/index.ts`](file:///Users/mac/Documents/RestoControl/RestoControl/src/types/index.ts):

```typescript
export interface MenuItem {
  id: string;
  category: string;
  name: string;
  description: string;
  price: number;
  image: string;
  badge: string | null;
  tag?: string | null;
  inStock: boolean;
  rating?: number;
}

export type Product = MenuItem;

export interface Category {
  id: string;
  label: string;
}
```

---

## Testing & Verification Matrix

| Verification Test | Scope | Result |
| :--- | :--- | :---: |
| **Product Data Test Suite** | `npx tsx src/data/products.test.ts` (Steps 8A–8G & 8H) | ✅ PASS (100%) |
| **RBAC Permission Test Suite**| `npx tsx src/auth/permissions.test.ts` | ✅ PASS (100%) |
| **Device Image Selection** | File picker, base64 Data URL, image preview, replace/cancel image | ✅ PASS |
| **Invalid Image Handling** | Non-image files rejected with clear error message | ✅ PASS |
| **Single Product Name** | Single `name` field across List, Add, Edit, Delete, Search, POS, QR | ✅ PASS |
| **Japanese Name Removal** | `jpName` completely removed from types, state, UI, and search | ✅ PASS |
| **Emoji-Free Category** | Category model uses `id` and `label` ONLY without emoji icons | ✅ PASS |
| **Category Management** | Add, Edit, Reject Empty, Reject Duplicate, Safe Delete | ✅ PASS |
| **Product Availability** | Toggle In Stock / Out of Stock, POS & QR Menu selection block | ✅ PASS |
| **Search & Filters** | Real-time search, category tabs, stock filter, popular filter, sorting | ✅ PASS |
| **POS & QR Menu Sync** | Live state synchronization across all views | ✅ PASS |
| **TypeScript / Lint** | `npm run lint` (`tsc --noEmit`) | ✅ PASS (0 errors) |
| **Production Build** | `npm run build` (`vite build`) | ✅ PASS (164ms) |

---

## Status
**STEP 8 COMPLETE — FINAL PRODUCT & CATEGORY UI CLEANUP VERIFIED**
