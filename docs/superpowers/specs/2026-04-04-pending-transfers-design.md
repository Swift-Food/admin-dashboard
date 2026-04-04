# Pending Stripe Transfers Admin Page — Design

**Date:** 2026-04-04  
**Status:** Approved

---

## Overview

A read-only admin page in the Swift mode Finance section that displays all pending Stripe transfers, split into catering restaurant payouts and venue hire payouts. The page fetches from `GET /payments/admin/pending-transfers` (admin JWT, handled automatically by the existing `http.ts` interceptor).

---

## New Files

### `src/services/pending-transfers.service.ts`

Single function `getPendingTransfers()` calling `GET /payments/admin/pending-transfers` via the shared `http` axios instance. Returns the full response shape typed as `PendingTransfersResponse`.

Types defined inline in the service file (no separate types file needed — only consumed by this one page):

```ts
PendingTransfersResponse {
  summary: {
    totalPendingCateringAmount: number
    totalPendingVenueHireAmount: number
    totalPendingAmount: number
    cateringOrderCount: number
    coworkingOrderCount: number
  }
  cateringTransfers: CateringTransfer[]
  venueHireTransfers: VenueHireTransfer[]
}

CateringTransfer {
  orderId: string
  customerName: string
  eventDate: string          // ISO date string
  status: "paid" | "completed"
  scheduledTransferDate: string | null
  finalTotal: number | null
  restaurantPayouts: { restaurantId: string; accountName: string; earningsAmount: number }[]
  totalRestaurantPayout: number
  transferRetryCount: number
  transferFailureReason: string | null
  isPastDue: boolean
}

VenueHireTransfer {
  coworkingOrderId: string
  cateringOrderId: string | null
  venueHireFee: number
  netAmount: number
  stripeFee: number
  scheduledTransferDate: string | null
  isPastDue: boolean
}
```

### `src/pages/PendingTransfersScreen.tsx`

Single-file page component. No sub-directory needed (no CSS file — uses Tailwind inline like CoworkingSpacesScreen).

---

## Modified Files

### `src/components/Sidebar.tsx`

- Add `"pending-transfers"` to the `SidebarPage` union type.
- Add a nav item to the `finance` section (Swift mode): label "Pending Transfers", icon `faExchangeAlt` (FontAwesome).

### `src/App.tsx`

- Add entry to `pathToPageMap`: `"pending-transfers": "pending-transfers"`.
- Add entry to `pageToPathMap`: `"pending-transfers": "pending-transfers"`.
- Add `"pending-transfers"` to the `swiftPages` array.
- Add `case "pending-transfers": return <PendingTransfersScreen />;` to `renderPage()`.
- Import `PendingTransfersScreen`.

---

## Page Layout

### Summary Cards (top row)

Four cards displayed in a horizontal row:

| Card | Value |
|------|-------|
| Total Pending | `£{totalPendingAmount}` |
| Catering Pending | `£{totalPendingCateringAmount}` with `{cateringOrderCount} orders` sub-label |
| Venue Hire Pending | `£{totalPendingVenueHireAmount}` with `{coworkingOrderCount} orders` sub-label |
| Past Due | Count of rows across both tables where `isPastDue=true` |

### Catering Payouts Table

Heading: "Catering Payouts" with row count badge.

Columns:

| Column | Source | Notes |
|--------|--------|-------|
| Customer | `customerName` | |
| Event Date | `eventDate` | Formatted `DD MMM YYYY` |
| Status | `status` | Pill badge: `paid` = blue, `completed` = green |
| Scheduled Date | `scheduledTransferDate` | `—` if null |
| Restaurant Payouts | `restaurantPayouts` | Collapsed: "N restaurant(s)". Expanded: list of `accountName → £X.XX` |
| Total Payout | `totalRestaurantPayout` | `£X.XX` |
| Retries | `transferRetryCount` | Plain number |
| Failure Reason | `transferFailureReason` | `—` if null; shown as truncated text with full text on hover via `title` attribute |

Row highlighting (mutually exclusive, failure takes priority):
- `transferFailureReason` set → red background tint + red left border (`border-l-4 border-red-400 bg-red-50`)
- `isPastDue` → amber background tint + amber left border (`border-l-4 border-amber-400 bg-amber-50`)
- Neither → standard white row

### Venue Hire Payouts Table

Heading: "Venue Hire Payouts" with row count badge.

Columns:

| Column | Source | Notes |
|--------|--------|-------|
| Coworking Order ID | `coworkingOrderId` | |
| Catering Order ID | `cateringOrderId` | `—` if null |
| Gross Fee | `venueHireFee` | `£X.XX` |
| Stripe Fee | `stripeFee` | `£X.XX` |
| Net Payout | `netAmount` | `£X.XX` |
| Scheduled Date | `scheduledTransferDate` | `—` if null |

Same row highlighting rules as catering table (`isPastDue` only — no failure reason field on venue hire rows).

---

## State & Data Flow

```
PendingTransfersScreen mounts
  → sets loading=true
  → calls pendingTransfersService.getPendingTransfers()
  → on success: stores response, loading=false
  → on error: stores error message, loading=false

expandedOrderIds: Set<string>  — tracks which catering rows have payouts expanded
```

No polling (data doesn't need real-time updates). Manual refresh not required (read-only, admin visits when needed).

---

## Error & Loading States

- Loading: centered spinner with "Loading pending transfers..."
- Error: red error message with the error text
- Empty tables: "No pending catering transfers" / "No pending venue hire transfers" centered in the table body

---

## Formatting Helpers (defined locally in the file)

```ts
formatGBP(amount: number): string  // → "£1,234.56"
formatDate(iso: string | null): string  // → "02 Apr 2026" or "—"
```

---

## Route

`/swift/pending-transfers` — accessible from the Finance section of the Swift mode sidebar.
