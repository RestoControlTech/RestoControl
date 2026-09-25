# 11 — Sales Management Architecture (Steps 9A, 9B & 9C)

This document specifies the technical architecture, data model, user interface, and integration points for the **Sales List / Sales History** (Step 9A), **Sale Details** (Step 9B), and **Sale Receipt** (Step 9C) subsystems in RestoControl.

---

## 1. Overview & Goal

The Sales History module provides administrative staff and restaurant managers with an audit-ready, real-time ledger of completed restaurant transactions. It reflects customer sales originating from POS terminal workstations, table QR ordering sessions, and takeaway orders.

### Core Principles
- **No Redundant Models**: The `Sale` entity is directly aliased to and backward-compatible with the core `Transaction` model (`export type Sale = Transaction`).
- **Completed Sales Definition**: Sales strictly represent finalized, paid transactions (`status: 'Receipt' | 'Completed' | 'Refunded'`). Kitchen tickets in draft, preparation, or cancelled states are managed separately within the Orders queue and are never classified as completed sales.
- **Dual Currency Support (USD & KHR)**: Financial amounts are dynamically formatted depending on transaction currency (USD formatted with `$XX.XX`, KHR formatted with `XX,XXX ៛`).
- **Thermal Receipt Layout**: Dedicated, POS-friendly 80mm printable layout with branding, itemized table, tender breakdown, and clean browser print triggers.
- **Read-Only Receipt**: Protects transaction records from accidental modification.
- **Zero Backend Dependency**: State operates deterministically in memory, populated initially from mock data and updated reactively when orders are submitted.
- **RBAC Governed**: Route access and export capabilities are governed by the existing `sales.view` permission (granted to Administrators, restricted from Staff).

---

## 2. Sale Data Model

The `Transaction` interface in `src/types/index.ts` was extended with optional fields to provide rich sales metadata while preserving 100% backward compatibility:

```typescript
export type PaymentMethod = 'Cash' | 'Credit Card' | 'Debit Card' | 'QR Code' | 'Digital Wallet';

export interface SaleItem {
  id?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal?: number;
}

export interface Transaction {
  id: string;
  orderNumber: string;
  dateTime: string;
  table: string;
  type: 'Dine-in' | 'Takeaway';
  amount: number;
  status: 'Receipt' | 'Completed' | 'Refunded';
  paymentMethod?: PaymentMethod | string;
  customerName?: string;
  currency?: string;
  items?: SaleItem[];
  itemSummary?: string;
  subtotal?: number;
  tax?: number;
  cashReceived?: number;
  change?: number;
  amountPaid?: number;
  paymentStatus?: 'Paid' | 'Refunded' | 'Pending';
  notes?: string;
}

export type Sale = Transaction;
```

---

## 3. Sales List User Interface (Step 9A)

The Sales History page (`src/pages/dashboard/Sales.tsx`) provides:

### A. Live KPI Analytics
- **Total Revenue**: Dynamically calculated sum of all non-refunded completed sales.
- **Completed Sales**: Real-time count of fulfilled orders.
- **Average Order Value (AOV)**: Revenue divided by total completed order count.

### B. Filter & Search Toolbar
- **Date Filter Tabs**: Quick segment selection (`Today`, `Yesterday`, `Last 7 Days`, `Month`).
- **Omni-Search Bar**: Real-time filtering by Order #, Transaction ID, Table, Order Type, Customer Name, Payment Method, and Items.
- **Future-Ready Architecture**: Prepared state variables for Payment Method and Order Type dropdown filtering.

### C. Completed Sales Table
The table presents the following columns:
1. **Sale / Order #**: Primary receipt identifier (`#TX-9042`) and internal transaction ID (`#TX-1`).
2. **Date & Time**: Timestamp of sale completion (`Oct 24, 19:42`).
3. **Type & Table**: Fulfillment format (`Dine-in` / `Takeaway`) paired with assigned table (`Table 09` / `Pickup`).
4. **Customer**: Guest or customer name (`Kenji Sato`, `Walk-in Guest`).
5. **Items Summary**: Human-readable digest of ordered dishes and counts.
6. **Payment Method**: Visual payment badge with icons for `Credit Card`, `Cash`, `QR Code`, and `Digital Wallet`.
7. **Total**: Formatted currency amount with dynamic currency code (`$33.50 USD` or `82,000 ៛ KHR`).
8. **Status**: High-contrast status pill (`Completed` in emerald badge, `Refunded` in red badge).
9. **Actions**: Action buttons for "View details" (`Eye` icon) and "Print / View Receipt" (`Printer` icon).

---

## 4. Sale Details Modal (Step 9B)

Clicking any row or the view button triggers `SaleDetailModal` (`src/components/sales/SaleDetailModal.tsx`), which renders an itemized, comprehensive breakdown:

### A. Sale & Order Information
- **Order Identifier**: Sale / Order number (`#TX-9042`) and internal system ID.
- **Date & Time**: Full timestamp of payment completion.
- **Order Status Badge**: High-contrast badge indicating `Completed`, `Paid (Receipt)`, or `Refunded`.
- **Order Type**: Fulfillment format (`Dine-in` with table assignment or `Takeaway`).
- **Table / Location**: Assigned table number (`Table 09`) or `Pickup`.
- **Customer**: Customer/guest name (`Kenji Sato` or `Walk-in Guest`).

### B. Purchased Items
Itemized table displaying:
- **Product Name**: Display name of each dish ordered.
- **Quantity**: Units purchased.
- **Unit Price**: Individual price formatted in sale currency.
- **Line Total**: Subtotal per line item (`quantity × unitPrice`).
- If itemized records are absent, gracefully falls back to the human-readable `itemSummary`.

### C. Financial Information
- **Subtotal**: Pre-tax total of all items.
- **Tax / Service**: Tax is displayed ONLY when present and non-zero (`sale.tax > 0`). No phantom service charge is added as it is not used in RestoControl.
- **Total**: Final transaction total formatted in the transaction currency.

### D. Payment Information
- **Payment Method**: Method used (`Cash`, `Credit Card`, `QR Code`, `Digital Wallet`) with representative icon.
- **Payment Status**: `Paid`, `Refunded`, or `Pending`.
- **Currency**: Explicit currency designation (`USD ($)` or `KHR (៛)`).
- **Amount Paid**: Actual tender paid.
- **Cash Received & Change Returned**: When payment method is `Cash` and values are defined, explicitly displays:
  - Cash Received (e.g. `$30.00` or `100,000 ៛`)
  - Change Returned (e.g. `$6.50` or `18,000 ៛`)

### E. Actions & Receipt Transition
- A "Back to Sales History" button to dismiss the modal.
- A "Print Receipt" button that seamlessly transitions the user to the printable receipt view.

---

## 5. Sale Receipt & Printing Architecture (Step 9C)

`SaleReceiptModal` (`src/components/sales/SaleReceiptModal.tsx`) provides an authentic, read-only thermal POS receipt layout.

### A. Receipt Layout & Content
1. **Header & Branding**:
   - Monogram logo container (Orange icon with "K").
   - Restaurant Name: `Kuro Bistro`.
   - Contact info: `Phnom Penh, Cambodia · Tel: +855 23 987 654`.
   - Dashed horizontal divider.
2. **Transaction Information**:
   - Receipt Number (`#TX-9042`).
   - Timestamp (`Oct 24, 19:42`).
   - Order Type (`Dine-in` / `Takeaway`).
   - Table Number (`Table 09` or `Pickup`).
   - Customer Name (`Kenji Sato` or `Walk-in Guest`).
   - Payment Status Badge (`PAID` / `REFUNDED`).
   - Dashed horizontal divider.
