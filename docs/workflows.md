# RestoControl — Restaurant Operational Workflows

This document details the actual end-to-end operational workflows implemented and verified in the RestoControl restaurant POS application.

---

## 1. POS Workflow (Staff Station Order & Settlement)

The Point-of-Sale (POS) terminal enables floor staff and cashiers to assemble tickets, select dining tables, accept tenders, record finalized sales, and issue thermal receipts.

```
Select Product(s)
       │
       ▼
     Cart (Quantity adjustments, line total calculations, empty cart protection)
       │
       ▼
  Table Assignment (e.g. Table 01, Table 02, etc.)
       │
       ▼
  Order Formulation (Order #, itemized lines, note, Dine-in/Takeaway)
       │
       ▼
  Payment Modal (Cash, Card, QR, Digital Wallet, dual-currency USD/KHR conversion, change calculation)
       │
       ▼
  Completed Sale (Recorded into Sales transaction ledger; Table marked Occupied)
       │
       ▼
  Sales Ledger & Reports (Reflected in financial telemetry and transaction history)
       │
       ▼
  Thermal Receipt (OrderReceiptModal / PaymentModal receipt view with 80mm print isolation)
```

### Detailed Steps:
1. **Product Selection**: Staff browse product cards by category tab (`All Items`, `Popular`, `Noodles`, `Mains & Sushi`, `Appetizers`, `Drinks`) or use real-time search. Clicking "+ Add" adds the dish to the cart. Unavailable products are disabled.
2. **Cart Management**: Cart calculates line totals (`unitPrice * quantity`). Items can be incremented, decremented, removed, or the cart cleared. Proceeding with an empty cart is blocked.
3. **Table Selection**: Staff associate the order ticket with a specific restaurant table (e.g. `Table 01` to `Table 08`).
4. **Order Submission**: When proceeding to payment, a draft ticket is created with order number (`#ORD-XXXX`), customer name, and item breakdown.
5. **Payment Processing**: Staff choose payment method (Cash, Credit Card, Debit Card, QR Code, or Digital Wallet). For cash, staff enter the cash received in USD or KHR; the system calculates exact change and guards against insufficient payments.
6. **Completed Sale Creation**: On payment success, the order is registered in `orders` state (`paymentStatus: 'Paid'`), the assigned table is marked `'Occupied'` in `tables`, and a completed transaction record (`Transaction`) is added to `transactions` state.
7. **Receipt Generation**: Staff can review and print the 80mm thermal receipt immediately in the modal, or reprint at any time from Sales History or Orders.

---

## 2. QR Workflow (Customer Table Ordering & Staff Settlement)

The Customer QR Menu workflow enables restaurant patrons to scan physical table QR codes, browse the digital menu, place kitchen orders without staff intervention, and settle payments with staff upon conclusion.

```
Table QR Code (Unique table destination URL e.g. /menu/t1, /menu/t2)
       │
       ▼
Customer Scans with Phone Camera
       │
       ▼
Customer Menu (/menu/:tableId — verifies table existence; invalid route displays "Table not found")
       │
       ▼
Product Selection (Browse dishes, filter categories, search, inspect prices & badges)
       │
       ▼
Customer Cart (Add dishes, adjust quantities, view running total in sticky bottom drawer)
       │
       ▼
Submit Order (Dispatches order ticket to kitchen; empties cart; displays toast confirmation)
       │
       ▼
Orders Queue (Appears in Orders screen with status: "Pending" and paymentStatus: "Unpaid"; Table marked Occupied)
       │
       ▼
Kitchen & Floor Service (Staff advance order: "Pending" -> "Preparing" -> "Cooking" -> "Ready" -> "Served")
       │
       ▼
Staff Payment Settlement (Customer concludes dining; staff process payment at POS or station)
       │
       ▼
Completed Sale (Transaction recorded in Sales history with items breakdown)
       │
       ▼
Receipt (Thermal receipt generated and available for printing/reprinting)
```

### Detailed Steps:
1. **Table QR Code**: Each restaurant table has a unique, high-contrast QR code generated in Table Management (`/tables`). Scanning routes to `/menu/:tableId` (e.g. `/menu/t1` for Table 01, `/menu/t2` for Table 02).
2. **Table Verification**:
   - If `tableId` is valid, the customer menu loads branded with the specific table header (e.g. "Table 01").
   - If `tableId` is invalid (e.g. `/menu/invalid`), a clean "Table not found" state is displayed with navigation back to the dashboard or valid tables. No blank screens or uncaught exceptions occur.
