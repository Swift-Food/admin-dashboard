# Pending Stripe Transfers Admin Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only admin page at `/swift/pending-transfers` that displays pending Stripe transfers split into catering restaurant payouts and venue hire payouts.

**Architecture:** A service file wraps the single API call and owns all types. A single-file page component handles fetching, state, and rendering (summary cards + two tables with inline expand for restaurant payouts). Sidebar and routing are wired up to expose the page under Swift → Finance.

**Tech Stack:** React + TypeScript, Tailwind CSS, Axios (via existing `src/services/http.ts`), FontAwesome icons.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/services/pending-transfers.service.ts` | Types + single API fetch function |
| Create | `src/pages/PendingTransfersScreen.tsx` | Full page: summary cards, two tables, expand logic |
| Modify | `src/components/Sidebar.tsx` | Add `SidebarPage` type entry + Finance nav item |
| Modify | `src/App.tsx` | Route maps, swiftPages array, import + renderPage case |

---

### Task 1: Create the service file with types

**Files:**
- Create: `src/services/pending-transfers.service.ts`

- [ ] **Step 1: Create the service file**

Create `src/services/pending-transfers.service.ts` with the following content:

```ts
import http from "./http";

export interface RestaurantPayout {
  restaurantId: string;
  accountName: string;
  earningsAmount: number;
}

export interface CateringTransfer {
  orderId: string;
  customerName: string;
  eventDate: string;
  status: "paid" | "completed";
  scheduledTransferDate: string | null;
  finalTotal: number | null;
  restaurantPayouts: RestaurantPayout[];
  totalRestaurantPayout: number;
  transferRetryCount: number;
  transferFailureReason: string | null;
  isPastDue: boolean;
}

export interface VenueHireTransfer {
  coworkingOrderId: string;
  cateringOrderId: string | null;
  venueHireFee: number;
  netAmount: number;
  stripeFee: number;
  scheduledTransferDate: string | null;
  isPastDue: boolean;
}

export interface PendingTransfersSummary {
  totalPendingCateringAmount: number;
  totalPendingVenueHireAmount: number;
  totalPendingAmount: number;
  cateringOrderCount: number;
  coworkingOrderCount: number;
}

export interface PendingTransfersResponse {
  summary: PendingTransfersSummary;
  cateringTransfers: CateringTransfer[];
  venueHireTransfers: VenueHireTransfer[];
}

const getPendingTransfers = async (): Promise<PendingTransfersResponse> => {
  const { data } = await http.get<PendingTransfersResponse>(
    "/payments/admin/pending-transfers"
  );
  return data;
};

export default { getPendingTransfers };
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

Expected: no errors (or only pre-existing errors unrelated to the new file).

- [ ] **Step 3: Commit**

```bash
git add src/services/pending-transfers.service.ts
git commit -m "feat: add pending-transfers service and types"
```

---

### Task 2: Wire up Sidebar and routing

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add `"pending-transfers"` to the SidebarPage union in `src/components/Sidebar.tsx`**

Find the `SidebarPage` type (around line 29). The current last entry is `| "miscellaneous";`. Change it to:

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
  | "bundles"
  | "catering-bundles"
  | "payout"
  | "corporate"
  | "stripe-accounts"
  | "coworking-spaces"
  | "pending-transfers"
  | "miscellaneous";
