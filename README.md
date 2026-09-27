# RestoControl

A modern, high-performance Restaurant Management & Point-of-Sale (POS) application built with React 19, TypeScript, and Tailwind CSS. RestoControl provides end-to-end operational capabilities for restaurant staff, managers, and dining guests—featuring multi-role access control, live order processing, dual-currency sales auditing, and strict multi-rule refund workflows.

---

## Overview

RestoControl is designed to streamline front-of-house, kitchen, and back-office restaurant operations:
- **Floor Staff & Cashiers** can manage table states, take orders via touch POS terminals, and send order tickets to the kitchen.
- **Guests** can scan table QR codes to access a responsive, mobile-first digital menu, customize cart items, and dispatch kitchen orders directly from their mobile devices.
- **Managers & Administrators** have complete oversight with role-based access control, real-time KPI telemetry, product/catalog management, staff shift rosters, financial sales ledgers, and audit-compliant refund management.

---

## Features

The following features are fully implemented and verified in the codebase:

- **Authentication**: Client-side session management with persistent login state, quick PIN touch pad, station memory toggle, and clean session termination on logout.
- **RBAC / Permissions**: 20 granular permissions categorized across 9 functional domains. Two primary roles:
  - `admin`: Full management and administrative access across all 20 permissions.
  - `staff`: Tailored operational access across 8 floor permissions with automatic route and action-level protection.
- **Dashboard**: Executive operations dashboard featuring real-time KPI metrics (Sales Revenue, Active Orders, Staff On Duty) and station telemetry.
- **Menu / Product Management**: Comprehensive catalog management supporting device-based image uploads, formatted pricing, stock toggling, single dish naming, and deletion protection.
- **Categories**: Category manager with duplicate prevention, real-time filtering, and category deletion safety checks.
- **POS**: Point-of-Sale terminal routing and table-specific ordering workflows.
- **Orders**: Kitchen and live order management tracking order queue tickets across workflow states (`In Progress`, `Ready`, `Completed`) with cancellation action gates.
- **Payments**: Multi-tender payment recording supporting Cash, Credit Card, Debit Card, QR Code, and Digital Wallet with dual-currency cash change calculations.
- **Sales**: Complete historical transaction ledger recording order numbers, timestamps, table assignments, itemized breakdowns, taxes, and tender methods.
- **Sales Search & Filters**: Multi-faceted real-time filtering across 5 dimensions simultaneously: Date range, Payment method, Order type, Payment status, and Omni-search.
- **Refunds**: Automated refund engine enforcing 10 core business invariants: partial line-item refunds, remaining refundable balance calculations, cumulative limit checks, and printable reverse refund transactions.
- **Customers**: Per-transaction guest identity tracking supporting named diners and walk-in guests with automatic receipt and refund linkage.
- **Staff**: Team member roster management, active shift toggling (`Active` / `Off Duty`), station assignments, and role-based editing.
- **Tables**: Interactive floor plan supporting multiple sections (Main Dining, Indoor Booths, Outdoor Terrace), occupancy state toggling, and table QR code printing.
- **Reports**: Executive analytics reports covering gross revenues, top performing categories, and station metrics.
- **Customer QR Menu**: Public, mobile-optimized guest interface with category chips, dish search, item counters, cart drawer, and direct send-to-kitchen order dispatch.

---

## Tech Stack

The application is built using modern web standards without external runtime backend dependencies:

| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **React** | `^19.0.1` | Core UI component architecture |
| **React DOM** | `^19.0.1` | DOM rendering engine |
| **React Router DOM** | `^7.18.4` | Client-side routing & route guards |
| **TypeScript** | `^7.0.2` | Static type checking and domain models |
| **Tailwind CSS** | `^4.3.3` | Utility-first responsive design styling |
| **@tailwindcss/vite** | `^4.3.3` | Native Vite integration for Tailwind v4 |
| **Vite** | `^8.3.0` | Ultra-fast development server & bundler |
| **Zustand** | `^5.0.15` | Lightweight client state management & session persistence |
| **Lucide React** | `^0.546.0` | Production vector icon library |
| **Motion** | `^12.23.24` | Animation and transition primitives |
| **tsx** | `^4.21.0` | TypeScript test execution runner |

---

## Requirements

- **Node.js**: `v18.0.0` or higher (`v20+` recommended)
- **npm**: `v9.0.0` or higher

---

## Installation

Install all dependencies using npm:

```bash
npm install
```

---

## Development

Start the local development server:

```bash
npm run dev
```

The application will be accessible at:
- **Local**: `http://localhost:3000/`
- **Network**: `http://<local-ip>:3000/`

---

## Lint / Type Check

Run TypeScript static verification without emitting build artifacts:

```bash
npm run lint
```

---

## Build

Compile and bundle the application for production:

```bash
npm run build
```

This compiles optimized client assets into the `dist/` directory.

