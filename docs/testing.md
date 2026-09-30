# Automated Testing & Quality Assurance

## 1. Overview

RestoControl uses TypeScript-native test suites executed via [`tsx`](https://github.com/privatenumber/tsx) to verify business rules, financial calculations, RBAC security, receipt generation, QR ordering, end-to-end integration, and user interface component contracts. All tests run deterministically against isolated fixtures without requiring external mock servers or browser drivers.

---

## 2. Test Execution Commands

### Run all 21 automated test suites:
```bash
for f in $(find src -name "*.test.ts" | sort); do npx tsx "$f"; done
```

### Run an individual test suite:
```bash
# E.g. Run Step 17 Final Frontend Integration tests
npx tsx src/data/integration17.test.ts

# E.g. Run Step 18 QA & Regression tests
npx tsx src/data/qaRegression18.test.ts

# E.g. Run Refund workflow tests
npx tsx src/data/sales9F.test.ts
```

### Static type check:
```bash
npm run lint
```
Executes `tsc --noEmit` across all TypeScript files.

### Production build verification:
```bash
npm run build
```
Executes Vite production bundling and validates tree-shaking, CSS generation, and module bundling.

---

## 3. Test Suites Directory & Coverage

The repository maintains 21 comprehensive automated test suites covering distinct application domains:

| # | Test Suite File | Domain | Key Scenarios Verified |
| :---: | :--- | :--- | :--- |
| **1** | `src/auth/permissions.test.ts` | Authentication & RBAC | Admin 20 permissions, Staff 8 permissions, `hasPermission` resolution, unauthorized route guards. |
| **2** | `src/data/products.test.ts` | Menu & Products | Product creation, price validation (`> 0`), category assignment, stock toggle, image picker base64 conversion. |
| **3** | `src/data/orders.test.ts` | Order Management | Order list integrity, lifecycle status progression (`Preparing` -> `Cooking` -> `Ready` -> `Served` -> `Completed`), voiding/cancellation. |
| **4** | `src/data/sales9A.test.ts` | Sales History | Completed sales pool integrity, transaction metadata, order status validation, data immutability. |
| **5** | `src/data/sales9B.test.ts` | Sale Details | Sale detail payload mapping, item quantities, line totals, subtotal/tax accuracy, USD/KHR currency formats. |
| **6** | `src/data/sales9C.test.ts` | Sale Receipts | 80mm printable thermal receipt mapping, tender breakdowns, change calculations, brand header metadata. |
| **7** | `src/data/sales9D.test.ts` | Sales Filters & Search | 64 test cases: Date ranges, payment method filtering, order type filtering, status filtering, omni-search, 5-filter combinations, edge cases. |
| **8** | `src/data/sales9E.test.ts` | Sales Summary & Metrics | Revenue totals, cost calculation, profit margins, tender summaries, date-scoped metrics, filtered invariants. |
| **9** | `src/data/sales9F.test.ts` | Partial Refunds | Partial item refunding, remaining quantity decrements, multiple partial refunds, over-refund prevention, duplicate refund rejection. |
| **10** | `src/data/refund9F3.test.ts` | Refund Calculations | Remaining quantity calculations, status transitions (`Completed` -> `Refunded`), balance limits. |
| **11** | `src/data/refund9F3B.test.ts` | Partial Refund Modal UI | Modal props contract, live amount calculation, quantity clamp [1, remaining], submit button disable guards. |
| **12** | `src/data/refund9F3C.test.ts` | Partial Refund Integration | Transaction creation, negative amount balancing, item summary formatting, cancel state preservation. |
| **13** | `src/data/refund9F3D.test.ts` | Multi-Item Partial Refunds | Complex multi-item refunds, independent item tracking, remaining balance closure. |
| **14** | `src/data/refund9F4.test.ts` | Full Refund Rules | Full refund with no prior refund, full refund after single partial, full refund after multiple partials. |
| **15** | `src/data/refund9F4B.test.ts` | Full Refund Modal UI | Modal UI contracts, remaining balance prompt, confirm/cancel callbacks. |
| **16** | `src/data/refund9F4C.test.ts` | Full Refund Integration | Status transition to `'Refunded'`, net reverse transaction generation, total transaction closure. |
| **17** | `src/data/tableQR9D.test.ts` | Table QR Generation | Relative route `/menu/:tableId`, URL generation, real base64 PNG data URL generation, download filename sanitization. |
| **18** | `src/data/qrOrdering15.test.ts` | Customer QR Ordering | Out-of-stock product guard, cart operations, customer order payload formulation, Unpaid & Pending initialization, Orders integration. |
| **19** | `src/data/receipt16.test.ts` | Thermal Receipts & Print | Receipt format, order receipt modal, sale receipt modal, payment modal receipt, 80mm thermal CSS media print isolation, reprint idempotency. |
| **20** | `src/data/integration17.test.ts` | Frontend Integration | Step 17 end-to-end integration: POS workflow, QR customer workflow, Refund calculation workflow, Menu availability sync, Table QR routing, error states, and RBAC matrix. |
| **21** | `src/data/qaRegression18.test.ts` | Full QA & Regression | Step 18 comprehensive pass: Auth session, clean dashboard KPIs, menu operations, POS cart & KHR math, order lifecycle, Table 01 & 02 QR, invalid `/menu/invalid` screen, sales filtering, refund invariants, receipt idempotency, RBAC gates. |

---

## 4. Test Invariants & Principles

1. **Deterministic Execution**: Tests operate on immutable input data and assert mathematical and logical equality.
2. **Zero Production Contamination**: Tests utilize isolated fixtures in `src/data/mockData.ts`. Production runtime state (`src/App.tsx`) remains completely unpolluted with 0 demo records.
3. **No Muted Failures**: Tests employ strict `assert` / `assert.strictEqual` checks that terminate the runner on any assertion failure.
4. **Idempotency**: Reprinting receipts, viewing details, and evaluating read-only telemetry does not mutate transaction records or produce duplicate transactions.

---

## 5. Verification Results

All 21 test suites pass with a 100% success rate:
- **Total Test Suites**: 21
- **Passed**: 21
- **Failed**: 0
- **Regression Status**: Zero regressions detected.
