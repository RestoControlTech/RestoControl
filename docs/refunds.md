# Refund Architecture & Business Invariants

## 1. Overview

The RestoControl refund subsystem provides an audit-compliant, robust mechanism for reversing customer transactions either partially or fully. The refund engine guarantees mathematical consistency, prevents over-refunding, maintains original transaction immutability, and generates reverse transactions for accounting clarity.

---

## 2. Core Business Invariants

The refund engine enforces 10 strict business rules defined in [`src/utils/refundRules.ts`](file:///Users/mac/Documents/RestoControl/RestoControl/src/utils/refundRules.ts) and [`src/utils/refundUtils.ts`](file:///Users/mac/Documents/RestoControl/RestoControl/src/utils/refundUtils.ts):

| Rule # | Invariant Rule | Enforcement Mechanism |
| :--- | :--- | :--- |
| **Rule 1** | Only completed sales can be refunded | `isSaleEligibleForRefund(sale)` rejects pending, cancelled, or already refunded sales. |
| **Rule 2** | Refund quantity cannot exceed sold quantity | Clamped to `item.quantity` and rejected if `quantity > remainingQuantity`. |
| **Rule 3** | Refund quantity must be strictly positive | Rejects quantities `<= 0`, `NaN`, or non-numeric inputs. |
| **Rule 4** | Refund amount cannot be negative | Validated and clamped; negative amounts are rejected. |
| **Rule 5** | Partially refunded items remain eligible for remaining quantity | `getRefundableQuantity(originalQty, refundedQty)` computes exact remaining balance. |
| **Rule 6** | Fully refunded items cannot be refunded again | Blocked once `refundedQuantity >= originalQuantity`; UI renders disabled state. |
| **Rule 7** | Full refund cancels entire transaction | Transitions sale status to `'Refunded'` and closes all items. |
| **Rule 8** | Cumulative refund amount cannot exceed original total | Cumulative sum of refunds is strictly checked against the original sale amount. |
| **Rule 9** | Original transaction record remains immutable | Instead of mutating original amounts, a separate reverse transaction (`-refundAmount`) is created. |
| **Rule 10** | Stock can optionally be restored | Item restoration flags are supported in refund transaction metadata. |

---

## 3. Main Workflows

### A. Partial Line-Item Refund Workflow
```
[Sales History] 
       │
       ▼ Click "View Details"
[Sale Detail Modal]
       │
       ▼ Click "Refund" on eligible line item
[Partial Refund Modal]
  ├── Enter refund quantity (1 to remainingQuantity)
  ├── Live calculation of refund amount
  └── Optional refund reason input
       │
       ▼ Confirm Refund
[Engine Execution: applyPartialRefundToSale]
  ├── Validates request against 10 rules
  ├── Generates reverse Transaction (#TX-XXXX-REF-1 with negative amount)
  ├── Updates item.refundedQuantity on original sale
  └── Updates sale.refundedAmount & transitions status if all items refunded
       │
       ▼
[Sales Ledger Updated & Reverse Receipt Available]
```

### B. Full Refund Workflow
```
[Sales History] 
       │
       ▼ Click "View Details"
[Sale Detail Modal]
       │
       ▼ Click "Full Refund"
[Full Refund Confirmation Modal]
  ├── Displays net remaining refundable balance
  └── Optional refund reason input
       │
       ▼ Confirm Full Refund
[Engine Execution: applyFullRefundToSale]
  ├── Refunds 100% of remaining quantities across all items
  ├── Marks sale status: 'Refunded' and paymentStatus: 'Refunded'
  └── Generates final closing reverse Transaction
```

---

## 4. Key Files & Architecture

- **Engine & Rules**: [`src/utils/refundRules.ts`](file:///Users/mac/Documents/RestoControl/RestoControl/src/utils/refundRules.ts)
  - `isSaleEligibleForRefund(sale)`
  - `validateRefundRequest(sale, request)`
  - `applyPartialRefundToSale(sale, request)`
  - `applyFullRefundToSale(sale, reason)`
  - `createRefundTransaction(sale, request)`
- **Calculations & Validations**: [`src/utils/refundUtils.ts`](file:///Users/mac/Documents/RestoControl/RestoControl/src/utils/refundUtils.ts) & [`src/utils/refundCalculations.ts`](file:///Users/mac/Documents/RestoControl/RestoControl/src/utils/refundCalculations.ts)
  - `getRefundableQuantity(original, currentRefunded)`
  - `calculatePartialRefundAmount(quantity, unitPrice)`
  - `validatePartialRefundQuantity(quantity, remaining)`
  - `canApplyAdditionalRefund(requested, original, currentRefunded)`
- **Hooks**:
  - [`src/hooks/usePartialRefund.ts`](file:///Users/mac/Documents/RestoControl/RestoControl/src/hooks/usePartialRefund.ts)
  - [`src/hooks/useFullRefund.ts`](file:///Users/mac/Documents/RestoControl/RestoControl/src/hooks/useFullRefund.ts)
- **UI Modals**:
  - [`src/components/sales/RefundModal.tsx`](file:///Users/mac/Documents/RestoControl/RestoControl/src/components/sales/RefundModal.tsx)
  - [`src/components/sales/FullRefundModal.tsx`](file:///Users/mac/Documents/RestoControl/RestoControl/src/components/sales/FullRefundModal.tsx)
  - [`src/components/sales/SaleDetailModal.tsx`](file:///Users/mac/Documents/RestoControl/RestoControl/src/components/sales/SaleDetailModal.tsx)

---

## 5. Automated Testing Performed

The refund system is verified by 7 dedicated automated test suites (over 60 assertions):
- `src/data/sales9F.test.ts`: End-to-end partial refund transitions and duplicate prevention.
- `src/data/refund9F3.test.ts`: Line item balance calculations and status updates.
- `src/data/refund9F3B.test.ts`: Partial refund modal UI logic contracts.
- `src/data/refund9F3C.test.ts`: Partial refund flow integration and state immutability.
- `src/data/refund9F3D.test.ts`: Complex multi-item partial refund scenarios.
- `src/data/refund9F4.test.ts`: Full refund logic and remaining balance calculations.
- `src/data/refund9F4B.test.ts`: Full refund modal logic contracts.
- `src/data/refund9F4C.test.ts`: Full refund integration and complete transaction closure.

---

## 6. Known Limitations & Production Recommendations

1. **Client-Side State Only**: Current refund transactions are stored in client memory (`useState`). When integrating with a persistent database, refunds must execute within an ACID database transaction.
2. **Payment Gateway Integration**: The current implementation handles POS accounting reversals. In a production environment with integrated credit card processors (Stripe, Adyen), a webhook or direct API refund call must accompany the transaction creation.