3. **Itemized Items Table**:
   - 4-column compact table: `Item`, `Qty`, `Price`, `Total`.
   - Formatted in the transaction currency.
   - Dashed horizontal divider.
4. **Financial & Payment Breakdown**:
   - Subtotal (`formatPrice(subtotal, currency)`).
   - Tax (displayed only if `tax > 0`).
   - Bold Total Amount (`formatPrice(amount, currency)`).
   - Payment Method (`Cash`, `Credit Card`, `QR Code`, `Digital Wallet`).
   - Amount Paid (`formatPrice(amountPaid, currency)`).
   - Cash Tendered and Change Given (for cash transactions).
   - Dashed horizontal divider.
5. **Footer**:
   - Friendly greeting: *"Thank you for dining with us! Please retain receipt for your records."*
   - Order barcode representation: `*TX-9042*`.

### B. Currency Handling (USD & KHR)
Both receipt views utilize `formatPrice` and `formatCurrency` in `src/utils/format.ts`:
- **USD Transactions**: `$XX.XX` (e.g. `$33.50`, `-$18.00`).
- **KHR Transactions**: `XX,XXX ៛` (e.g. `82,000 ៛`, `100,000 ៛`, `18,000 ៛`).
- No separate or secondary currency formatting utility was introduced.

### C. Browser Print Behavior
- Printable receipt styling is scoped with `@media print`:
  ```css
  @media print {
    body * { visibility: hidden !important; }
    #printable-receipt, #printable-receipt * { visibility: visible !important; }
    #printable-receipt {
      position: fixed !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      max-width: 80mm !important;
      margin: 0 auto !important;
      padding: 12px !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: monospace, sans-serif !important;
    }
    .no-print { display: none !important; }
  }
  ```
- Clicking **"Print Receipt"** triggers standard `window.print()` without requiring third-party libraries, external printing drivers, or cloud services.
- Modal action buttons are flagged with `.no-print` to exclude UI controls from the printed slip.

---

## 6. POS & Kitchen Integration

Whenever front-of-house staff or customers finalize an order in the POS or QR Menu interface (`handleSendOrderToKitchen` in `src/App.tsx`), a new `Transaction` record is prepended to the reactive state:

```typescript
const newTx: Transaction = {
  id: `tx-${Date.now()}`,
  orderNumber: `#TX-${9000 + Math.floor(Math.random() * 900)}`,
  dateTime: 'Just Now',
  table: activeTableQRName || 'Table 01',
  type: 'Dine-in',
  amount: total,
  status: 'Receipt',
  paymentMethod: 'QR Code',
  customerName: 'Table Guest',
  currency: 'USD',
  amountPaid: total,
  paymentStatus: 'Paid',
  itemSummary: `${itemsCount} item(s)`,
  subtotal: total * 0.9,
  tax: total * 0.1,
};
setTransactions(prev => [newTx, ...prev]);
```

---

## 7. RBAC System Integration

Sales visibility is strictly governed by the permission system (`src/auth/permissions.ts`):
- **Administrator Role**: Contains `sales.view` permission. Full access to `/sales` route, summary KPI metrics, sales table, details modal, receipt modal, and CSV export action.
- **Staff Role**: Does NOT contain `sales.view`. Accessing `/sales` redirects to the Unauthorized view (`/access-denied`). Navigation link is hidden from the sidebar.

---

---

## 9. Sales Filtering & Date Range Calculations (Step 9D)

Step 9D introduces multi-attribute filtering and date range calculations into Sales History without mutating sale records:

### A. Dedicated Component Architecture (`SalesFilters.tsx`)
Located at `src/components/sales/SalesFilters.tsx`, this component encapsulates:
- **Date Range Preset Tabs**: `All Time`, `Today`, `Yesterday`, `This Week`, `This Month`, `Custom`.
- **Custom Date Range Inputs**: When `Custom` is selected, renders HTML5 date pickers for `From (Start Date)` and `To (End Date)`. Displays an inline error badge if the start date is after the end date.
- **Search Bar**: Live text search across order number, transaction ID, customer name, table number, order type, status, payment method, and item summaries.
- **Dropdown Filters**:
  - **Payment Method**: `All Payment Methods`, `Credit Card`, `Cash`, `QR Code`, `Digital Wallet`.
  - **Order Type**: `All Order Types`, `Dine-in`, `Takeaway`.
  - **Status**: `All Statuses`, `Paid / Completed`, `Refunded`.
- **Clear Filters Button**: Appears with `RotateCcw` icon when any filter or query is active, resetting all parameters to defaults.
- **Active Filter Badges**: Badges indicating active filter criteria alongside total matching sales count.

### B. Date Range Calculation Engine (`src/utils/dateUtils.ts`)
To prevent fragile string comparisons (e.g. `"10/01/2026" > "09/30/2026"`), date handling was centralized in `src/utils/dateUtils.ts`:
- **`parseSaleDate(input, refDate)`**: Normalizes multiple date representations into native `Date` objects:
  - `Just Now` -> `new Date(refDate)` (current instant)
  - `MMM DD, YYYY, HH:mm` or `MMM DD, HH:mm` (defaults year to `refDate.getFullYear()`)
  - ISO date/datetime strings
  - Unix timestamps (seconds or milliseconds)
  - Existing `Date` objects
- **`getDateRangeForPreset(preset, options)`**:
  - `today`: `00:00:00.000` to `23:59:59.999` of reference date.
  - `yesterday`: `00:00:00.000` to `23:59:59.999` of `refDate - 1 day`.
  - `week`: Monday `00:00:00.000` to Sunday `23:59:59.999` of the active week.
  - `month`: 1st day `00:00:00.000` to last day `23:59:59.999` of the active month.
  - `custom`: Parses `customStart` (00:00:00.000) and `customEnd` (23:59:59.999).
  - `all`: Returns `null` (no date boundary restriction).
- **`isDateInRange(dateInput, range, refDate)`**:
  - Compares timestamps via `>= range.start.getTime() && <= range.end.getTime()`.
  - Safely returns `false` if `range.start > range.end` (inverted range).
  - Supports ranges crossing calendar months and years.
  - Correctly includes transactions occurring exactly at the start boundary (`00:00:00.000`) or end boundary (`23:59:59.999`).

### C. Case-Insensitive Sales Search Engine (`src/utils/salesSearch.ts`)
The `matchesSaleSearch(tx, rawQuery)` utility provides responsive, unified search across multiple sale attributes:
- **Sale / Order Number**: Matches raw `#TX-9042`, stripped `TX-9042`, numeric substring `9042`, or `ORD-001`.
- **Customer Name**: Case-insensitive substring matching against `customerName` (e.g. `Kenji`, `Sarah Connor`, `Dara`).
- **Table Assignment**: Matches table names (e.g. `Table 09`, `Pickup`) and intelligently normalizes leading zeroes so queries like `table 2` match `Table 02`.
- **Product & Dish Names**: Performs deep inspection across both `tx.itemSummary` and itemized `tx.items[].name` records (e.g. `salmon` matches `Spicy Salmon Roll` and `Salmon Sashimi`).
### D. Unified Sales Filtering Pipeline (`src/utils/salesFilters.ts`)
The `filterSales(sales, criteria)` function serves as the single source of truth for all sales filtering:
- **Strict AND Conjunction**: A transaction is displayed if and only if it matches all active filters simultaneously:
  $$\text{Visible} = \text{DateMatch} \land \text{SearchMatch} \land \text{PaymentMatch} \land \text{TypeMatch} \land \text{StatusMatch}$$
