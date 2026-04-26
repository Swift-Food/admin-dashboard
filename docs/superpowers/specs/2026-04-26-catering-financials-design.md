# Catering Financial Metrics Dashboard — Design Spec

**Date:** 2026-04-26  
**Status:** Approved

---

## Overview

A new standalone admin page in the Swift sidebar that surfaces per-order financial data from `GET /catering-orders/financial-metrics`. Admins can filter by date range, browse paginated order rows, and read full-period aggregate totals from KPI cards and a sticky table footer.

---

## Architecture

### New files

| File | Purpose |
|------|---------|
| `src/types/catering-financials.types.ts` | TypeScript types for the API response |
| `src/services/catering-financials.service.ts` | Single `getFinancialMetrics(params)` function using `http` client |
| `src/pages/CateringFinancialsScreen.tsx` | Full page component — state, UI, table |

### Modified files

| File | Change |
|------|--------|
| `src/components/Sidebar.tsx` | Add `"catering-financials"` to `SidebarPage` union and Swift nav items |
| `src/App.tsx` | Add route mapping and `renderPage` case for `"catering-financials"` |

---

## Types (`catering-financials.types.ts`)

```ts
export interface FinancialOrder {
  orderId: string;
  paymentId: string | null;
  orderDate: string;
  customerEmail: string;
  promoCode: string | null;
  grossOrderValue: number;
  grossExclDelivery: number;
  commission: number;
  deliveryFee: number;
  serviceCharge: number;
  paymentProcessingFee: number;
  invoicingFee: number;
  amountOwedToRestaurant: number;
  totalPlatformRevenue: number;
  profit: number;
}

export interface FinancialTotals {
  orderCount: number;
  grossOrderValue: number;
  grossExclDelivery: number;
  commission: number;
  deliveryFee: number;
  serviceCharge: number;
  paymentProcessingFee: number;
  invoicingFee: number;
  amountOwedToRestaurant: number;
  totalPlatformRevenue: number;
  profit: number;
}

export interface FinancialPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FinancialMetricsResponse {
  orders: FinancialOrder[];
  totals: FinancialTotals;
  pagination: FinancialPagination;
}

export interface FinancialMetricsParams {
  from: string;   // ISO date, e.g. "2025-01-01"
  to: string;     // ISO date, e.g. "2025-12-31"
  page?: number;
  limit?: number;
}
```

---

## Service (`catering-financials.service.ts`)

Single exported function:

```ts
getFinancialMetrics(params: FinancialMetricsParams): Promise<FinancialMetricsResponse>
```

Calls `GET /catering-orders/financial-metrics` via the shared `http` Axios client (auth header injected by interceptor).

---

## Page Component (`CateringFinancialsScreen.tsx`)

### State

| Variable | Type | Default |
|----------|------|---------|
| `fromDate` | `string` | First day of current calendar month (`YYYY-MM-DD`) |
| `toDate` | `string` | Today (`YYYY-MM-DD`) |
| `pendingFrom` | `string` | Mirrors `fromDate` (controlled input before Apply) |
| `pendingTo` | `string` | Mirrors `toDate` (controlled input before Apply) |
| `page` | `number` | `1` |
| `data` | `FinancialMetricsResponse \| null` | `null` |
| `loading` | `boolean` | `true` |
| `error` | `string \| undefined` | `undefined` |

Fetch fires on mount and whenever `fromDate`, `toDate`, or `page` changes.  
Applying the date filter sets `fromDate`/`toDate` from pending values and resets `page` to 1.

### Layout (top to bottom)

1. **Page header** — title "Catering Financials", subtitle with the active date range
2. **Date filter bar** — two `<input type="date">` (From / To) + "Apply" button, consistent with existing page styles
3. **KPI cards row** — 5 cards (see below)
4. **Table section** — horizontally scrollable, 14 columns, sticky totals row at bottom of `<tbody>`
5. **Pagination row** — "Showing X–Y of Z orders" label + Prev / Next buttons

