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

## 13. Known Limitations & Next Steps

1. **Product Cost Persistence**: While `SaleItem` now supports `cost?: number`, default mock data items do not include ingredient cost values. An administrative inventory/cost management module will be needed if persistent item costs are required.
2. **Refund Processing (Step 9F)**: Refund button and reverse-transaction processing.
3. **Sales Reports (Step 10)**: Aggregate analytics, station reports, and chart exports.
