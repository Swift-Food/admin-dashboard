# MSC Fee Editing — Catering Financials Table

**Date:** 2026-04-26  
**Scope:** `CateringFinancialsScreen`, `catering-financials.service.ts`, `catering-financials.types.ts`

---

## Overview

Add a new MSC Fee column to the catering financials table with inline editing. Users can click any MSC Fee cell to edit its value, then bulk-save all changes with a single POST request. The endpoint accepts a map of orderId → mscFee and returns how many were updated and which were not found.

---

## Data Layer

### Types (`catering-financials.types.ts`)

Add `mscFee: number` to both `FinancialOrder` and `FinancialTotals`. The field defaults to `0` from the backend.

### Service (`catering-financials.service.ts`)

Add:
```ts
updateMscFees(fees: Record<string, number>): Promise<{ updated: number; notFound: string[] }>
```
Calls `POST admin/catering-orders/financial-metrics/msc-fees` with the fees map as the JSON body. Uses the existing `http` (axios) instance which handles JWT auth automatically.

---

## Component State

New state in `CateringFinancialsScreen`:

| State | Type | Purpose |
|---|---|---|
| `pendingEdits` | `Record<string, number>` | orderId → new mscFee; only rows the user actually changed |
| `editingCell` | `string \| null` | orderId of the cell currently open in edit mode |
| `editingValue` | `string` | Controlled string value for the active input |
| `saving` | `boolean` | True while the POST is in flight |
| `toast` | `{ message: string; type: 'success' \| 'error' \| 'warning' } \| null` | Auto-dismisses after 3 s |

**Reset rules:**
- `pendingEdits` is cleared on successful save.
- `pendingEdits` and `editingCell` are reset whenever `fetchData` is called (page or date change), since the returned data reflects the latest server state.

---

## Table Column

### Position
After "Invoicing Fee (0.4%)", before "Owed to Restaurant" — keeps all fee columns grouped together.

### Read mode
- Displays `formatCurrency(order.mscFee)`.
- If `pendingEdits[order.orderId]` exists, the cell has `bg-amber-50` background to signal an unsaved change.
- Clicking the cell enters edit mode.

### Edit mode
- Cell renders `<input type="number" min="0" step="0.01">` (compact, fits table row height) and a `✓` confirm button.
- **Confirm:** Enter key or clicking `✓`.
  - Validates value ≥ 0 and is a valid number. If invalid, input border turns red; no confirm.
  - If new value equals original `order.mscFee`, removes the orderId from `pendingEdits` (treats as no-op).
  - Otherwise stores in `pendingEdits` and closes the cell.
- **Cancel:** Escape key or `onBlur` (with a short delay so the `✓` click registers before blur fires).
- Only one cell can be in edit mode at a time; activating a new cell implicitly cancels the previous one without saving.

### Totals row
Displays `formatCurrency(totals.mscFee)`. Read-only — no editing.

---

## Save Button

- Renders above the table, right-aligned, only when `Object.keys(pendingEdits).length > 0`.
- Label: **"Save MSC Fees (N)"** where N is the count of pending edits.
- While `saving` is true: button is disabled, shows a spinner.

### POST body
Only orders whose value changed are included. Orders untouched by the user are excluded.

### Success response (`notFound` is empty)
- Toast (green): `"MSC fees updated for X orders"`
- Clear `pendingEdits`
- Call `fetchData` to refresh table

### Partial failure (`notFound.length > 0`)
- Toast (amber): `"X orders updated. Not found: [id1, id2]"`
- Still refresh table

### Network / API error
- Toast (red): error message from the API response, or a generic fallback

---

## Toast

Uses the same custom inline pattern as `PromotionsScreen` (no external library):
- `useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>`
- `showToast(message, type)` sets state and schedules `setTimeout(..., 3000)` to clear it
- Rendered as a fixed overlay in the component JSX

---

## Validation Rules

- Only non-negative numbers allowed (`value >= 0`).
- Empty string or non-numeric input is rejected on confirm.
- No upper bound enforced in the UI (the backend can reject extreme values).

---

## Out of Scope

- Editing MSC fees for orders across multiple pages simultaneously (pending edits are page-local; navigating away resets them).
- Undo/redo of individual edits (Escape cancels the active cell; already-confirmed edits can only be corrected by re-editing before saving).
- Adding MSC Fee to KPI cards (not requested).