```

- [ ] **Step 2: Add `faRightLeft` to the FontAwesome import in `src/components/Sidebar.tsx`**

The existing import block starts at line 4. Add `faRightLeft` to the destructured list:

```ts
import {
  faHome,
  faMotorcycle,
  faChartBar,
  faMap,
  faChevronLeft,
  faChevronRight,
  faChevronDown,
  faUtensils,
  faTags,
  faReceipt,
  faMoneyBillWave,
  faUsers,
  faLayerGroup,
  faBox,
  faCreditCard,
  faWrench,
  faCalendarAlt,
  faBuilding,
  faRightLeft,
} from "@fortawesome/free-solid-svg-icons";
```

- [ ] **Step 3: Add the nav item to the Finance section in `src/components/Sidebar.tsx`**

Find the `finance` section in `navSections` (around line 214). It currently has `payout` and `stripe-accounts` items. Add `pending-transfers` after `stripe-accounts`:

```ts
{
  id: "finance",
  label: "Finance",
  mode: "swift",
  items: [
    {
      id: "payout",
      label: "Payouts",
      icon: <FontAwesomeIcon icon={faMoneyBillWave} style={iconCommonStyle} />,
    },
    {
      id: "stripe-accounts",
      label: "Stripe Accounts",
      icon: <FontAwesomeIcon icon={faCreditCard} style={iconCommonStyle} />,
    },
    {
      id: "pending-transfers",
      label: "Pending Transfers",
      icon: <FontAwesomeIcon icon={faRightLeft} style={iconCommonStyle} />,
    },
  ],
},
```

- [ ] **Step 4: Update `pathToPageMap` in `src/App.tsx`**

Add the entry `"pending-transfers": "pending-transfers"` to the map (after the `spaces` entry):

```ts
export const pathToPageMap: Record<string, SidebarPage> = {
  home: "home",
  orders: "orders",
  "catering-orders": "catering",
  "catering-sessions": "catering-sessions",
  "corporate-orders": "corporate",
  restaurants: "restaurant",
  categories: "categories",
  promotions: "promotions",
  payouts: "payout",
  "stripe-accounts": "stripe-accounts",
  drivers: "driver-status",
  statistics: "statistics",
  map: "map",
  miscellaneous: "miscellaneous",
  "event-categories": "event-categories",
  events: "events",
  "event-locations": "event-locations",
  calendars: "calendars",
  bundles: "bundles",
  "catering-bundles": "catering-bundles",
  spaces: "coworking-spaces",
  "pending-transfers": "pending-transfers",
};
```

- [ ] **Step 5: Update `pageToPathMap` in `src/App.tsx`**

Add the entry `"pending-transfers": "pending-transfers"` to the map (after `"coworking-spaces"`):

```ts
export const pageToPathMap: Record<SidebarPage, string> = {
  home: "home",
  orders: "orders",
  catering: "catering-orders",
  "catering-sessions": "catering-sessions",
  corporate: "corporate-orders",
  restaurant: "restaurants",
  categories: "categories",
  promotions: "promotions",
  payout: "payouts",
  "stripe-accounts": "stripe-accounts",
  "driver-status": "drivers",
  statistics: "statistics",
  map: "map",
  miscellaneous: "miscellaneous",
  "event-categories": "event-categories",
  events: "events",
  "event-locations": "event-locations",
  calendars: "calendars",
  bundles: "bundles",
  "catering-bundles": "catering-bundles",
  "coworking-spaces": "spaces",
  "pending-transfers": "pending-transfers",
};
```

- [ ] **Step 6: Add `"pending-transfers"` to `swiftPages` in `src/App.tsx`**

```ts
const swiftPages: SidebarPage[] = [
  "home",
  "orders",
  "catering",
  "catering-sessions",
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
];
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

Expected: no errors related to the `SidebarPage` type or map exhaustiveness.

- [ ] **Step 8: Commit**

```bash
git add src/components/Sidebar.tsx src/App.tsx
git commit -m "feat: add pending-transfers to sidebar and routing"
```

---

### Task 3: Build the PendingTransfersScreen page component

**Files:**
- Create: `src/pages/PendingTransfersScreen.tsx`
- Modify: `src/App.tsx` (import + renderPage case)

- [ ] **Step 1: Create `src/pages/PendingTransfersScreen.tsx`**

