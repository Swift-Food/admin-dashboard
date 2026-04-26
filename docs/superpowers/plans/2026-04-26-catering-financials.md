# Catering Financial Metrics Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone "Catering Financials" admin page in the Swift sidebar that consumes `GET /catering-orders/financial-metrics` and displays KPI cards, a paginated order table with a sticky totals row, and a date range filter.

**Architecture:** Single page component (`CateringFinancialsScreen.tsx`) backed by a dedicated service and types file. The page is wired into the existing `App.tsx` router and `Sidebar.tsx` nav, following the identical patterns used by `CateringOrdersTableView.tsx` and `CorporateOrdersTableView.tsx`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Axios (via shared `src/services/http.ts`), React Router v6, FontAwesome icons.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/types/catering-financials.types.ts` | API response types |
| Create | `src/services/catering-financials.service.ts` | `getFinancialMetrics()` API call |
| Create | `src/pages/CateringFinancialsScreen.tsx` | Full page: state, filter, KPI cards, table, pagination |
| Modify | `src/components/Sidebar.tsx` | Add `"catering-financials"` to union + nav section |
| Modify | `src/App.tsx` | Add path maps, swiftPages entry, and renderPage case |

---

## Task 1: Types and Service

**Files:**
- Create: `src/types/catering-financials.types.ts`
- Create: `src/services/catering-financials.service.ts`

- [ ] **Step 1: Create the types file**

Create `src/types/catering-financials.types.ts` with this exact content:

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
  from: string;
  to: string;
  page?: number;
  limit?: number;
}
```

- [ ] **Step 2: Create the service file**

Create `src/services/catering-financials.service.ts` with this exact content:

```ts
import http from "./http";
import type {
  FinancialMetricsParams,
  FinancialMetricsResponse,
} from "../types/catering-financials.types";

const getFinancialMetrics = async (
  params: FinancialMetricsParams
): Promise<FinancialMetricsResponse> => {
  const res = await http.get<FinancialMetricsResponse>(
    "catering-orders/financial-metrics",
    { params }
  );
  return res.data;
};

export default { getFinancialMetrics };
```

- [ ] **Step 3: Commit**

```bash
git add src/types/catering-financials.types.ts src/services/catering-financials.service.ts
git commit -m "feat: add catering financials types and service"
```

---

## Task 2: Wire Sidebar and Router

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add `"catering-financials"` to the `SidebarPage` union in `Sidebar.tsx`**

In `src/components/Sidebar.tsx`, find the `SidebarPage` type (around line 31) and add `"catering-financials"` to it:

```ts
export type SidebarPage =
  | "home"
  | "orders"
  | "promotions"
  | "restaurant"
  | "categories"
  | "event-categories"
  | "events"
  | "calendars"
  | "event-locations"
  | "driver-status"
  | "statistics"
  | "map"
  | "catering"
  | "catering-sessions"
  | "catering-financials"
  | "bundles"
  | "catering-bundles"
  | "payout"
  | "corporate"
  | "stripe-accounts"
  | "coworking-spaces"
  | "pending-transfers"
  | "partner-spaces"
  | "miscellaneous";
```

- [ ] **Step 2: Add the nav item to the "Orders" section in `Sidebar.tsx`**

Find the `navSections` array, locate the `"orders"` section (around line 127), and add the new item after the `"catering-sessions"` entry:

```ts
{
  id: "orders",
  label: "Orders",
  mode: "swift",
  items: [
    {
      id: "orders",
      label: "Orders",
      icon: <FontAwesomeIcon icon={faReceipt} style={iconCommonStyle} />,
    },
    {
      id: "catering",
      label: "Catering Orders",
      icon: <FontAwesomeIcon icon={faUsers} style={iconCommonStyle} />,
    },
    {
      id: "catering-sessions",
      label: "Drivers",
      icon: <FontAwesomeIcon icon={faMotorcycle} style={iconCommonStyle} />,
    },
    {
      id: "catering-financials",
      label: "Catering Financials",
      icon: <FontAwesomeIcon icon={faChartBar} style={iconCommonStyle} />,
    },
  ],
},
```

Note: `faChartBar` is already imported at the top of `Sidebar.tsx` — no new import needed.

- [ ] **Step 3: Update `App.tsx` — path maps**

In `src/App.tsx`, add `"catering-financials"` to both path maps:

In `pathToPageMap`:
```ts
"catering-financials": "catering-financials",
```

In `pageToPathMap`:
```ts
"catering-financials": "catering-financials",
```

- [ ] **Step 4: Update `App.tsx` — swiftPages array**

Find the `swiftPages` array and add `"catering-financials"`:

```ts
const swiftPages: SidebarPage[] = [
  "home",
  "orders",
  "catering",
  "catering-sessions",
  "catering-financials",
  "corporate",
  "restaurant",
  "categories",
  "promotions",
  "payout",
  "stripe-accounts",
  "driver-status",
  "statistics",
  "map",
  "miscellaneous",
  "catering-bundles",
  "pending-transfers",
  "partner-spaces",
];
```

