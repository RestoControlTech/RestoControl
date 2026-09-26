# Automated Testing & Quality Assurance

## 1. Overview

RestoControl uses TypeScript-native test suites executed via [`tsx`](https://github.com/privatenumber/tsx) to verify business rules, financial calculations, RBAC security, and user interface component contracts. All tests run deterministically against isolated fixtures without requiring external mock servers or browser drivers.

---

## 2. Test Execution Commands

Run all 15 automated test suites:

```bash
for f in $(find src -name "*.test.ts" | sort); do npx tsx "$f"; done
```

Or run an individual test suite:

```bash
npx tsx src/data/sales9F.test.ts
```

Static type check:

```bash
npm run lint
```

Production build verification:

```bash
npm run build
```

---

## 3. Test Suites Directory & Coverage

The repository maintains 15 comprehensive automated test suites covering distinct application domains:

| # | Test Suite File | Domain | Key Scenarios Verified |
| :---: | :--- | :--- | :--- |
| **1** | `src/auth/permissions.test.ts` | Authentication & RBAC | Admin 20 permissions, Staff 8 permissions, `hasPermission` resolution, unauthorized route guards. |
| **2** | `src/data/products.test.ts` | Menu & Products | Product creation, price validation (`> 0`), category assignment, stock toggle, image picker base64 conversion. |
| **3** | `src/data/sales9A.test.ts` | Sales History | Completed sales pool integrity, transaction metadata, order status validation, data immutability. |
| **4** | `src/data/sales9B.test.ts` | Sale Details | Sale detail payload mapping, item quantities, line totals, subtotal/tax accuracy, USD/KHR currency formats. |
| **5** | `src/data/sales9C.test.ts` | Sale Receipts | 80mm printable thermal receipt mapping, tender breakdowns, change calculations, brand header metadata. |
| **6** | `src/data/sales9D.test.ts` | Sales Filters & Search | 64 test cases: Date ranges, payment method filtering, order type filtering, status filtering, omni-search, 5-filter combinations, edge cases. |
| **7** | `src/data/sales9E.test.ts` | Sales Summary & Metrics | Revenue totals, cost calculation, profit margins, tender summaries, date-scoped metrics, filtered invariants. |
| **8** | `src/data/sales9F.test.ts` | Partial Refunds | Partial item refunding, remaining quantity decrements, multiple partial refunds, over-refund prevention, duplicate refund rejection. |
| **9** | `src/data/refund9F3.test.ts` | Refund Calculations | Remaining quantity calculations, status transitions (`Completed` -> `Refunded`), balance limits. |
| **10** | `src/data/refund9F3B.test.ts` | Partial Refund Modal UI | Modal props contract, live amount calculation, quantity clamp [1, remaining], submit button disable guards. |
| **11** | `src/data/refund9F3C.test.ts` | Partial Refund Integration | Transaction creation, negative amount balancing, item summary formatting, cancel state preservation. |
| **12** | `src/data/refund9F3D.test.ts` | Multi-Item Partial Refunds | Complex multi-item refunds, independent item tracking, remaining balance closure. |
| **13** | `src/data/refund9F4.test.ts` | Full Refund Rules | Full refund with no prior refund, full refund after single partial, full refund after multiple partials. |
| **14** | `src/data/refund9F4B.test.ts` | Full Refund Modal UI | Modal UI contracts, remaining balance prompt, confirm/cancel callbacks. |
| **15** | `src/data/refund9F4C.test.ts` | Full Refund Integration | Status transition to `'Refunded'`, net reverse transaction generation, total transaction closure. |

---

## 4. Test Invariants & Principles

1. **Deterministic Execution**: Tests operate on immutable input data and assert mathematical and logical equality.
2. **Zero Production Contamination**: Tests utilize isolated fixtures in `src/data/mockData.ts`. Production runtime state (`src/App.tsx`) remains completely unpolluted with 0 demo records.
3. **No Muted Failures**: Tests employ strict `assert` / `assert.strictEqual` checks that terminate the runner on any assertion failure.

---

## 5. Verification Results

All 15 test suites pass with a 100% success rate:
- **Total Test Suites**: 15
- **Passed**: 15
- **Failed**: 0
- **Regression Status**: Zero regressions detected.