- **Granular Filter Reset**:
  - **Individual Filter Badges**: Each active filter pill contains an `X` dismiss trigger to clear only that specific constraint (e.g., clearing `Payment: Credit Card` without resetting search or date range).
  - **Global Reset**: Clicking `Clear Filters` resets all filters and search input back to defaults (`All Time`, no search, all methods/types/statuses).
- **Zero-Result Handling**: Displays `<EmptyState />` with custom messaging whenever filter combinations produce zero matches, with no dummy or placeholder records injected.

---

## 10. Verification & Testing Results

The automated test suites (`src/data/sales9A.test.ts`, `src/data/sales9B.test.ts`, `src/data/sales9C.test.ts`, and `src/data/sales9D.test.ts`) verified all requirements:
- **1. Sales List Load**: Verified 8 mock completed transactions loaded.
- **2. Sale Details**: Verified modal payload and fields.
- **3. Receipt Mapping**: Verified `#TX-9042` maps accurately to receipt data.
- **4. Items & Quantities**: Verified product names, quantities, unit prices, line totals.
- **5. Financial Accuracy**: Verified subtotal, tax handling, total calculation; confirmed no service charge added.
- **6. Payment Details**: Verified payment method, payment status, amount paid, cash received, and change returned.
- **7. USD Formatting**: Verified `$XX.XX` display.
- **8. KHR Formatting**: Verified `XX,XXX ៛` display with thousand separators.
- **9. Print Trigger**: Verified print styles and `window.print()` trigger contract.
- **10. POS Sync**: Verified simulated order additions prepend cleanly to the sales history.
- **11. RBAC**: Verified `sales.view` is granted to Admin and denied to Staff.
- **12. Regression Check**: Verified Step 8 Menu management retains 100% integrity (12 items, 6 categories, no emojis, no `jpName`).
- **13. Step 9D-1 Multi-Attribute Filters**:
  - Payment method filter: Verified Cash, Credit Card, QR Code.
  - Order type filter: Verified Dine-in vs Takeaway.
  - Status filter: Verified Paid vs Refunded.
  - Attribute combination: Verified combined attribute matching.
  - Zero-match scenario: Verified empty state triggers correctly.
- **14. Step 9D-2 Date Range Calculations**:
  - `Today` filter: Verified matching today's transactions.
  - `Yesterday` filter: Verified boundary isolation.
  - `This Week` filter: Verified Monday to Sunday boundary.
  - `This Month` filter: Verified 1st to 31st boundary.
  - `Custom Date Range`: Verified `customStart` to `customEnd`.
  - `Same Start/End Date`: Verified full-day inclusion (`00:00:00` to `23:59:59.999`).
  - `Start Date after End Date`: Verified safe return of 0 matches.
  - `Start Boundary`: Verified inclusive timestamp (`00:00:00.000`).
  - `End Boundary`: Verified inclusive timestamp (`23:59:59.999`).
  - `Empty Results`: Verified zero matching sales behavior.
  - `Crossing Months & Years`: Verified multi-month and year-turnover ranges.
  - `Combined Filters`: Verified Date Range + Payment + Order Type.
  - `Just Now`: Verified real-time POS transaction inclusion in Today filter.
- **15. Step 9D-3 Sales Search**:
  - `Search by Sale/Order Number`: Verified `#TX-9042`, `TX-9042`, `9042`.
  - `Search by Customer`: Verified matching `Sarah Connor`, `Kenji Sato`.
  - `Search by Table`: Verified matching `Table 09` and normalized `Table 2` matching `Table 02`.
  - `Search by Product`: Verified `Salmon` finding both `Spicy Salmon Roll` and `Salmon Sashimi 5pc`.
  - `Case-Insensitive Search`: Verified `KENJI SATO` vs `kenji sato`.
  - `Partial Search`: Verified `904` matching multiple sales.
  - `No-Match Search`: Verified `nonexistent-query-xyz` returning 0 records and triggering clean empty state.
  - `Search + Payment Filter`: Verified search with `Credit Card`.
  - `Search + Order Type Filter`: Verified search with `Dine-in`.
  - `Search + Date Range`: Verified search with `Today` range.
  - `Search + Multiple Filters`: Verified cooperative execution with 5 simultaneous filter constraints.
  - `Empty Search`: Verified empty/whitespace query returns all completed records.
- **16. Step 9D-4 Combined Search & Filter Combinations & Edge Cases**:
  - Verified 20 targeted filter combinations:
    1. Search + Payment
    2. Search + Order Type
    3. Search + Status
    4. Search + Date
    5. Payment + Order Type
    6. Payment + Status
    7. Payment + Date
    8. Order Type + Status
    9. Order Type + Date
    10. Status + Date
    11. Search + Payment + Order Type
    12. Search + Payment + Status
    13. Search + Payment + Date
    14. Search + Order Type + Date
    15. Search + Status + Date
    16. Payment + Order Type + Status
    17. Payment + Order Type + Date
    18. Payment + Status + Date
    19. Order Type + Status + Date
    20. Search + Payment + Order Type + Status + Date (All 5 active simultaneously)
  - Verified Edge Cases:
    - No filters active (returns full dataset)
    - Empty and whitespace search
    - No matching combinations (returns 0 records cleanly)
    - Invalid date ranges (start > end returns 0 records safely)
    - Same start/end date full-day inclusion
    - Multiple conflicting filters
    - Clearing one filter restores matching results immediately
    - Global reset restores 100% of completed transaction ledger
  - **Total Step 9D Assertions**: 64/64 passed.

---

## 11. Step 9D Final Verification & Quality Summary (Step 9D-5)

Final inspection and hardening of the complete Sales filtering system confirmed:
1. **Single Source of Truth**: Unified filtering logic in `src/utils/salesFilters.ts` consumed identically by both UI (`Sales.tsx`) and testing pipelines (`sales9D.test.ts`).
2. **Zero Mutation**: Original dataset (`TRANSACTIONS_DATA` / `completedSales`) remains 100% immutable throughout all filtering operations.
3. **Zero Fake Records**: Filtering strictly gates existing finalized sales (`Receipt`, `Completed`, `Refunded`); no mock records are dynamically fabricated.
4. **Clean Code & Performance**:
   - Zero unused imports or variables.
   - Strict TypeScript typing across all criteria interfaces and boundary parsing.
   - Optimized `useMemo` hooks preventing unnecessary layout re-renders.
   - 100% passing test suites across all 4 sub-steps (64/64 assertions).
5. **Granular Usability**: Both individual filter pill dismissal (`X` trigger) and global filter reset ("Clear Filters" button) work seamlessly.

---

## 12. Step 9E — Complete Sales Summary & KPI Analytics

Step 9E implements the full Sales Summary system, covering Revenue, Completed Sales Count, Cost, Profit, Payment Method Summary, Order Type Summary, and comprehensive filter integration.

### A. Sales Summary Data Model & Calculation Utility
Implemented in `src/utils/salesSummary.ts`:
```typescript
export interface PaymentSummaryItem {
  method: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface OrderTypeSummaryItem {
  type: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface SalesSummaryData {
  totalRevenue: number;
  completedCount: number;
  averageOrderValue: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
  hasCostData: boolean;
  paymentSummary: PaymentSummaryItem[];
  orderTypeSummary: OrderTypeSummaryItem[];
}
```

### B. Sub-Step Implementation Details

#### 1. Step 9E-1: Revenue Summary
- Sums all positive amounts from completed, paid sales (`status !== 'Refunded' && paymentStatus !== 'Refunded'`).
- Strictly excludes refunded transactions and draft/cancelled orders.
- Safely produces `totalRevenue = 0` when the filtered sales dataset is empty.

