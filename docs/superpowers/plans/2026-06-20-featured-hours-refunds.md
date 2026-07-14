# Admin Dashboard: Featured Toggle, Catering Hours, Refund Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give admin a "Featured" toggle and a read-only catering hours display on the restaurant screen, and a "Refund" action on the catering order detail modal that calls the new backend admin-refund endpoint.

**Architecture:** Small, additive changes to two existing pages (`RestaurantScreen.tsx`, `CateringOrdersTableView.tsx`) following their established edit-form and sub-modal patterns. One new service file (`refund.service.ts`) mirroring the existing per-domain service file convention (`catering.service.ts`, `restaurant.service.ts`).

**Tech Stack:** React + Vite + TypeScript, no test framework in this repo — verification is `tsc -b` (the actual Netlify build gate) plus manual verification in the browser via `npm run dev`.

## Global Constraints

- This repo has no automated test suite — `npm run build` (`tsc -b && vite build`) is the real quality gate; unused imports or type errors break the Netlify deploy. Run it after every task.
- Backend dependency: the refund task (Task 4) calls `POST refunds/admin/catering`, implemented in the `backend` repo's `2026-06-20-catering-admin-refunds.md` plan. That endpoint must exist (at least on the backend feature branch, reachable by whatever API base URL this dashboard points at) before Task 4 can be manually verified end-to-end — Tasks 1–3 have no such dependency.
- Don't touch the existing read-only "Featured" badge (`RestaurantScreen.tsx`, already renders `restaurant.featured`) — only the edit form is missing the toggle.
- `featured` is already declared on both `RestaurantResponse` (`src/services/restaurant.service.ts`) and `UpdateRestaurantDto` (`src/types/restaurant.types.ts`) — no type changes needed for Task 1, only JSX/state.

---

## Task 1: "Featured" checkbox in the restaurant edit form

**Files:**
- Modify: `src/pages/RestaurantScreen/RestaurantScreen.tsx`

**Interfaces:**
- Consumes: existing `featured?: boolean` field already on `UpdateRestaurantDto` and `RestaurantResponse` — no new types.

- [ ] **Step 1: Add `featured` to the edit form's initial state**

In `startEditing` (around line 124), add `featured` to the `setEditForm` call:

```typescript
  const startEditing = (restaurant: RestaurantResponse) => {
    setEditingId(restaurant.id);
    setEditForm({
      restaurant_name: restaurant.restaurant_name,
      restaurant_description: restaurant.restaurant_description || "",
      commission: restaurant.commission ?? 20,
      showOnSite: restaurant.showOnSite ?? true,
      featured: restaurant.featured ?? false,
      fsa: restaurant.fsa ?? undefined,
      fsaLink: restaurant.fsaLink || "",
      status: restaurant.status ?? "inactive",
      images: restaurant.images?.[0] || "",
      logoImageUrl: restaurant.logoImageUrl || "",
      priceRange: restaurant.priceRange || "",
      tags: restaurant.tags || [],
    });
    setEditVatNumber(restaurant.vatNumber || "");
    setOriginalVatNumber(restaurant.vatNumber || "");
  };
```

(Only the new `featured: restaurant.featured ?? false,` line is added — everything else in this function is unchanged.)

- [ ] **Step 2: Add the checkbox to the edit form JSX**

In the edit form grid (around line 660, right after the existing "Visibility / Show on site" `form-field` block closes), add a new field of the same shape:

```tsx
                                    <div className="form-field">
                                      <label className="field-label">
                                        Featured
                                        <span className="field-hint">
                                          Show this restaurant first in the catering browse list
                                        </span>
                                      </label>
                                      <label className="checkbox-label restaurant-type-toggle">
                                        <input
                                          type="checkbox"
                                          checked={editForm.featured ?? false}
                                          onChange={(e) =>
                                            setEditForm({
                                              ...editForm,
                                              featured: e.target.checked,
                                            })
                                          }
                                          className="form-checkbox"
                                        />
                                        <span className="checkbox-label-text">
                                          Featured restaurant
                                        </span>
                                      </label>
                                    </div>
```

- [ ] **Step 3: Type-check**