```tsx
import { useState, useEffect } from "react";
import pendingTransfersService from "../services/pending-transfers.service";
import type {
  PendingTransfersResponse,
  CateringTransfer,
  VenueHireTransfer,
} from "../services/pending-transfers.service";
import { ChevronDown, ChevronRight } from "lucide-react";

// ── Formatting helpers ────────────────────────────────────────────────────────

function formatGBP(amount: number): string {
  return `£${amount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards({
  data,
}: {
  data: PendingTransfersResponse;
}) {
  const { summary, cateringTransfers, venueHireTransfers } = data;
  const pastDueCount =
    cateringTransfers.filter((t) => t.isPastDue).length +
    venueHireTransfers.filter((t) => t.isPastDue).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
          Total Pending
        </p>
        <p className="text-2xl font-bold text-gray-900">
          {formatGBP(summary.totalPendingAmount)}
        </p>
      </div>

      <div className="bg-white rounded-lg border border-blue-200 p-4 shadow-sm">
        <p className="text-xs text-blue-500 uppercase tracking-wide mb-1">
          Catering Pending
        </p>
        <p className="text-2xl font-bold text-gray-900">
          {formatGBP(summary.totalPendingCateringAmount)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {summary.cateringOrderCount} order
          {summary.cateringOrderCount !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="bg-white rounded-lg border border-purple-200 p-4 shadow-sm">
        <p className="text-xs text-purple-500 uppercase tracking-wide mb-1">
          Venue Hire Pending
        </p>
        <p className="text-2xl font-bold text-gray-900">
          {formatGBP(summary.totalPendingVenueHireAmount)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {summary.coworkingOrderCount} order
          {summary.coworkingOrderCount !== 1 ? "s" : ""}
        </p>
      </div>

      <div
        className={`rounded-lg border p-4 shadow-sm ${
          pastDueCount > 0
            ? "bg-amber-50 border-amber-300"
            : "bg-white border-gray-200"
        }`}
      >
        <p
          className={`text-xs uppercase tracking-wide mb-1 ${
            pastDueCount > 0 ? "text-amber-600" : "text-gray-500"
          }`}
        >
          Past Due
        </p>
        <p
          className={`text-2xl font-bold ${
            pastDueCount > 0 ? "text-amber-700" : "text-gray-900"
          }`}
        >
          {pastDueCount}
        </p>
        <p className="text-xs text-gray-500 mt-1">transfers overdue</p>
      </div>
    </div>
  );
}

// ── Catering Table ────────────────────────────────────────────────────────────

function CateringTable({ transfers }: { transfers: CateringTransfer[] }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (orderId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const rowClass = (t: CateringTransfer) => {
    if (t.transferFailureReason)
      return "border-l-4 border-red-400 bg-red-50";
    if (t.isPastDue) return "border-l-4 border-amber-400 bg-amber-50";
    return "";
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Catering Payouts
        </h2>
        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-sm rounded-full">
          {transfers.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-600">Customer</th>
              <th className="px-4 py-3 font-medium text-gray-600">
                Event Date
              </th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 font-medium text-gray-600">
                Scheduled Date
              </th>
              <th className="px-4 py-3 font-medium text-gray-600">
                Restaurant Payouts
              </th>
              <th className="px-4 py-3 font-medium text-gray-600">
                Total Payout
              </th>
              <th className="px-4 py-3 font-medium text-gray-600">Retries</th>
              <th className="px-4 py-3 font-medium text-gray-600">
                Failure Reason
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transfers.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No pending catering transfers
                </td>
              </tr>
            ) : (
              transfers.map((t) => {
                const isExpanded = expandedIds.has(t.orderId);
                return (
                  <tr key={t.orderId} className={rowClass(t)}>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {t.customerName}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatDate(t.eventDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatDate(t.scheduledTransferDate)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleExpand(t.orderId)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        {isExpanded ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                        {t.restaurantPayouts.length} restaurant
                        {t.restaurantPayouts.length !== 1 ? "s" : ""}
                      </button>
                      {isExpanded && (
                        <ul className="mt-2 space-y-1">
                          {t.restaurantPayouts.map((rp) => (
                            <li
                              key={rp.restaurantId}
                              className="text-xs text-gray-700"
                            >
                              {rp.accountName}{" "}
                              <span className="font-medium text-gray-900">
                                → {formatGBP(rp.earningsAmount)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {formatGBP(t.totalRestaurantPayout)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {t.transferRetryCount}
                    </td>
                    <td
                      className="px-4 py-3 text-gray-700 max-w-[200px] truncate"
                      title={t.transferFailureReason ?? undefined}
                    >
                      {t.transferFailureReason ?? "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Venue Hire Table ──────────────────────────────────────────────────────────

function VenueHireTable({ transfers }: { transfers: VenueHireTransfer[] }) {
  const rowClass = (t: VenueHireTransfer) =>
    t.isPastDue ? "border-l-4 border-amber-400 bg-amber-50" : "";

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Venue Hire Payouts
        </h2>
        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-sm rounded-full">
          {transfers.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-600">
                Coworking Order ID
              </th>
              <th className="px-4 py-3 font-medium text-gray-600">
                Catering Order ID
              </th>
              <th className="px-4 py-3 font-medium text-gray-600">
                Gross Fee
              </th>
              <th className="px-4 py-3 font-medium text-gray-600">
                Stripe Fee
              </th>
              <th className="px-4 py-3 font-medium text-gray-600">
                Net Payout
              </th>
              <th className="px-4 py-3 font-medium text-gray-600">
                Scheduled Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transfers.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No pending venue hire transfers
                </td>
              </tr>
            ) : (
              transfers.map((t) => (
                <tr key={t.coworkingOrderId} className={rowClass(t)}>
                  <td className="px-4 py-3 text-gray-900 font-mono text-xs">
                    {t.coworkingOrderId}
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                    {t.cateringOrderId ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {formatGBP(t.venueHireFee)}
                  </td>
                  <td className="px-4 py-3 text-red-600">
                    -{formatGBP(t.stripeFee)}
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    {formatGBP(t.netAmount)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatDate(t.scheduledTransferDate)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function PendingTransfersScreen() {
  const [data, setData] = useState<PendingTransfersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pendingTransfersService
      .getPendingTransfers()
      .then((res) => {
        setData(res);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Failed to load pending transfers"
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading pending transfers...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">{error ?? "Unknown error"}</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#f5f7fa] min-h-screen">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Pending Stripe Transfers
      </h1>
      <SummaryCards data={data} />
      <CateringTable transfers={data.cateringTransfers} />
      <VenueHireTable transfers={data.venueHireTransfers} />
    </div>
  );
}
```

- [ ] **Step 2: Add import and renderPage case to `src/App.tsx`**

Add the import near the top of the imports block (after `CoworkingSpacesScreen`):

```ts
import PendingTransfersScreen from "./pages/PendingTransfersScreen";
```

Add the case inside `renderPage()` (after the `"coworking-spaces"` case):

```ts
case "pending-transfers":
  return <PendingTransfersScreen />;
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/PendingTransfersScreen.tsx src/App.tsx
git commit -m "feat: build PendingTransfersScreen with summary cards and two tables"
```

---

## Self-Review Checklist

- **Spec coverage:**
  - [x] Summary cards: Total, Catering, Venue Hire, Past Due count
  - [x] Catering table: all 8 columns
  - [x] Restaurant payouts expandable inline
  - [x] Venue hire table: all 6 columns
  - [x] Amber highlight for `isPastDue`
  - [x] Red highlight for `transferFailureReason` (failure takes priority)
  - [x] `£X.XX` formatting via `formatGBP`
  - [x] `DD MMM YYYY` date formatting via `formatDate`
  - [x] `—` for null values
  - [x] Loading state
  - [x] Error state
  - [x] Empty table states
  - [x] Sidebar: Finance section, Swift mode, `faRightLeft` icon
  - [x] Route: `/swift/pending-transfers`
  - [x] `SidebarPage` type updated in `Sidebar.tsx`
  - [x] `pathToPageMap`, `pageToPathMap`, `swiftPages` all updated in `App.tsx`

- **No placeholders:** All steps contain full code.
- **Type consistency:** `CateringTransfer`, `VenueHireTransfer`, `PendingTransfersResponse` defined in service file, imported in screen — consistent across all tasks.