#### 2. Step 9E-2: Sales Count & AOV
- `completedCount`: Accurate count of paid sales.
- `averageOrderValue`: Dynamically calculated as `totalRevenue / completedCount`, safely returning `0` on zero sales to prevent `NaN` or division-by-zero.

#### 3. Step 9E-3: Cost Calculation
- **Data Model Inspection**: Inspected `MenuItem`, `SaleItem`, and `Transaction` models in `src/types/index.ts` and `src/data/mockData.ts`. An actual `cost` or `cogs` field did not exist in the initial schema.
- **Architectural Solution**: Extended `SaleItem` with optional `cost?: number`.
- **Calculation Formula**: `Total Cost = sum(product cost * quantity)` for all items with defined costs in paid transactions.
- **Missing Data Handling**: When items lack cost fields (as in the default mock dataset), `totalCost` evaluates cleanly to `$0.00` and `hasCostData` is set to `false`.

#### 4. Step 9E-4: Profit Calculation
- **Formula**: `Profit = Revenue - Cost`.
- **Mathematical Invariant**: `profit === totalRevenue - totalCost` is verified across all states.
- **Profit Margin**: Calculated as `(profit / totalRevenue) * 100`, safely returning `0%` when revenue is 0.

#### 5. Step 9E-5: Payment Summary Breakdown
- Predefined methods: `Cash`, `Credit Card`, `QR Code`, `Digital Wallet` (plus any dynamic methods).
- For each method, provides transaction count, revenue amount, and percentage share.
- **Mathematical Invariant**: Sum of all payment breakdown revenues strictly equals `totalRevenue`.

#### 6. Step 9E-6: Order Type Summary Breakdown
- Predefined types: `Dine-in`, `Takeaway`.
- For each order type, provides transaction count, revenue amount, and percentage share.
- **Mathematical Invariant**: Sum of all order type breakdown revenues strictly equals `totalRevenue`.

#### 7. Step 9E-7: Date-Aware Summary
- Derives all summary metrics from the same date-filtered subset from `filterSales` and `dateUtils.ts`.
- Handles `Today`, `Yesterday`, `This Week`, `This Month`, `Custom Date Range`, same-day boundaries, cross-month ranges, and cross-year ranges without duplicate date logic.

#### 8. Step 9E-8: Filter Integration
- All summary metrics derive from ONE filtered dataset produced by `src/utils/salesFilters.ts`.
- Cooperative `AND` filtering across Search, Payment Method, Order Type, Status, and Date Range.
- Zero results return `0` across all KPI metrics and breakdowns without exceptions.

### C. UI Architecture (`SalesSummary.tsx`)
Extracted into `src/components/sales/SalesSummary.tsx`:
1. **Primary KPI Grid (4 Cards)**:
   - Filtered / Total Revenue
   - Filtered / Completed Sales Count
   - Total Cost (with COGS status badge)
   - Net Profit (with dynamic profit margin %)
2. **Breakdowns Grid (2 Cards)**:
   - **Payment Summary**: Lists each method with icon, count, formatted revenue, and percentage progress bar.
   - **Order Type Summary**: Lists Dine-in vs Takeaway with icons, counts, formatted revenues, and percentage progress bars.

### D. Step 9E Test Verification Results (`sales9E.test.ts`)
All 17 test suites and mathematical invariants passed:
1. **Revenue**: Verified single and multiple paid sales, excluding refunds.
2. **Sales Count**: Verified count updates with filters and matches applicable sales.
3. **Cost Calculation**: Verified `sum(cost * quantity)` for single, multiple, and quantity > 1 items.
4. **Profit Calculation**: Verified `Profit === Revenue - Cost` and profit margin calculation.
5. **Payment Summary**: Counts and revenues verified by payment method; sum strictly equals total revenue.
6. **Order Type Summary**: Counts and revenues verified for Dine-in and Takeaway; sum strictly equals total revenue.
7. **Zero Results**: Verified all metrics safely return 0 without NaN or exceptions.
8. **Search-Filtered Summary**: Verified search query metrics and breakdown synchronization.
9. **Payment-Filtered Summary**: Verified isolated payment method metrics (100% allocation).
10. **Order-Type-Filtered Summary**: Verified isolated order type metrics (100% allocation).
11. **Status-Filtered Summary**: Verified Paid vs Refunded separation.
12. **Date-Filtered Summary**: Verified date ranges (Today, Yesterday, Custom).
13. **Combined Filters**: Verified 5 simultaneous filters active together and zero-match conflict resolution.
14. **Reset Filters**: Verified clearing filters restores 100% of baseline summary metrics.
15. **Same-Day Range**: Verified full-day 00:00:00 to 23:59:59.999 inclusion.
16. **Cross-Month Range**: Verified multi-month range calculations.
17. **Cross-Year Range**: Verified cross-year turnover calculations.
18. **Mathematical Invariants & Immutability**:
    - `Profit = Revenue - Cost` verified.
    - `Payment breakdown total = filtered revenue` verified.
    - `Order-type breakdown total = filtered revenue` verified.
    - `Sales count = number of applicable completed sales` verified.
    - Source transactions data immutability verified.

---

---

## 13. Step 9F-1 — Refund Data Model & Business Rules

Step 9F-1 inspects and establishes the core refund/return data structures, relationships, and 10 business rules prior to UI modal implementation.

### A. Existing Project Inspection & Findings
1. **Existing Transaction Structure**:
   - `Transaction` already defined `status: 'Receipt' | 'Completed' | 'Refunded'` and `paymentStatus: 'Paid' | 'Refunded' | 'Pending'`.
   - In `src/data/mockData.ts`, `tx4` represented an existing refund with negative amount (`amount: -18.00`, `status: 'Refunded'`, `paymentStatus: 'Refunded'`, `items: [{ name: 'Matcha Parfait', quantity: 2, unitPrice: 9.00, subtotal: 18.00 }]`).
   - `SaleDetailModal` and `SaleReceiptModal` already rendered red badges and negative amounts when `isRefund` is true.
   - `salesFilters.ts` already supported filtering by `status: 'paid'` and `status: 'refunded'`.
   - `salesSummary.ts` already excluded refunded transactions from gross paid revenue.
2. **Missing Information & Gaps Identified**:
   - No reference connecting refund reversal records to original sales (no `originalTransactionId` or `originalOrderNumber`).
   - No tracking of previously refunded quantities per item (`refundedQuantity`).
   - No tracking of cumulative refunded amounts on sales (`refundedAmount`).
   - No formal request/validation interfaces or business rule validation engine.
   - Zero backend/database table exists; all operations run deterministically in memory.

### B. Extended Refund Data Model (`src/types/index.ts`)
To eliminate duplicate models and maintain 100% backward compatibility, existing interfaces were extended with optional fields:
```typescript
export interface SaleItem {
  id?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal?: number;
  cost?: number;
  refundedQuantity?: number; // Cumulative refunded count for this item
}

export interface RefundItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  originalItemId?: string;
}

export interface RefundRequestItem {
  name: string;
  quantity: number;
  unitPrice?: number;
}

export interface RefundRequest {
  items: RefundRequestItem[];
  reason?: string;
  customAmount?: number;
}

export interface Transaction {
  // ... existing fields ...
  originalTransactionId?: string; // Links refund transaction to original sale
  originalOrderNumber?: string;   // Links refund to original order identifier
  refundedAmount?: number;        // Cumulative refunded dollar/currency amount
  refundReason?: string;          // Audit note / reason for refund
}
```