---

## Testing

Execute the complete automated test suite (15 regression and domain test suites):

```bash
for f in $(find src -name "*.test.ts" | sort); do npx tsx "$f"; done
```

Or execute individual test suites directly with `npx tsx`:

```bash
# Permissions & RBAC tests
npx tsx src/auth/permissions.test.ts

# Product management tests
npx tsx src/data/products.test.ts

# Sales list & details tests
npx tsx src/data/sales9A.test.ts
npx tsx src/data/sales9B.test.ts
npx tsx src/data/sales9C.test.ts

# Sales filtering & summary tests
npx tsx src/data/sales9D.test.ts
npx tsx src/data/sales9E.test.ts

# Refund workflow & invariant tests
npx tsx src/data/sales9F.test.ts
npx tsx src/data/refund9F3.test.ts
npx tsx src/data/refund9F3B.test.ts
npx tsx src/data/refund9F3C.test.ts
npx tsx src/data/refund9F3D.test.ts
npx tsx src/data/refund9F4.test.ts
npx tsx src/data/refund9F4B.test.ts
npx tsx src/data/refund9F4C.test.ts
```

---

## Production Build

The production build is generated via Vite using standard ES module output:

- **HTML Entry**: `dist/index.html` (~0.9 kB)
- **Styles**: `dist/assets/index-*.css` (~54.7 kB, ~9.8 kB gzip)
- **JavaScript Bundle**: `dist/assets/index-*.js` (~451.3 kB, ~123.8 kB gzip)

To preview the production bundle locally:

```bash
npm run preview
```

---

## Environment Variables

**No external environment variables are required** to run the frontend application locally or in production.

For AI Studio integration, an optional template is provided in `.env.example`:
- `GEMINI_API_KEY`: Placeholder for optional Gemini API features.
- `APP_URL`: Optional hosting URL reference for hosted environments.

---

## Project Structure

```
RestoControl/
├── docs/                      # Architectural and domain documentation
│   ├── 06-authentication.md   # Authentication architecture & session flow
│   ├── 07-role-permissions.md  # RBAC specification & permission matrices
│   ├── 10-menu-management.md  # Menu & catalog management specification
│   ├── 11-sales-management.md # Sales history, receipts & filtering architecture
│   ├── refunds.md             # Refund business rules & calculation invariants
│   ├── testing.md             # Automated test suite coverage & execution guide
│   └── deployment.md          # Production deployment guide
├── public/                    # Static assets
├── src/
│   ├── auth/                  # Zustand auth store, mock users, permission registry
│   ├── components/            # Reusable UI component library
│   │   ├── auth/              # ProtectedRoute, PermissionGate
│   │   ├── customer/          # CartDrawer, QRProductCard
│   │   ├── layout/            # Navigation, headers, sidebar
│   │   ├── menu/              # MenuCard, MenuTable, Add/Edit modals, CategoryManager
│   │   ├── sales/             # SalesTable, SalesFilters, SaleDetailModal, SaleReceiptModal
│   │   ├── staff/             # StaffTable
│   │   └── ui/                # Button, Input, Modal, Card, Badge, EmptyState, LoadingState
│   ├── data/                  # Test fixtures (mockData.ts) and 15 automated test suites
│   ├── hooks/                 # Custom React hooks (useAuth, usePermission, usePartialRefund, useFullRefund)
│   ├── layouts/               # DashboardLayout shell
│   ├── pages/                 # Route page components (Dashboard, Menu, Sales, Staff, Tables, etc.)
│   ├── routes/                # Central AppRoutes and route definitions
│   ├── types/                 # Domain interfaces (MenuItem, Transaction, Table, StaffMember, etc.)
│   └── utils/                 # Business logic engines (refundRules, refundUtils, format, salesSearch)
├── .env.example               # Environment variable template
├── package.json               # Scripts and dependency specifications
├── tsconfig.json              # TypeScript compiler configuration
└── vite.config.ts             # Vite bundler configuration
```

---

## Demo / Test Data

- **Production Runtime**: The production application starts in a completely clean state:
  - Products: `0`
  - Orders: `0`
  - Sales: `0`
  - Refunds: `0`
  - Staff: `0`
  - Default Table Configuration: `8` floor tables across 3 dining sections.
- **Test Fixtures**: Static reference fixtures are isolated in `src/data/mockData.ts` to power the automated regression test suites without polluting production runtime state.

---

## Current Status

- **Status**: Production Ready (Frontend Architecture)
- **Static Verification**: `npm run lint` passing (0 errors).
- **Build Verification**: `npm run build` passing cleanly.
- **Automated Tests**: 15 of 15 automated test suites passing (100% pass rate).
- **Security Audit**: All 20 RBAC permissions verified, zero exposed secrets, zero unsafe frontend APIs (`eval`, `dangerouslySetInnerHTML`).