Run: `npm run build`
Expected: no new type errors. (`editForm.featured` and `restaurant.featured` are both already valid per the Global Constraints — this step exists purely to confirm the JSX itself is well-formed.)

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open the Restaurant Management screen, expand any restaurant, click "Edit Settings", confirm the "Featured" checkbox appears, toggle it, click "Save Changes", confirm the "Featured" badge on the collapsed row appears/disappears accordingly, and that re-opening "Edit Settings" shows the checkbox in the persisted state.

- [ ] **Step 5: Commit**

```bash
git add src/pages/RestaurantScreen/RestaurantScreen.tsx
git commit -m "feat(restaurants): add Featured checkbox to the edit form"
```

---

## Task 2: Read-only "Catering Hours" display

**Files:**
- Modify: `src/services/restaurant.service.ts` (add the missing field to `RestaurantResponse`)
- Modify: `src/pages/RestaurantScreen/RestaurantScreen.tsx`

**Interfaces:**
- Produces: `RestaurantResponse.cateringOperatingHours` — read by this task's new display code.

- [ ] **Step 1: Add the field to `RestaurantResponse`**

In `src/services/restaurant.service.ts`, add to the `RestaurantResponse` interface (it doesn't have this field today — everything else listed already exists):

```typescript
  vatNumber?: string | null;
  vatNumberAddedAt?: string | null;
  cateringOperatingHours?:
    | {
        day: string;
        open: string | null;
        close: string | null;
        enabled: boolean;
      }[]
    | null;
```

(Insert right after the existing `vatNumberAddedAt?: string | null;` line — that's currently the last field in the interface.)

- [ ] **Step 2: Add the formatting helpers**

In `src/pages/RestaurantScreen/RestaurantScreen.tsx`, add these two module-level functions above the `RestaurantAdminDashboard` component definition (this is the same day-grouping logic already used in the catering-widget's restaurant card tooltip — duplicated here deliberately since admin-dashboard and catering-widget are separate codebases with no shared package):

```typescript
const formatCateringHoursTime = (time: string): string => {
  const [hours, minutes] = time.split(":").map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
};

const formatCateringHours = (
  cateringOperatingHours: RestaurantResponse["cateringOperatingHours"]
): string => {
  if (!cateringOperatingHours || cateringOperatingHours.length === 0) {
    return "Not set";
  }

  const enabledDays = cateringOperatingHours.filter((schedule) => schedule.enabled);
  if (enabledDays.length === 0) {
    return "No hours set";
  }

  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const byDay = new Map<string, string[]>();

  for (const schedule of enabledDays) {
    const dayKey = schedule.day.toLowerCase();
    if (!byDay.has(dayKey)) byDay.set(dayKey, []);
    if (schedule.open && schedule.close) {
      byDay.get(dayKey)!.push(
        `${formatCateringHoursTime(schedule.open)} - ${formatCateringHoursTime(schedule.close)}`
      );
    }
  }

  const grouped: { days: string[]; hours: string }[] = [];
  for (const dayKey of dayOrder) {
    const slots = byDay.get(dayKey);
    if (!slots || slots.length === 0) continue;
    const dayName = dayKey.charAt(0).toUpperCase() + dayKey.slice(1, 3);
    const hours = slots.join(", ");
    const lastGroup = grouped[grouped.length - 1];
    if (lastGroup && lastGroup.hours === hours) {
      lastGroup.days.push(dayName);
    } else {
      grouped.push({ days: [dayName], hours });
    }
  }

  return grouped
    .map((group) => {
      const dayRange =
        group.days.length > 1
          ? `${group.days[0]} - ${group.days[group.days.length - 1]}`
          : group.days[0];
      return `${dayRange}: ${group.hours}`;
    })
    .join(" | ");
};
```

- [ ] **Step 3: Render it in the read-only settings display**

In the `settings-display` block (around line 843, right after the existing "Price Range" `setting-item`), add:

```tsx
                                    <div className="setting-item full-width">
                                      <span className="setting-label">Catering Hours</span>
                                      <span className="setting-value">
                                        {formatCateringHours(restaurant.cateringOperatingHours)}
                                      </span>
                                    </div>
```

- [ ] **Step 4: Type-check**

Run: `npm run build`
Expected: no new type errors.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, expand a restaurant that has catering hours configured (cross-check against the Stripe/catering-widget side, or any restaurant a developer knows has `cateringOperatingHours` set), confirm the formatted hours line renders correctly grouped by day; expand one with no hours set and confirm it shows "Not set" rather than breaking.

- [ ] **Step 6: Commit**

```bash
git add src/services/restaurant.service.ts src/pages/RestaurantScreen/RestaurantScreen.tsx
git commit -m "feat(restaurants): show read-only catering hours in the admin detail view"
```

---

## Task 3: Refund service + order type fields

**Files:**
- Create: `src/services/refund.service.ts`
- Modify: `src/types/catering.types.ts`

**Interfaces:**
- Produces: `refundService.issueAdminRefund(dto: AdminIssueRefundDto): Promise<AdminRefundResponse>` — consumed by Task 4.
- Produces: `CateringOrder.stripePaymentIntentId?: string | null`, `CateringOrder.stripeInvoiceId?: string | null` — consumed by Task 4.

- [ ] **Step 1: Add the two missing fields to `CateringOrder`**

In `src/types/catering.types.ts`, add to the `CateringOrder` interface, right after the existing `finalTotal?: number;` line:

```typescript
  finalTotal?: number;
  stripePaymentIntentId?: string | null;
  stripeInvoiceId?: string | null;
```

(Only the two new lines are added — `finalTotal` already exists and is unchanged.)

- [ ] **Step 2: Create the refund service**

```typescript
// src/services/refund.service.ts
import http from "./http";

export interface AdminIssueRefundDto {
  cateringOrderId: string;
  restaurantId: string;
  amount: number;
  reason?: string;
}

export interface AdminRefundResponse {
  id: string;
  status: "pending" | "approved" | "rejected" | "processed" | "cancelled";
  requestedAmount: number;
  approvedAmount: number | null;
  processingNotes: string | null;
}

const issueAdminRefund = async (
  dto: AdminIssueRefundDto
): Promise<AdminRefundResponse> => {
  const res = await http.post<AdminRefundResponse>("refunds/admin/catering", dto);
  return res.data;
};

export default {
  issueAdminRefund,
};
```

- [ ] **Step 3: Type-check**

Run: `npm run build`
Expected: no new type errors.

- [ ] **Step 4: Commit**

```bash
git add src/services/refund.service.ts src/types/catering.types.ts
git commit -m "feat(refunds): add admin refund service and order Stripe reference fields"
```

---

## Task 4: "Refund" action on the order detail modal

**Files:**
- Modify: `src/pages/CateringOrdersTableView.tsx`

**Interfaces:**
- Consumes: `refundService.issueAdminRefund` (Task 3), `CateringOrder.restaurants` (existing — `PricingOrderItem[]` with `restaurantId`/`restaurantName`), `CateringOrder.stripePaymentIntentId`/`stripeInvoiceId` (Task 3).

- [ ] **Step 1: Add imports and state**

Add to the imports at the top of the file:

```typescript
import refundService from "../services/refund.service";
```

Add to the state declarations in `CateringOrderDetailsModal`, alongside the existing `showSendPaymentModal`/`paymentLinkForm` pair:

```typescript
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [isIssuingRefund, setIsIssuingRefund] = useState(false);
  const [refundForm, setRefundForm] = useState({
    restaurantId: "",
    amount: "",
    reason: "",
  });
```

- [ ] **Step 2: Add the submit handler**

Add this function near `handleSendPaymentLink` (same component, same style):

```typescript
  const handleIssueRefund = async () => {
    const amount = parseFloat(refundForm.amount);

    if (!refundForm.restaurantId) {
      alert("Select a restaurant.");
      return;
    }
    if (!amount || amount <= 0) {
      alert("Enter a valid refund amount.");
      return;
    }

    setIsIssuingRefund(true);
    try {
      const result = await refundService.issueAdminRefund({
        cateringOrderId: order.id,
        restaurantId: refundForm.restaurantId,
        amount,
        reason: refundForm.reason || undefined,
      });

      setIsIssuingRefund(false);
      setShowRefundModal(false);
      if (onOrderUpdated) onOrderUpdated();

      if (result.status === "processed") {
        alert("Refund processed successfully via Stripe.");
      } else {
        alert(
          "Refund recorded, but no Stripe charge was found on this order — you'll need to refund the customer manually.",
        );
      }
    } catch (err: any) {
      console.error("Error issuing refund:", err);
      setIsIssuingRefund(false);
      alert(err?.response?.data?.message || "Failed to issue refund");
    }
  };
```

- [ ] **Step 3: Add the trigger button**

Add alongside the existing action buttons (right after the "Cancel Order" button, around line 950):

```tsx
                {/* Refund button - available once the order has restaurants to refund */}
                {order.restaurants && order.restaurants.length > 0 && (
                  <button
                    onClick={() => {
                      setRefundForm({ restaurantId: "", amount: "", reason: "" });
                      setShowRefundModal(true);
                    }}
                    className="flex-1 bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
                  >
                    Refund
                  </button>
                )}
```

- [ ] **Step 4: Add the modal**

Add this directly after the existing "Send Payment Link Modal" `<Modal>` block closes:

```tsx
        {/* Refund Modal */}
        <Modal open={showRefundModal} onClose={() => setShowRefundModal(false)} overlayOpacity={60} closeOnOverlayClick={false}>
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 my-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 text-gray-900">
              Issue Refund
            </h3>

            {!order.stripePaymentIntentId && !order.stripeInvoiceId && (
              <div className="mb-4 bg-amber-50 border border-amber-300 rounded-lg p-3 text-sm text-amber-800">
                No Stripe charge found on this order — this refund will be recorded and
                deducted from the restaurant's balance, but you'll need to refund the
                customer manually.
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Restaurant
                </label>
                <select
                  value={refundForm.restaurantId}
                  onChange={(e) =>
                    setRefundForm({ ...refundForm, restaurantId: e.target.value })
                  }
                  className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select a restaurant</option>
                  {(order.restaurants || []).map((restaurant) => (
                    <option key={restaurant.restaurantId} value={restaurant.restaurantId}>
                      {restaurant.restaurantName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (£)
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={refundForm.amount}
                  onChange={(e) =>
                    setRefundForm({ ...refundForm, amount: e.target.value })
                  }
                  className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Order total: £{Number(order.finalTotal ?? 0).toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason (optional)
                </label>
                <textarea
                  value={refundForm.reason}
                  onChange={(e) =>
                    setRefundForm({ ...refundForm, reason: e.target.value })
                  }
                  className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={2}
                  placeholder="Internal note — why this refund is being issued"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowRefundModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleIssueRefund}
                disabled={isIssuingRefund}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:bg-amber-300 disabled:cursor-not-allowed"
              >
                {isIssuingRefund ? "Processing..." : "Issue Refund"}
              </button>
            </div>
          </div>
        </Modal>
```

- [ ] **Step 5: Type-check**

Run: `npm run build`
Expected: no new type errors.

- [ ] **Step 6: Manual verification (requires the backend endpoint to exist — see Global Constraints)**

Run: `npm run dev`, open a catering order that has at least one restaurant, click "Refund", confirm:
- The restaurant dropdown lists the order's restaurant(s) by name.
- Submitting with no restaurant selected or a zero/blank amount shows an alert and does not call the API.
- For an order with neither `stripePaymentIntentId` nor `stripeInvoiceId`, the manual-fallback warning banner is visible before submitting.
- A successful submission closes the modal, refreshes the order, and shows the correct success message depending on whether it was auto-processed or flagged manual.
- Submitting a second refund for the same order+restaurant shows the backend's "already exists" error via the alert.

- [ ] **Step 7: Commit**

```bash
git add src/pages/CateringOrdersTableView.tsx
git commit -m "feat(refunds): add admin Refund action to the catering order modal"
```

---

## Self-Review Notes

- **Spec coverage:** Task 1 = Feature 1's admin half. Task 2 = Feature 2's admin half. Tasks 3–4 = Feature 3's admin dashboard half.
- **Type consistency:** `AdminIssueRefundDto` field names match the backend plan's DTO exactly (`cateringOrderId`, `restaurantId`, `amount`, `reason`). `AdminRefundResponse.status` mirrors the backend `RefundStatus` enum's string values.
- **No placeholders:** every step has complete, runnable code referencing real existing files/patterns (`Modal` component, `cateringService` sibling pattern, exact line anchors).