### C. 10 Core Refund Business Rules & Validation Engine (`src/utils/refundRules.ts`)
The validation engine rigorously enforces the 10 business rules:
1. **Rule 1 (Sale Eligibility)**: Only completed/paid sales (`status === 'Completed' | 'Receipt'` and `paymentStatus === 'Paid'`) with remaining refundable balance can be refunded. Already refunded sales are blocked.
2. **Rule 2 (Quantity Limit)**: `refundQuantity <= remainingQuantity` (cannot exceed quantity originally sold).
3. **Rule 3 (Positive Quantity)**: `refundQuantity > 0` (zero or negative quantities are rejected).
4. **Rule 4 (Non-Negative Amount)**: Refund amount must be `>= 0` (negative amounts rejected).
5. **Rule 5 (No Double-Refund)**: An item whose remaining refundable quantity is 0 cannot be refunded again.
6. **Rule 6 (Partial Refund Support)**: Supports refunding a subset of items (e.g. 1 out of 2 bowls) or partial order value.
7. **Rule 7 (Total Quantity Bound)**: `(alreadyRefundedQuantity + requestedQuantity) <= originalQuantity`.
8. **Rule 8 (Amount Limit)**: Total refund amount must not exceed `remainingRefundableAmount = sale.amount - (sale.refundedAmount || 0)`.
9. **Rule 9 (Sale Relationship)**: Reversal records must reference `originalTransactionId` and `originalOrderNumber`.
10. **Rule 10 (Item Relationship)**: Refund line items must reference valid items matching the original sale.

### E. Step 9F-3 — Partial Refund Workflow Implementation

Step 9F-3 delivers the end-to-end partial refund workflow:

#### 1. Quantity & Amount Calculation Engine
Implemented in `src/utils/refundRules.ts`:
- `getItemRefundDetails(item: SaleItem)`: Returns `{ originalQuantity, alreadyRefunded, remaining }`.
- `calculatePartialRefundAmount(item: SaleItem, quantity: number)`: Computes exact line refund amount (`unitPrice * quantity`).
- `applyPartialRefundToSale(sale: Transaction, request: RefundRequest)`:
  - Validates requested item quantities against remaining available balances.
  - Updates `item.refundedQuantity` and `sale.refundedAmount` immutably.
  - Generates a linked reverse refund transaction (`amount: -refundAmount`, `status: 'Refunded'`, `paymentStatus: 'Refunded'`, referencing `originalTransactionId` and `originalOrderNumber`).
  - Transitions `updatedSale.status` to `'Refunded'` once all line items or the entire sale amount have been refunded.

#### 2. User Interface (`PartialRefundModal.tsx`)
- Triggered directly from `SaleDetailModal` via the "Issue Refund" button (shown only for refund-eligible sales).
- Shows live breakdown per item:
  - Original sold quantity.
  - Already refunded quantity with rose badge indicator.
  - Remaining refundable quantity.
  - Interactive stepper buttons (`-` and `+`) constrained between 0 and `remaining`.
  - Item refund subtotal.
  - "Fully Refunded" badge with disabled controls when remaining equals 0.
- Summary bar:
  - Dynamic total refund amount.
  - Selected item count.
  - Remaining refundable balance.
  - Reason / audit note input field.
  - Confirm Refund button displaying exact refund sum.

#### 3. State Consistency & Multiple Partial Refunds
- Supports consecutive partial refunds (e.g. 5 -> refund 2 -> remaining 3 -> refund 1 -> remaining 2).
- Handles multiple items independently: refunding one item does not affect the remaining quantity of another.
- Prepends the reversal transaction to the sales list while updating the original sale immutably.
- Automatically refreshes the Sales History table, Sales Filters, and Live KPI Summary.

#### 4. Step 9F-3 Test Verification Results (`sales9F.test.ts`)
All 14 partial refund test suites passed:
1. **Refund 1 of 5 items**: Correctly validated and remaining updated to 4.
2. **Refund 2 of 5 items**: Correctly validated and remaining updated to 3.
3. **Refund remaining quantity**: Successfully refunds final 2 items and closes balance to 0.
4. **Two consecutive partial refunds**: 5 -> refund 2 (rem 3) -> refund 1 (rem 2) verified.
5. **Multiple partial refunds until fully refunded**: Transitions status and blocks further refunds.
6. **Attempt to refund more than remaining quantity**: Rejected with clear error.
7. **Attempt to refund zero**: Correctly rejected.
8. **Attempt to refund negative quantity**: Correctly rejected.
9. **Attempt to refund after fully refunded**: Blocked with validation message.
10. **Partial refund amount calculation**: Exact unit price multiplication and balance limits verified.
11. **Multiple items in same sale**: Each item refunded independently without cross-item contamination.
12. **Original sale remains unchanged**: Complete object immutability confirmed.
13. **Duplicate refund prevention**: Second identical refund attempt blocked.
14. **Existing Sales regression**: Verified real mock transaction partial refund execution.

---

### 13.F Step 9F-3A — Partial Refund Data Logic (`refundUtils.ts`)

A dedicated, lightweight mathematical calculation and validation module was implemented at `src/utils/refundUtils.ts` to separate core refund calculations from complex UI components and rule validators:

#### 1. Core Functions

```typescript
// 1. Calculate remaining refundable quantity
export function getRefundableQuantity(
  originalQuantity?: number | null,
  refundedQuantity?: number | null
): number;

// 2. Calculate remaining refundable monetary amount
export function getRefundableAmount(
  originalAmount?: number | null,
  refundedAmount?: number | null
): number;

// 3. Calculate partial refund amount from unit price & quantity
export function calculatePartialRefundAmount(
  unitPriceOrItem: number | { unitPrice: number },
  quantity?: number | null
): number;

// 4. Validate whether a quantity can be refunded
export function canRefundQuantity(
  quantity?: number | null,
  refundableQuantity?: number | null
): boolean;
```

#### 2. Business Invariants & Defensive Protections
- **Non-Negative Invariant**: `getRefundableQuantity` and `getRefundableAmount` always clamp outputs to `>= 0`. Under no circumstances can refundable quantity or amount become negative.
- **Input Sanitization**: Rejects `NaN`, `null`, `undefined`, and negative values. Negative refunded quantities/amounts are clamped to 0 to prevent artificial inflation of refundable balances.
- **Floating Point Safety**: Money amounts are rounded to 2 decimal places (`Math.round(val * 100) / 100`) preventing IEEE 754 precision artifacts.
- **Zero Mutation**: All operations are pure functions that do not mutate input objects.

#### 3. Test Coverage (`src/data/refund9F3.test.ts`)
- `getRefundableQuantity`: 1 of 5 (leaves 4), 2 of 5 (leaves 3), remaining 3 of 5 (leaves 2), fully refunded (leaves 0), initial (leaves 5), default parameters, overflow clamp to 0, negative input treatment.
- `getRefundableAmount`: Normal deduction, 2-decimal precision, zero refunded, fully refunded (0.00), over-refund clamp (0.00), negative input handling.
- `calculatePartialRefundAmount`: Standard product multiplication, 2-decimal rounding, item object overload, zero quantity, negative quantity, negative unit price, NaN handling.
- `canRefundQuantity`: Valid quantities (1, 2, 4, 5 of 5), zero quantity rejection, negative quantity rejection, quantity exceeding remaining rejection, fully refunded rejection, corrupt negative balance rejection, NaN/undefined validation.
- `Multiple partial refunds`: Sequential step-by-step lifecycle test simulating:
  - Initial (5 available, $60.00).
  - Step 1: Refund 2 items ($24.00, 3 remaining, $36.00 balance).
  - Intermediate rejection: Attempting 4 when 3 remaining rejected.
  - Step 2: Refund 1 item ($12.00, 2 remaining, $24.00 balance).
  - Step 3: Refund remaining 2 items ($24.00, 0 remaining, $0.00 balance).
  - Step 4: Rejection of any further refund requests once exhausted.