### KPI Cards

All values sourced from `totals` (full-period aggregates, not current page).

| Card | Field | Format |
|------|-------|--------|
| Total Gross Revenue | `grossOrderValue` | £ currency |
| Total Commission | `commission` | £ currency |
| Total Platform Revenue | `totalPlatformRevenue` | £ currency |
| Total Profit | `profit` | £ currency |
| Orders | `orderCount` | Integer |

Cards use the gradient style already present in `CateringOrdersTableView` (`bg-gradient-to-br from-X-50 to-X-100`).

### Table Columns (in order)

| # | Header | Field | Align | Notes |
|---|--------|-------|-------|-------|
| 1 | Order Date | `orderDate` | Left | `toLocaleDateString()` |
| 2 | Customer Email | `customerEmail` | Left | |
| 3 | Payment ID | `paymentId` | Left | Truncated: first 8 chars + `...` + last 4; full value on `title` tooltip; `—` if null |
| 4 | Promo Code | `promoCode` | Left | `—` if null |
| 5 | Gross Value | `grossOrderValue` | Right | £ format |
| 6 | Gross excl. Delivery | `grossExclDelivery` | Right | £ format |
| 7 | Commission | `commission` | Right | £ format |
| 8 | Delivery Fee | `deliveryFee` | Right | £ format |
| 9 | Service Charge | `serviceCharge` | Right | £ format |
| 10 | Processing Fee | `paymentProcessingFee` | Right | `—` if 0, else £ format |
| 11 | Invoicing Fee (0.4%) | `invoicingFee` | Right | £ format |
| 12 | Owed to Restaurant | `amountOwedToRestaurant` | Right | £ format |
| 13 | Platform Revenue | `totalPlatformRevenue` | Right | £ format |
| 14 | Profit | `profit` | Right | £ format |

**Currency format:** `£X,XXX.XX` using `toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })`.

**Payment ID truncation:** `pi_3Sct...nuk2` — show first 8 characters, `...`, last 4 characters. Full value exposed via `title` attribute for hover.

### Totals Row

- Rendered as the last `<tr>` inside `<tbody>` (not a `<tfoot>` pinned to the viewport)
- Label "Total" spans the first 4 non-numeric columns (or uses a single cell with `colspan`)
- All numeric cells show the `totals` object values — same formatting as body rows
- Visual distinction: `font-bold`, `bg-gray-100` background, top border `border-t-2 border-gray-300`

### Pagination

Below the table card:
- Text: `Showing {start}–{end} of {total} orders` (start = `(page-1)*limit + 1`, end = `min(page*limit, total)`)
- Prev button: disabled on page 1
- Next button: disabled on last page
- Page changes trigger a new fetch; date filters are preserved

### Loading State

Full-page skeleton:
- 5 placeholder KPI card outlines (animated pulse)
- Table with 8 skeleton rows (gray bars in each cell)

Matches the visual structure of the loaded state so there's no layout shift.

### Error State

Centered error message with red text and a "Try again" button that re-triggers the fetch.

---

## Routing & Sidebar Wiring

### `Sidebar.tsx`
- Add `"catering-financials"` to the `SidebarPage` union type
- Add nav item to the Swift section: label `"Catering Financials"`, icon `faChartLine` (or similar money/chart icon from FontAwesome already imported)

### `App.tsx`
- Add `"catering-financials": "catering-financials"` to `pathToPageMap` and `pageToPathMap`
- Add `"catering-financials"` to `swiftPages` array
- Add `case "catering-financials": return <CateringFinancialsScreen />;` in `renderPage`

---

## Constraints & Notes

- No CSV export in this version
- No column sorting in this version (financial view is date-ordered from the API)
- All monetary values are plain GBP numbers from the API — no conversion
- `paymentProcessingFee === 0` → render `—` (bank transfer orders)
- Table must be horizontally scrollable on smaller screens (`overflow-x-auto` wrapper)
- 50 rows per page (passed as `limit=50` in the request)