3. **Customer Menu**: Guests browse menu items with photography, badges, descriptions, and USD prices. Out-of-stock items display an "Unavailable" badge and cannot be added.
4. **Customer Cart**: Items are aggregated with item counters. A floating cart pill shows item count and running total. Opening the drawer allows fine-tuning quantities. Empty cart submission is guarded.
5. **Kitchen Submission**: Clicking "Send Order to Kitchen" dispatches `QROrderSubmission` to `handleSendOrderToKitchen` in `App.tsx`. Cart resets and a toast confirmation appears.
6. **Orders Integration**: The order arrives in the Orders queue (`/orders`) with:
   - Order Number: `#ORD-XXXX`
   - Customer: `QR Guest (Table XX)`
   - Status: `Pending`
   - Payment Status: `Unpaid`
   - Table status automatically updates to `Occupied`.
7. **Service & Settlement**: Floor staff accept the order, progress it through kitchen stages, and when the guest finishes dining, collect payment and mark the order completed.
8. **Sale & Receipt**: Finalized transaction is recorded in Sales History, and a receipt is ready for printout.

---

## 3. Refund Workflow (Audit-Compliant Transaction Reversal)

The refund engine enforces 10 strict accounting invariants to reverse completed sales either partially by line item or fully.

```
Completed Sale (In Sales History /sales with status: "Completed" or "Receipt")
       │
       ▼ Click "View Details"
Sale Details Modal (Inspect itemized breakdown, quantities, and remaining refundable amounts)
       │
       ├─────────────────────────────────────┐
       ▼ Click "Refund" on Item              ▼ Click "Full Refund"
Partial Refund Modal                  Full Refund Modal
  ├── Enter refund quantity             ├── Reviews net refundable balance
  ├── Clamped to [1, remainingQuantity] ├── Optional refund reason
  └── Live calculated refund amount     └── Confirms 100% remaining closure
       │                                     │
       └──────────────────┬──────────────────┘
                          ▼ Confirm
                Refund Calculation Engine
  ├── Validates against 10 business invariants (positive qty, non-zero, <= remaining)
  ├── Decrements item remainingQuantity immutably
  ├── Creates linked reverse Transaction with negative amount (-$XX.XX)
  └── Updates sale status to "Refunded" when fully refunded
                          │
                          ▼
                Updated Transaction & Ledger
  ├── Original sale remains intact (immutable)
  ├── Reversal transaction appears in Sales ledger
  └── Print updated receipt or refund receipt
```

### Detailed Steps:
1. **Locate Sale**: Administrative users find the completed transaction in Sales History (`/sales`) using date presets, payment filters, order type filters, or omni-search.
2. **Inspect Details**: Clicking "Details" opens `SaleDetailModal` displaying items, unit prices, line totals, and quantities previously refunded.
3. **Select Refund Type**:
   - **Partial Refund**: Staff click "Refund" on a specific item. `PartialRefundModal` prompts for quantity (clamped between 1 and the item's remaining refundable quantity) and an optional reason.
   - **Full Refund**: Staff click "Full Refund". `FullRefundModal` calculates the net remaining balance across all items and prompts for confirmation.
4. **Validation & Invariants**:
   - Rule 1: Sale must be eligible (`status !== 'Cancelled'`).
   - Rule 2 & 7: Refund quantity cannot exceed sold quantity or remaining balance.
   - Rule 3 & 4: Quantity and amount must be strictly positive (rejection of `<= 0` or negative).
   - Rule 6: Fully refunded items or sales cannot be refunded again.
   - Rule 9: Original transaction object is preserved immutably.
5. **Execution & Ledger Update**:
   - Generates a reversal transaction with negative amount (e.g. `-$15.00`) referencing the original transaction ID and order number.
   - Updates remaining quantities on the original sale items.
   - If all items or 100% of the balance is refunded, transitions the original transaction status to `'Refunded'`.
   - The sales summary metrics and reports update immediately to reflect net revenues.