- `Immutability verification`: Verifies input objects remain strictly unchanged.

---

### 13.G Step 9F-3B — Partial Refund UI Component (`PartialRefundModal.tsx`)

A dedicated, lightweight, and reusable modal component was created at `src/components/sales/PartialRefundModal.tsx` to handle partial quantity selection with zero embedded business logic:

#### 1. Component Displays & Controls
1. **Product / Item Name**: Shows active item name, unit price, and currency formatted via `formatPrice`. When multiple items are present in a sale, a dropdown selector allows switching between items.
2. **Original Quantity**: Displayed in an itemized breakdown card (`originalQuantity`).
3. **Already Refunded Quantity**: Displayed with rose styling (`refundedQuantity`).
4. **Remaining Refundable Quantity**: Computed via `getRefundableQuantity` and styled with emerald indicators or a "Fully Refunded" badge.
5. **Quantity Input**: Interactive number input coupled with `-` and `+` decrement/increment stepper buttons constrained within `[1, remainingQuantity]`.
6. **Refund Amount**: Real-time calculation derived via `calculatePartialRefundAmount(unitPrice, quantity)` and displayed in bold rose currency.
7. **Refund Reason**: Optional text input capturing notes for audit tracking.
8. **Cancel Button**: Closes modal and resets state cleanly.
9. **Continue / Refund Button**: Dynamically shows refund sum and is automatically disabled whenever the entered quantity is invalid.

#### 2. Validation & Architectural Invariants
- Embedded calculation logic was strictly avoided by leveraging `src/utils/refundUtils.ts` (`getRefundableQuantity`, `calculatePartialRefundAmount`, `validatePartialRefundQuantity`).
- Quantities `< 1` are blocked with an immediate validation banner: `"Refund quantity must be at least 1."`
- Quantities exceeding `remainingQuantity` are blocked with: `"Refund quantity cannot exceed remaining refundable quantity (X)."`
- Items with `0` remaining refundable quantity display `"This item has already been fully refunded."` with disabled inputs.
- Modal state resets predictably upon opening or switching between items.

#### 3. Test Coverage (`src/data/refund9F3B.test.ts`)
- Modal opens and props contract validation.
- Correct item information display (name, unit price, formatted currency).
- Remaining quantity calculation for active and fully refunded items.
- Valid quantity range `[1, remaining]` verification.
- Invalid quantity error states (zero, negative, excess, NaN, fully refunded).
- Submit button disable behavior.
- Live refund amount display and currency formatting.
- Modal cancellation and confirmation callback dispatches.

---

### 13.H Step 9F-3C — Connect Partial Refund UI to Existing Sales Flow (`usePartialRefund.ts`)

A dedicated React hook was introduced at `src/hooks/usePartialRefund.ts` to coordinate the modal lifecycle and connect user interactions directly to the transactional ledger without polluting `Sales.tsx`:

#### 1. Architecture & Responsibilities
- **`src/utils/refundUtils.ts`**: Pure mathematical calculations and quantity boundary validation.
- **`src/hooks/usePartialRefund.ts`**: Manages modal visibility, active sale/item state, and transactional execution via `applyPartialRefundToSale`.
- **`src/components/sales/PartialRefundModal.tsx`**: Presentational modal view handling user input and stepper controls.
- **`src/components/sales/SaleDetailModal.tsx`**: Displays sale items with inline "Refund" triggers per item and the primary "Issue Refund" button at the bottom.
- **`src/pages/dashboard/Sales.tsx`**: Host page orchestrating local state synchronization and propagating updates to root app context.

#### 2. Workflow & State Consistency
1. **Triggering Refund**:
   - Clicking "Issue Refund" in `SaleDetailModal` opens `PartialRefundModal` for the entire sale.
   - Clicking "Refund" on a specific item row opens `PartialRefundModal` pre-targeting that exact item.
2. **Payload Delivery**:
   - Modal receives item name, original quantity, refunded quantity, remaining refundable quantity, unit price, and optional reason.
3. **Execution & Immutability**:
   - On confirmation, `applyPartialRefundToSale` generates a reversal transaction referencing `originalTransactionId`.
   - The original sale in state is updated immutably with cumulative `refundedAmount` and line `refundedQuantity`.
   - The open detail view (`selectedTx`) is immediately updated with the refreshed record.
   - The reversal transaction is prepended to the ledger, automatically updating filters and summary analytics.
4. **Cancellation**:
   - Closing or clicking "Cancel" dismisses the modal with zero mutations to the sales collection.
5. **Eligibility Progression**:
   - Remaining refundable quantities update live.
   - If an item's remaining quantity reaches 0, its inline action renders "Refunded" and blocks further input.
   - When all items or the entire balance are refunded, `isSaleEligibleForRefund` evaluates to false, hiding the "Issue Refund" action and transitioning the sale status to `'Refunded'`.

#### 3. Test Coverage (`src/data/refund9F3C.test.ts`)
- Open refund modal and pass correct sale / item targets.
- Modal payload validation (all required financial fields).
- Valid partial refund confirmation and reversal transaction creation.
- Cancel action zero-mutation safety.
- State, remaining quantity, and eligibility transitions across consecutive partial refunds.
- Fully refunded items blocked from subsequent refunds.
- Invalid quantities rejected.
- Existing Sales data and filters regression verification.

---

### 13.I Step 9F-3D — Multiple Partial Refunds & Cumulative Calculation Engine

The partial refund engine supports multiple consecutive partial refunds on the same sale item and across different items in a sale while strictly preserving cumulative quantity and financial consistency:

#### 1. Core Mathematical Model & Invariants
1. **Total Refunded Quantity**:
   - `totalRefundedQuantity = sum(partialRefundQuantities)`
   - Computed via `getTotalRefundedQuantity(item.refundedQuantity)`.
2. **Remaining Quantity Calculation**:
   - `remainingQuantity = Math.max(0, originalQuantity - totalRefundedQuantity)`
   - Computed via `calculateRemainingQuantity(originalQuantity, totalRefundedQuantity)`.
   - Never returns negative numbers; original quantity (`item.quantity`) remains permanently untouched.
3. **Remaining Refundable Amount**:
   - `remainingRefundableAmount = Math.max(0, Math.round((originalAmount - cumulativeRefundedAmount) * 100) / 100)`
   - Computed via `getRefundableAmount(originalAmount, refundedAmount)`.
4. **Over-Refund Protection**:
   - Every new partial refund request evaluates against the latest remaining quantity (`canApplyAdditionalRefund` & `validateMultiplePartialRefund`).
   - If `requestedQuantity > remainingQuantity`, the refund is strictly rejected with a clear descriptive message (`"Refund quantity (X) exceeds remaining refundable quantity (Y)."`).
   - Once `remainingQuantity === 0`, further refund attempts are permanently blocked with `"This item has already been fully refunded."`
5. **Separate Sequential Audit Records**:
   - Each refund generates a distinct reverse transaction with an incremented sequence number and order number:
     - Refund #1: `${sale.orderNumber}-REF` (sequence: 1)
     - Refund #2: `${sale.orderNumber}-REF-2` (sequence: 2)
     - Refund #3: `${sale.orderNumber}-REF-3` (sequence: 3)
   - The original transaction maintains `refundCount` and `refundIds: string[]` linking all reversals.