- [ ] **Step 5: Update `App.tsx` — import and renderPage case**

Add the import near the top of `App.tsx` (after the existing catering import):

```ts
import CateringFinancialsScreen from "./pages/CateringFinancialsScreen";
```

Add the case in the `renderPage` switch statement (after the `"catering-sessions"` case):

```ts
case "catering-financials":
  return <CateringFinancialsScreen />;
```

- [ ] **Step 6: Commit**

```bash
git add src/components/Sidebar.tsx src/App.tsx
git commit -m "feat: wire catering-financials route and sidebar entry"
```

---

## Task 3: Page Shell — State, Fetching, Loading and Error States

**Files:**
- Create: `src/pages/CateringFinancialsScreen.tsx`

This task produces a page that renders a loading skeleton or error state correctly. KPI cards and the table come in later tasks.

- [ ] **Step 1: Create the page file**

Create `src/pages/CateringFinancialsScreen.tsx` with this exact content:

```tsx
import { useState, useEffect } from "react";
import type {
  FinancialMetricsResponse,
} from "../types/catering-financials.types";
import cateringFinancialsService from "../services/catering-financials.service";

const LIMIT = 50;

function getDefaultDates() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: from.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

function truncatePaymentId(id: string | null): string {
  if (!id) return "—";
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}

const LoadingSkeleton = () => (
  <div className="min-h-screen bg-gray-50 p-8 animate-pulse">
    <div className="h-9 w-64 bg-gray-200 rounded mb-2" />
    <div className="h-5 w-48 bg-gray-200 rounded mb-8" />
    {/* Filter bar skeleton */}
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 flex gap-4">
      <div className="h-10 w-40 bg-gray-200 rounded-lg" />
      <div className="h-10 w-40 bg-gray-200 rounded-lg" />
      <div className="h-10 w-24 bg-gray-200 rounded-lg" />
    </div>
    {/* KPI cards skeleton */}
    <div className="grid grid-cols-5 gap-4 mb-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="h-4 w-28 bg-gray-200 rounded mb-3" />
          <div className="h-8 w-24 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
    {/* Table skeleton */}
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="h-12 bg-gray-100 border-b border-gray-200" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-6 py-4 border-b border-gray-100">
          <div className="h-4 w-24 bg-gray-200 rounded" />
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="h-4 w-28 bg-gray-200 rounded" />
          <div className="h-4 w-16 bg-gray-200 rounded ml-auto" />
        </div>
      ))}
    </div>
  </div>
);

const CateringFinancialsScreen = () => {
  const defaults = getDefaultDates();
  const [fromDate, setFromDate] = useState(defaults.from);
  const [toDate, setToDate] = useState(defaults.to);
  const [pendingFrom, setPendingFrom] = useState(defaults.from);
  const [pendingTo, setPendingTo] = useState(defaults.to);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<FinancialMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    cateringFinancialsService
      .getFinancialMetrics({ from: fromDate, to: toDate, page, limit: LIMIT })
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((e: any) => {
        if (!cancelled) {
          setError(e?.message || "Failed to load financial metrics");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fromDate, toDate, page]);

  const handleApply = () => {
    setFromDate(pendingFrom);
    setToDate(pendingTo);
    setPage(1);
  };

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-red-600 text-lg font-semibold">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            setError(undefined);
            cateringFinancialsService
              .getFinancialMetrics({ from: fromDate, to: toDate, page, limit: LIMIT })
              .then((res) => { setData(res); setLoading(false); })
              .catch((e: any) => { setError(e?.message || "Failed to load financial metrics"); setLoading(false); });
          }}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { orders, totals, pagination } = data;
  const start = (pagination.page - 1) * pagination.limit + 1;
  const end = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Catering Financials</h1>
        <p className="text-gray-600">
          {new Date(fromDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          {" — "}
          {new Date(toDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Date filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">From</label>
          <input
            type="date"
            value={pendingFrom}
            max={pendingTo}
            onChange={(e) => setPendingFrom(e.target.value)}
            className="px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">To</label>
          <input
            type="date"
            value={pendingTo}
            min={pendingFrom}
            onChange={(e) => setPendingTo(e.target.value)}
            className="px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={handleApply}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
        >
          Apply
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200 shadow-sm">
          <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide mb-2">Total Gross Revenue</p>
          <p className="text-2xl font-bold text-blue-900">{formatCurrency(totals.grossOrderValue)}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl border border-green-200 shadow-sm">
          <p className="text-xs text-green-700 font-semibold uppercase tracking-wide mb-2">Total Commission</p>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(totals.commission)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl border border-purple-200 shadow-sm">
          <p className="text-xs text-purple-700 font-semibold uppercase tracking-wide mb-2">Platform Revenue</p>
          <p className="text-2xl font-bold text-purple-900">{formatCurrency(totals.totalPlatformRevenue)}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-5 rounded-xl border border-orange-200 shadow-sm">
          <p className="text-xs text-orange-700 font-semibold uppercase tracking-wide mb-2">Total Profit</p>
          <p className="text-2xl font-bold text-orange-900">{formatCurrency(totals.profit)}</p>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">Orders</p>
          <p className="text-2xl font-bold text-gray-900">{totals.orderCount.toLocaleString()}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
              <tr>
                {[
                  { label: "Order Date", align: "left" },
                  { label: "Customer Email", align: "left" },
                  { label: "Payment ID", align: "left" },
                  { label: "Promo Code", align: "left" },
                  { label: "Gross Value", align: "right" },
                  { label: "Gross excl. Delivery", align: "right" },
                  { label: "Commission", align: "right" },
                  { label: "Delivery Fee", align: "right" },
                  { label: "Service Charge", align: "right" },
                  { label: "Processing Fee", align: "right" },
                  { label: "Invoicing Fee (0.4%)", align: "right" },
                  { label: "Owed to Restaurant", align: "right" },
                  { label: "Platform Revenue", align: "right" },
                  { label: "Profit", align: "right" },
                ].map(({ label, align }) => (
                  <th
                    key={label}
                    className={`px-4 py-3 text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap text-${align}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr key={order.orderId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                    {new Date(order.orderDate).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">
                    {order.customerEmail}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono text-xs" title={order.paymentId ?? undefined}>
                    {truncatePaymentId(order.paymentId)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {order.promoCode ?? "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right font-medium text-gray-900">{formatCurrency(order.grossOrderValue)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-gray-700">{formatCurrency(order.grossExclDelivery)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-gray-700">{formatCurrency(order.commission)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-gray-700">{formatCurrency(order.deliveryFee)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-gray-700">{formatCurrency(order.serviceCharge)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-gray-700">
                    {order.paymentProcessingFee === 0 ? "—" : formatCurrency(order.paymentProcessingFee)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-gray-700">{formatCurrency(order.invoicingFee)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-gray-700">{formatCurrency(order.amountOwedToRestaurant)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-gray-700">{formatCurrency(order.totalPlatformRevenue)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-right font-semibold text-gray-900">{formatCurrency(order.profit)}</td>
                </tr>
              ))}

              {/* Totals row */}
              <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                <td colSpan={4} className="px-4 py-3 text-gray-900 font-bold">
                  Total ({pagination.total} orders)
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900">{formatCurrency(totals.grossOrderValue)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900">{formatCurrency(totals.grossExclDelivery)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900">{formatCurrency(totals.commission)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900">{formatCurrency(totals.deliveryFee)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900">{formatCurrency(totals.serviceCharge)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900">{formatCurrency(totals.paymentProcessingFee)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900">{formatCurrency(totals.invoicingFee)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900">{formatCurrency(totals.amountOwedToRestaurant)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900">{formatCurrency(totals.totalPlatformRevenue)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900">{formatCurrency(totals.profit)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{start}</span>–
          <span className="font-semibold text-gray-900">{end}</span> of{" "}
          <span className="font-semibold text-gray-900">{pagination.total}</span> orders
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 1}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Prev
          </button>
          <span className="px-4 py-2 text-sm text-gray-700 font-medium">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= pagination.totalPages}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default CateringFinancialsScreen;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/arnavvaish/Code/Swift/admin-dashboard && npx tsc --noEmit
```

Expected: no errors. If errors appear, fix them before committing.

- [ ] **Step 3: Commit**

```bash
git add src/pages/CateringFinancialsScreen.tsx
git commit -m "feat: add CateringFinancialsScreen with KPI cards, table, pagination, and skeleton"
```

---

## Self-Review Checklist

Run through this after all tasks are committed:

- [ ] "Catering Financials" appears in the Swift sidebar
- [ ] Navigating to `/swift/catering-financials` loads the page
- [ ] Loading skeleton shows on first load
- [ ] KPI cards show full-period totals (not current page)
- [ ] Date filter defaults to first day of current month → today
- [ ] Changing dates and clicking Apply resets to page 1 and refetches
- [ ] Table has 14 columns (no Status column)
- [ ] Payment IDs truncate correctly; full value visible on hover
- [ ] `paymentProcessingFee === 0` rows show `—` not `£0.00`
- [ ] Null `paymentId` shows `—`; null `promoCode` shows `—`
- [ ] Totals row shows full-period sums (same values as KPI cards for overlapping fields)
- [ ] Pagination "Showing X–Y of Z" is correct
- [ ] Prev disabled on page 1; Next disabled on last page
- [ ] Table scrolls horizontally on narrow viewport
- [ ] Error state shows with "Try again" button
