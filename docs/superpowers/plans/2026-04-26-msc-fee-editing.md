# MSC Fee Editing — Catering Financials Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an editable MSC Fee column to the catering financials table, with inline cell editing, local pending-edit tracking, and a bulk-save button that POSTs only changed rows to `POST /admin/catering-orders/financial-metrics/msc-fees`.

**Architecture:** Three files change. Types get `mscFee` added to order and totals shapes. The service gets a `updateMscFees` method. The screen component gets new state (pending edits, editing cell, saving flag, toast) plus the column rendering and save button. No new files needed — the existing single-component pattern is preserved.

**Tech Stack:** React 19, TypeScript 5, Tailwind CSS v4, Axios (via `src/services/http.ts`)

---

## File Map

| File | Change |
|---|---|
| `src/types/catering-financials.types.ts` | Add `mscFee: number` to `FinancialOrder` and `FinancialTotals` |
| `src/services/catering-financials.service.ts` | Add `updateMscFees` method |
| `src/pages/CateringFinancialsScreen.tsx` | Add state, MSC Fee column (read + edit mode), save button, toast |

---

## Task 1: Add `mscFee` to types

**Files:**
- Modify: `src/types/catering-financials.types.ts`

- [ ] **Step 1: Update `FinancialOrder` interface**

In `src/types/catering-financials.types.ts`, add `mscFee: number` as the last field of `FinancialOrder`:

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
  mscFee: number;
  amountOwedToRestaurant: number;
  totalPlatformRevenue: number;
  profit: number;
}
```

- [ ] **Step 2: Update `FinancialTotals` interface**

Add `mscFee: number` as the last field of `FinancialTotals`:

```ts
export interface FinancialTotals {
  orderCount: number;
  grossOrderValue: number;
  grossExclDelivery: number;
  commission: number;
  deliveryFee: number;
  serviceCharge: number;
  paymentProcessingFee: number;
  invoicingFee: number;
  mscFee: number;
  amountOwedToRestaurant: number;
  totalPlatformRevenue: number;
  profit: number;
}
```

- [ ] **Step 3: Add `UpdateMscFeesResponse` type**

Add this new interface after `FinancialMetricsParams`:

```ts
export interface UpdateMscFeesResponse {
  updated: number;
  notFound: string[];
}
```

- [ ] **Step 4: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no output (no errors).

- [ ] **Step 5: Commit**

```bash
git add src/types/catering-financials.types.ts
git commit -m "feat: add mscFee to FinancialOrder and FinancialTotals types"
```

---

## Task 2: Add `updateMscFees` to the service

**Files:**
- Modify: `src/services/catering-financials.service.ts`

- [ ] **Step 1: Import the new response type**

Update the import at the top of `src/services/catering-financials.service.ts`:

```ts
import type {
  FinancialMetricsParams,
  FinancialMetricsResponse,
  UpdateMscFeesResponse,
} from "../types/catering-financials.types";
```

- [ ] **Step 2: Add the `updateMscFees` function**

Add this function after `getFinancialMetrics`:

```ts
const updateMscFees = async (
  fees: Record<string, number>
): Promise<UpdateMscFeesResponse> => {
  const res = await http.post<UpdateMscFeesResponse>(
    "admin/catering-orders/financial-metrics/msc-fees",
    fees
  );
  return res.data;
};
```

- [ ] **Step 3: Export the new function**

Update the default export at the bottom:

```ts
export default { getFinancialMetrics, updateMscFees };
```

- [ ] **Step 4: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/services/catering-financials.service.ts
git commit -m "feat: add updateMscFees service method"
```

---

## Task 3: Add new component state and toast helper

**Files:**
- Modify: `src/pages/CateringFinancialsScreen.tsx`

- [ ] **Step 1: Add new state variables**

In `CateringFinancialsScreen`, after the existing `const [error, setError] = useState<string | undefined>();` line, add:

```ts
const [pendingEdits, setPendingEdits] = useState<Record<string, number>>({});
const [editingCell, setEditingCell] = useState<string | null>(null);
const [editingValue, setEditingValue] = useState<string>("");
const [saving, setSaving] = useState(false);
const [toast, setToast] = useState<{
  message: string;
  type: "success" | "error" | "warning";
} | null>(null);
```

- [ ] **Step 2: Add `showToast` helper**

Add this function directly above the `fetchData` function:

```ts
const showToast = (
  message: string,
  type: "success" | "error" | "warning"
) => {
  setToast({ message, type });
  setTimeout(() => setToast(null), 3000);
};
```

- [ ] **Step 3: Clear pending edits on data refresh**

Update `fetchData` so that when a new fetch succeeds it resets pending edit state. Replace the `.then` callback inside `fetchData`:

```ts
.then((res) => {
  setData(res);
  setLoading(false);
  setPendingEdits({});
  setEditingCell(null);
  setEditingValue("");
})
```

- [ ] **Step 4: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/pages/CateringFinancialsScreen.tsx
git commit -m "feat: add MSC fee edit state and toast helper to CateringFinancialsScreen"
```

---

## Task 4: Add the MSC Fee table column header

**Files:**
- Modify: `src/pages/CateringFinancialsScreen.tsx`

- [ ] **Step 1: Insert the column header**

In the `<thead>` section, find the array of column header objects. Insert `{ label: "MSC Fee", align: "right" }` between `"Invoicing Fee (0.4%)"` and `"Owed to Restaurant"`:

```ts
{ label: "Invoicing Fee (0.4%)", align: "right" },
{ label: "MSC Fee", align: "right" },
{ label: "Owed to Restaurant", align: "right" },
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/pages/CateringFinancialsScreen.tsx
git commit -m "feat: add MSC Fee column header to catering financials table"
```

---

## Task 5: Add MSC Fee cell (read mode + edit mode)

**Files:**
- Modify: `src/pages/CateringFinancialsScreen.tsx`

- [ ] **Step 1: Add the cell body JSX**

In the `<tbody>`, find the `<td>` for `invoicingFee`:

```tsx
<td className="px-4 py-3 whitespace-nowrap text-right text-gray-700">
  {formatCurrency(order.invoicingFee)}
</td>
```

Insert a new `<td>` immediately after it (before the `amountOwedToRestaurant` cell):

```tsx
<td
  className={`px-4 py-3 whitespace-nowrap text-right text-gray-700 cursor-pointer select-none ${
    pendingEdits[order.orderId] !== undefined ? "bg-amber-50" : ""
  }`}
  onClick={() => {
    if (editingCell === order.orderId) return;
    setEditingCell(order.orderId);
    setEditingValue(
      String(
        pendingEdits[order.orderId] !== undefined
          ? pendingEdits[order.orderId]
          : order.mscFee
      )
    );
  }}
>
  {editingCell === order.orderId ? (
    <span className="flex items-center justify-end gap-1">
      <input
        type="number"
        min="0"
        step="0.01"
        value={editingValue}
        autoFocus
        onChange={(e) => setEditingValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const val = parseFloat(editingValue);
            if (isNaN(val) || val < 0) return;
            if (val === order.mscFee) {
              const next = { ...pendingEdits };
              delete next[order.orderId];
              setPendingEdits(next);
            } else {
              setPendingEdits((prev) => ({
                ...prev,
                [order.orderId]: val,
              }));
            }
            setEditingCell(null);
          } else if (e.key === "Escape") {
            setEditingCell(null);
          }
        }}
        onBlur={(e) => {
          if ((e.relatedTarget as HTMLElement)?.dataset?.confirm === order.orderId) return;
          setEditingCell(null);
        }}
        className={`w-24 px-2 py-0.5 border rounded text-right text-sm ${
          editingValue !== "" &&
          (isNaN(parseFloat(editingValue)) || parseFloat(editingValue) < 0)
            ? "border-red-500 focus:ring-red-500"
            : "border-gray-300 focus:ring-blue-500"
        } focus:outline-none focus:ring-2`}
      />
      <button
        data-confirm={order.orderId}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          const val = parseFloat(editingValue);
          if (isNaN(val) || val < 0) return;
          if (val === order.mscFee) {
            const next = { ...pendingEdits };
            delete next[order.orderId];
            setPendingEdits(next);
          } else {
            setPendingEdits((prev) => ({
              ...prev,
              [order.orderId]: val,
            }));
          }
          setEditingCell(null);
        }}
        className="text-green-600 hover:text-green-700 font-bold text-base leading-none"
      >
        ✓
      </button>
    </span>
  ) : (
    formatCurrency(
      pendingEdits[order.orderId] !== undefined
        ? pendingEdits[order.orderId]
        : order.mscFee
    )
  )}
</td>
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/pages/CateringFinancialsScreen.tsx
git commit -m "feat: add MSC Fee inline edit cell to catering financials table"
```

---

## Task 6: Add MSC Fee cell to the totals row

**Files:**
- Modify: `src/pages/CateringFinancialsScreen.tsx`

- [ ] **Step 1: Insert the totals cell**

In the totals `<tr>`, find the `<td>` for `invoicingFee`:

```tsx
<td className="px-4 py-3 whitespace-nowrap text-right text-gray-900">
  {formatCurrency(totals.invoicingFee)}
</td>
```

Insert a new `<td>` immediately after it (before `amountOwedToRestaurant`):

```tsx
<td className="px-4 py-3 whitespace-nowrap text-right text-gray-900">
  {formatCurrency(totals.mscFee)}