#### 2. Multi-Item Lifecycle Example
- **Initial**: Sale `#ORD-MULTI-901` with 5x Pork Ramen @ $10.00 ($50.00).
- **Refund #1**: Quantity = 1 → Remaining = 4. Reverse transaction `#ORD-MULTI-901-REF` (-$10.00).
- **Refund #2**: Quantity = 2 → Remaining = 2. Reverse transaction `#ORD-MULTI-901-REF-2` (-$20.00).
- **Refund #3**: Quantity = 2 → Remaining = 0. Reverse transaction `#ORD-MULTI-901-REF-3` (-$20.00).
- **Completion**: Sale transitions to `status: 'Refunded'`, `paymentStatus: 'Refunded'`. Additional refund requests are rejected.

#### 3. Test Coverage (`src/data/refund9F3D.test.ts`)
All 12 focused test suites verified:
1. `Original quantity 5 → refund 1 → remaining 4`.
2. `Refund another 2 → remaining 2`.
3. `Refund remaining 2 → remaining 0` with status transition to `'Refunded'`.
4. `Attempt another refund → rejected` once exhausted.
5. `Refund 3 + refund 3 on quantity 5 → second refund rejected` (over-refund guard).
6. `Multiple partial refunds on different items` (Ramen & Gyoza independent updates).
7. `Correct total refunded quantity` helper verification.
8. `Correct remaining quantity` calculation verification.
9. `Correct total refunded amount` calculation verification.
10. `Original sale remains unchanged` (zero in-place mutation).
11. `No negative remaining quantity` invariant clamp verification.
12. `No duplicate/over-refund` guard verification.

---

### 13.J Step 9F-3E — Final Partial Refund Testing, Cleanup & Verification

A comprehensive audit, dead-code cleanup, and full regression verification pass was completed across the entire partial refund subsystem (Steps 9F-3A through 9F-3D):

#### 1. Architecture & Separation of Concerns Summary
- **Calculations & Validation (`src/utils/refundUtils.ts`)**: Pure math functions (`getRefundableQuantity`, `getRefundableAmount`, `calculatePartialRefundAmount`, `canRefundQuantity`, `validatePartialRefundQuantity`, `getTotalRefundedQuantity`, `calculateRemainingQuantity`, `canApplyAdditionalRefund`, `validateMultiplePartialRefund`). Fully isolated with zero React or UI dependencies.
- **Business Engine & Transaction Generator (`src/utils/refundRules.ts`)**: Core validation against the 10 business rules, immutable state application (`applyPartialRefundToSale`), and sequential reversal transaction generation (`createRefundTransaction`).
- **State & Workflow Hook (`src/hooks/usePartialRefund.ts`)**: Encapsulates modal open/close lifecycle, targeted sale and item tracking, and transaction execution dispatching.
- **UI Presentational Layer (`src/components/sales/PartialRefundModal.tsx`)**: Modal showing active item details, original/refunded/remaining breakdown cards, stepper controls, numeric input, live subtotal display, optional reason input, and auto-disabling submit guard.
- **Details Trigger View (`src/components/sales/SaleDetailModal.tsx`)**: In-table row actions ("Refund" button per line) and global "Issue Refund" button with dynamic visibility based on remaining eligibility.

#### 2. Verified Test Scenarios
- **Refund 1 of 5**: Verified; remaining updates to 4, reverse transaction `#ORD-REF` generated.
- **Refund 2 of remaining 4**: Verified; remaining updates to 2, reverse transaction `#ORD-REF-2` generated.
- **Refund remaining 2**: Verified; remaining updates to 0, reverse transaction `#ORD-REF-3` generated, sale status transitions to `'Refunded'`.
- **Attempt refund after quantity reaches 0**: Permanently rejected with `"This item has already been fully refunded."`
- **Refund multiple different items**: Independent item tracking verified without cross-contamination.
- **Invalid quantity = 0**: Strictly rejected with `"Refund quantity must be at least 1."`
- **Negative quantity**: Strictly rejected with `"Refund quantity must be at least 1."`
- **Quantity greater than remaining**: Strictly rejected with `"Refund quantity (X) exceeds remaining refundable quantity (Y)."`
- **Refund amount greater than refundable amount**: Blocked by transaction validation guard.
- **Cancel refund**: Modal dismisses cleanly; zero mutations to sales records or ledger.
- **Successful refund**: Ledger updated immutably with prepended reversal record, original sale refreshed in detail view, and state propagated to parent context.
- **Multiple consecutive refunds**: Sequential sequence numbering and cumulative financial tracking verified.

#### 3. Code Quality & Cleanup Results
- **Unused imports/variables**: Audited; 0 unused imports or dead code across all modified files.
- **Duplicate logic**: Eliminated by delegating all calculations to `refundUtils.ts`.
- **TypeScript safety**: Strict zero errors under `tsc --noEmit`.
- **Bundle size**: Production bundle verified under `vite build` (`dist/assets/index-DQ9vWCsU.js: 453.75 kB │ gzip: 125.56 kB`).
- **Regression test suite**: 12 test suites executed with 100% pass rate (`sales9A`, `sales9B`, `sales9C`, `sales9D`, `sales9E`, `sales9F`, `products`, `permissions`, `refund9F3`, `refund9F3B`, `refund9F3C`, `refund9F3D`).

---

### 13.K Step 9F-4A — Full Refund Business Logic (`refundUtils.ts`)

Pure mathematical logic and domain boundary rules were established for full refund workflows:

#### 1. Core Rule & Calculation Model
A full refund refunds **all remaining refundable quantities and balances**, rather than re-refunding the original sold quantity:
- If `originalQuantity = 5` and `alreadyRefunded = 2`:
  - `getFullRefundQuantity(5, 2) === 3`
  - `remainingQuantity` transitions to `0`.
  - The item is never over-refunded by re-issuing a refund for 5.
- If `originalAmount = $50.00` and `alreadyRefunded = $20.00`:
  - `getFullRefundAmount(50.00, 20.00) === 30.00`
  - Reversal transaction amount is strictly `-$30.00`.
- Once `remainingQuantity === 0`, `canApplyFullRefund` returns `false`, and `getFullRefundQuantity` returns `0`.

#### 2. Key Utility Functions
```typescript
// 1. Calculate remaining refundable quantity for full refund
export function getFullRefundQuantity(
  originalQuantity?: number | null,
  refundedQuantity?: number | null
): number;

// 2. Calculate remaining refundable balance for full refund
export function getFullRefundAmount(
  originalAmount?: number | null,
  refundedAmount?: number | null
): number;

// 3. Predicate checking whether a full refund is applicable
export function canApplyFullRefund(
  originalQuantity?: number | null,
  refundedQuantity?: number | null
): boolean;

// 4. Line item refund calculation for remaining quantities
export function calculateItemFullRefundAmount(
  unitPrice: number,
  originalQuantity?: number | null,
  refundedQuantity?: number | null
): number;
```

#### 3. Test Coverage (`src/data/refund9F4.test.ts`)
1. **Full refund with no previous refund**: 5 of 5 refunded ($50.00); status transitions to `'Refunded'`.
2. **Full refund after a partial refund**: 5 sold, 2 partially refunded ($20.00); full refund correctly refunds remaining 3 ($30.00), NOT 5.
3. **Full refund after multiple partial refunds**: 6 sold, partial 1 + partial 2; full refund correctly refunds remaining 3 ($24.00).
4. **Already fully refunded item returns quantity 0**: When exhausted, returns 0 quantity, $0.00 amount, and `canApplyFullRefund === false`.
5. **Full refund amount is correct**: Line-level unit price calculation and multi-item balance verification.
6. **No negative quantity or amount**: Safe clamp to `>= 0`.
7. **No over-refund**: Rejects attempts to refund original quantity when items were already partially refunded.
8. **Original sale data is not mutated**: Zero in-place mutation of transaction objects or line items.