</td>
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/pages/CateringFinancialsScreen.tsx
git commit -m "feat: add MSC Fee total to catering financials totals row"
```

---

## Task 7: Add the Save MSC Fees button and save handler

**Files:**
- Modify: `src/pages/CateringFinancialsScreen.tsx`

- [ ] **Step 1: Add the `handleSaveMscFees` function**

Add this function directly after `handleClear`:

```ts
const handleSaveMscFees = async () => {
  if (Object.keys(pendingEdits).length === 0) return;
  setSaving(true);
  try {
    const result = await cateringFinancialsService.updateMscFees(pendingEdits);
    if (result.notFound.length > 0) {
      showToast(
        `${result.updated} order${result.updated !== 1 ? "s" : ""} updated. Not found: ${result.notFound.join(", ")}`,
        "warning"
      );
    } else {
      showToast(
        `MSC fees updated for ${result.updated} order${result.updated !== 1 ? "s" : ""}`,
        "success"
      );
    }
    fetchData(fromDate, toDate, page);
  } catch (e: any) {
    showToast(e?.message || "Failed to save MSC fees", "error");
  } finally {
    setSaving(false);
  }
};
```

- [ ] **Step 2: Add the Save button above the table**

Find the comment `{/* Table */}` and insert a conditional button row directly above the table `<div>`:

```tsx
{/* Save MSC Fees button */}
{Object.keys(pendingEdits).length > 0 && (
  <div className="flex justify-end mb-3">
    <button
      onClick={handleSaveMscFees}
      disabled={saving}
      className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-sm"
    >
      {saving && (
        <svg
          className="animate-spin h-4 w-4 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      )}
      Save MSC Fees ({Object.keys(pendingEdits).length})
    </button>
  </div>
)}
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/pages/CateringFinancialsScreen.tsx
git commit -m "feat: add Save MSC Fees button and save handler"
```

---

## Task 8: Add toast rendering

**Files:**
- Modify: `src/pages/CateringFinancialsScreen.tsx`

- [ ] **Step 1: Render the toast**

At the very end of the component's return, just before the closing `</div>` of the outermost wrapper, add:

```tsx
{/* Toast */}
{toast && (
  <div
    className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-lg shadow-lg text-white font-semibold text-sm transition-all ${
      toast.type === "success"
        ? "bg-green-600"
        : toast.type === "warning"
        ? "bg-amber-500"
        : "bg-red-600"
    }`}
  >
    <span>
      {toast.type === "success" ? "✓" : toast.type === "warning" ? "⚠" : "✗"}
    </span>
    {toast.message}
  </div>
)}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/pages/CateringFinancialsScreen.tsx
git commit -m "feat: add toast notification to CateringFinancialsScreen"
```

---

## Task 9: Manual browser verification

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify read mode**

Navigate to the Catering Financials page. Confirm:
- The table now has an "MSC Fee" column between "Invoicing Fee (0.4%)" and "Owed to Restaurant"
- Each row shows a currency value (£0.00 for rows with no MSC fee set)
- The totals row shows the summed MSC fee total

- [ ] **Step 3: Verify inline editing — happy path**

Click an MSC Fee cell. Confirm:
- The cell becomes an input with a ✓ button
- Typing a value and pressing Enter closes the cell and shows the new value in the cell
- The cell gains an amber background
- The "Save MSC Fees (1)" button appears above the table

- [ ] **Step 4: Verify inline editing — validation**

With an edit cell open, type `-5`. Confirm:
- The input border turns red
- Pressing Enter does nothing (no confirm)
- Pressing Escape closes the cell without saving

- [ ] **Step 5: Verify Escape and blur cancellation**

Open an edit cell, type a value, then press Escape. Confirm the cell closes without updating `pendingEdits` (the amber background does not appear, the save button count does not increment).

- [ ] **Step 6: Verify no-op edit removal**

Edit a cell whose current value is £0.00. Type `0` and confirm. Confirm the cell does NOT get an amber background and the edit is not counted in the save button.

- [ ] **Step 7: Verify bulk save — success path**

Edit 2–3 cells with valid values. Click "Save MSC Fees (N)". Confirm:
- Button shows spinner and is disabled while saving
- On success: green toast appears with correct count
- Table refreshes (amber highlights cleared, values now reflect server state)

- [ ] **Step 8: Verify partial failure**

(If testable in your environment) Arrange for one orderId to not be found. Confirm the amber/warning toast lists the not-found IDs.

- [ ] **Step 9: Verify error handling**

(If testable) Simulate a network failure. Confirm the red error toast appears and the table is not refreshed.