---

### 13.L Step 9F-4B — Full Refund Confirmation UI (`FullRefundModal.tsx`)

A dedicated, isolated modal component was created at `src/components/sales/FullRefundModal.tsx` for confirming a full refund without polluting `Sales.tsx` or altering the existing partial refund flow:

#### 1. Architecture & Design Principles
- **Separation of Concerns**: The UI component handles presentation and user interaction only. All financial totals and remaining quantity calculations strictly reuse pure functions from `src/utils/refundUtils.ts` (`getFullRefundAmount`, `getFullRefundQuantity`, `canApplyFullRefund`).
- **Modal Reuse**: Reuses the core UI modal wrapper (`src/components/ui/Modal.tsx`) with cohesive POS/admin styling.
- **Fixed Quantity Invariant**: Unlike `PartialRefundModal`, the user cannot edit refund quantities. A full refund automatically operates on the entire remaining refundable quantity and amount.

#### 2. UI Layout & UX Elements
1. **Sale & Order Header**:
   - Order number display (`#ORD-...`) and customer / table badge.
   - Status badge indicating either `'Refund Eligible'` or `'Fully Refunded'`.
2. **Warning & Explanatory Callout**:
   - Clear amber notification: *"This will refund the entire remaining refundable amount ($X.XX)."*
   - Clear exhaustion notice if already fully refunded: *"This sale has already been fully refunded. No remaining refundable balance available."*
3. **Itemized Refund Breakdown**:
   - List of order items showing item name, unit price, and read-only quantity badge (e.g., *"Refund 3 of 5"* or *"0 remaining (Refunded)"*).
4. **Three-Column Financial Summary**:
   - Original Amount
   - Already Refunded Amount
   - Remaining Refundable Amount
5. **Prominent Full Refund Amount Banner**:
   - Displays the net reversal amount prominently formatted with a minus sign (e.g., `-$45.00`).
6. **Optional Refund Reason Field**:
   - Pre-populated with default `"Customer Request — Full Refund"`, fully editable, and disabled when sale is exhausted.
7. **Action Buttons**:
   - **Cancel Button**: Invokes `onClose` callback to dismiss without mutating state.
   - **Confirm Full Refund Button**: Dynamically displays the refundable amount and is disabled when remaining balance is zero or sale is ineligible.

#### 3. Test Coverage (`src/data/refund9F4B.test.ts`)
All 9 verification checkpoints verified:
1. **Modal Opens**: Renders correctly when open with sale data; returns null when closed.
2. **Correct Sale/Order**: Displays matching order number, customer name, and table.
3. **Correct Remaining Refundable Amount**: Accurately computes and formats remaining balance (`origAmount - refundedAmount`).
4. **Correct Item Information**: Renders line item names, unit prices, and remaining quantities.
5. **Full Refund Amount Displayed**: Prominently displays the full refund total.
6. **Already Fully Refunded Protection**: Disables confirmation button and renders exhaustion badge when balance is 0.
7. **Cancel Closes Modal**: Verifies modal dismissal upon cancel trigger.
8. **Confirm Button Availability**: Active and clickable when remaining refundable amount > 0.
9. **Optional Reason Input**: Sanitizes and passes custom reason text to callback.

---

### 13.M Step 9F-4C — Connect Full Refund to Existing Flow (`useFullRefund.ts` & `applyFullRefundToSale`)

The full refund modal was connected to the live transactional ledger through dedicated state coordination and domain rules:

#### 1. Architecture & Clean Separation
- **`src/utils/refundUtils.ts`**: Pure calculation functions (`getFullRefundQuantity`, `getFullRefundAmount`, `canApplyFullRefund`).
- **`src/utils/refundRules.ts` (`applyFullRefundToSale`)**:
  - Validates sale eligibility.
  - Dynamically calculates the exact remaining quantity for every item with `remQty > 0`.
  - Calculates line subtotals and creates the reversal transaction.
  - Immutably marks all remaining quantities as refunded and sets cumulative `refundedAmount = sale.amount`.
  - Sets transaction status and payment status to `'Refunded'`.
  - Preserves the original sale object and records sequential audit trails (`refundCount` and `refundIds`).
- **`src/hooks/useFullRefund.ts`**:
  - Manages `saleToFullRefund`, `isFullRefundModalOpen`, and `fullRefundError`.
  - Exposes `openFullRefundModal`, `closeFullRefundModal`, and `handleConfirmFullRefund`.
  - Implements atomic error handling: does not dismiss modal or partially update state if refund execution fails.
- **`src/components/sales/FullRefundModal.tsx`**: Presentational modal displaying breakdown, error callouts, and dispatching confirmation.
- **`src/components/sales/SaleDetailModal.tsx`**: Added `onOpenFullRefund` prop to render "Full Refund" action directly in the modal footer.
- **`src/pages/dashboard/Sales.tsx`**: Coordinates `useFullRefund` and synchronizes local ledger, active sale inspection, and root `onRefundSale` callback without bloating component logic.

#### 2. Workflow & Invariants
1. **Triggering Full Refund**:
   - The user opens `SaleDetailModal` on an eligible sale and clicks "Full Refund".
   - `openFullRefundModal(sale)` sets the active sale and opens `FullRefundModal`.
2. **Execution**:
   - On clicking "Confirm Full Refund", `handleConfirmFullRefund` invokes `applyFullRefundToSale`.
   - Remaining quantities and balance drop to 0.
   - Status switches to `'Refunded'`.
   - Reversal transaction is prepended to the sales ledger.
3. **Cancel & Error Safety**:
   - Clicking "Cancel" closes the modal with zero mutations.
   - If an error occurs (e.g. sale already refunded), an error banner renders and state remains pristine.
4. **Subsequent Refund Prevention**:
   - Further refund actions on the sale are disabled and rejected with an explicit error.

#### 3. Test Coverage (`src/data/refund9F4C.test.ts`)
All 12 focused integration checkpoints verified:
1. **Open Full Refund modal**: Verifies state transition and modal opening.
2. **Correct sale/item passed**: Accurately delivers order number, customer, and item lines.
3. **Correct remaining quantity**: Accurately computes remaining balances across active and exhausted items.
4. **Correct refundable amount**: Multi-currency amount precision verified (USD and KHR).
5. **Successful full refund**: Reversal transaction created, cumulative amounts synced, status updated.
6. **Full refund after previous partial refund**: Properly refunds only remaining balance ($30.00 of $40.00 after $10.00 partial refund).
7. **Already fully refunded item rejected**: Throws clear error and prevents double refunds.
8. **Cancel does not modify data**: Preserves sales ledger and transaction data immutably.
9. **Refund reason saved**: Custom reasons and fallback defaults persisted to reversal transactions.
10. **Original sale remains unchanged**: Guarantees zero in-place mutation of transaction objects.
11. **Refund history remains available**: Preserves chronological refund records with linked IDs.
12. **Duplicate full refund prevented**: Blocks redundant subsequent full refunds.

---

## 14. Known Limitations & Next Steps

1. **Step 9F-4D**: Final Full Refund Review & Regression Verification.
2. **Sales Reports (Step 10)**: Aggregate analytics, station reports, and chart exports.
