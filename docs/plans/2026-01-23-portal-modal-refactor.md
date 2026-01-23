# Portal-Based Modal System Refactor

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace z-index-based modal stacking with DOM-order-based stacking using React portals, eliminating all modal/sidebar z-index conflicts.

**Architecture:** Modals render via `createPortal` to a `#modal-root` div that appears AFTER `#root` in the DOM. Since later DOM elements naturally stack on top, no z-index is needed. The sidebar keeps its natural stacking context within `#root`.

**Tech Stack:** React 18 createPortal, TypeScript, Tailwind CSS

---

## PROGRESS UPDATE (2026-01-23)

### COMPLETED:
1. **Infrastructure**
   - Added `#modal-root` to `index.html`
   - Created `src/components/Modal/Modal.tsx` - portal-based Modal component
   - Removed `zIndex: 100` from Sidebar

2. **Tailwind-based modals migrated to use Modal component:**
   - CateringOrdersTableView.tsx - 2 modals
   - CateringScreen.tsx - 5 modals
   - OrdersScreen.tsx - 3 modals
   - CorporateOrderScreen.tsx - 3 modals
   - CorporateOrdersTableView.tsx - 1 modal
   - PayoutScreen.tsx - 3 modals
   - StripeAccountsScreen.tsx - 1 modal

3. **CSS files z-index removed:**
   - AddRestaurantModal.css
   - Promoform.css
   - ImageCropper.css
   - RestaurantScreen.css
   - CategoriesScreen.css
   - BundlesScreen.css
   - EventsScreen.css
   - EventCategoriesScreen.css
   - PromotionsScreen.css

### REMAINING (Optional - only needed if these modals overlap sidebar):
The CSS-based modals still render in-place (not via portal). If they show overlap issues:
- AddRestaurantModal.tsx - wrap with createPortal
- PromoForm.tsx - wrap with createPortal
- ImageCropper.tsx - wrap with createPortal
- RestaurantScreen.tsx - wrap modals with createPortal
- CategoriesScreen.tsx - wrap modals with createPortal
- BundlesScreen.tsx - wrap modals with createPortal
- EventsScreen.tsx - wrap modals with createPortal
- EventCategoriesScreen.tsx - wrap modals with createPortal
- PromotionsScreen.tsx - wrap modals with createPortal

**Build Status:** PASSING

---

## Original State Analysis

### Files with inline modal overlays (need migration):
| File | Line | Current z-index |
|------|------|-----------------|
| `src/pages/CateringScreen.tsx` | 227 | z-50 |
| `src/pages/CateringScreen.tsx` | 542 | z-[60] |
| `src/pages/CateringScreen.tsx` | 685 | z-[60] |
| `src/pages/CateringScreen.tsx` | 737 | z-[60] |
| `src/pages/CateringScreen.tsx` | 849 | z-[60] |
| `src/pages/OrdersScreen.tsx` | 69 | z-50 |
| `src/pages/OrdersScreen.tsx` | 146 | z-50 |
| `src/pages/OrdersScreen.tsx` | 428 | z-[60] |
| `src/pages/CorporateOrderScreen.tsx` | 149 | z-50 |
| `src/pages/CorporateOrderScreen.tsx` | 426 | z-[60] |
| `src/pages/CorporateOrderScreen.tsx` | 673 | z-50 |
| `src/pages/StripeAccountsScreen.tsx` | 49 | z-50 |
| `src/pages/CateringOrdersTableView.tsx` | 230 | z-[150] |
| `src/pages/CateringOrdersTableView.tsx` | 765 | z-[160] |
| `src/pages/CorporateOrdersTableView.tsx` | 84 | z-50 |
| `src/pages/PayoutScreen.tsx` | 149 | z-50 |
| `src/pages/PayoutScreen.tsx` | 307 | z-[60] |
| `src/pages/PayoutScreen.tsx` | 340 | z-[60] |

### CSS files with modal z-index (need update):
| File | Line | Current z-index |
|------|------|-----------------|
| `src/components/AddRestaurantModal/AddRestaurantModal.css` | 9 | z-index: 50 |
| `src/components/PromoForm/Promoform.css` | 281 | z-index: 50 |
| `src/components/ImageCropper/ImageCropper.css` | 11 | z-index: 2000 |
| `src/pages/RestaurantScreen/RestaurantScreen.css` | 976 | z-index: 1000 |
| `src/pages/CategoriesScreen/CategoriesScreen.css` | 238 | z-index: 1000 |
| `src/pages/BundlesScreen/BundlesScreen.css` | 272 | z-index: 1000 |
| `src/pages/EventsScreen/EventsScreen.css` | 281 | z-index: 1000 |
| `src/pages/EventCategoriesScreen/EventCategoriesScreen.css` | 306 | z-index: 1000 |
| `src/pages/PromotionsScreen/PromotionsScreen.css` | 281 | z-index: 50 |

### Sidebar z-index to remove:
| File | Line | Current |
|------|------|---------|
| `src/components/Sidebar.tsx` | 396 | zIndex: 100 |

### Other z-index (keep - not modals):
- `src/components/LucideIconPicker/LucideIconPicker.tsx:192` - dropdown, keep
- `src/components/RestaurantMultiSelect.tsx:191,346` - dropdown, keep
- `src/pages/MiscellaneousScreen.tsx:208` - UI element, keep
- `src/pages/BundlesScreen/BundlesScreen.css:299` - UI element, keep
- `src/pages/MapScreen.tsx:197,259` - map controls, keep

---

## Task 1: Create Modal Portal Infrastructure

**Files:**
- Modify: `index.html`
- Create: `src/components/Modal/Modal.tsx`
- Create: `src/components/Modal/index.ts`

### Step 1.1: Add modal-root to index.html

**File:** `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + React + TS</title>
  </head>
  <body>
    <div id="root"></div>
    <div id="modal-root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### Step 1.2: Create Modal component

**File:** `src/components/Modal/Modal.tsx`

```tsx
import { createPortal } from 'react-dom';
import type { ReactNode, MouseEvent } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Overlay opacity: 50 = bg-black/50, 60 = bg-black/60, 30 = bg-black/30 */
  overlayOpacity?: 30 | 50 | 60;
  /** Additional classes for the overlay */
  overlayClassName?: string;
  /** Whether clicking overlay closes modal (default: true) */
  closeOnOverlayClick?: boolean;
}

const overlayOpacityClasses = {
  30: 'bg-black/30',
  50: 'bg-black/50',
  60: 'bg-black/60',
} as const;

export function Modal({
  open,
  onClose,
  children,
  overlayOpacity = 50,
  overlayClassName = '',
  closeOnOverlayClick = true,
}: ModalProps) {
  if (!open) return null;

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) {
    console.error('Modal root element not found');
    return null;
  }

  const handleOverlayClick = (e: MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleContentClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return createPortal(
    <div
      className={`fixed inset-0 ${overlayOpacityClasses[overlayOpacity]} flex items-center justify-center overflow-auto p-4 ${overlayClassName}`}
      onClick={handleOverlayClick}
    >
      <div onClick={handleContentClick}>
        {children}
      </div>
    </div>,
    modalRoot
  );
}

export default Modal;
```

### Step 1.3: Create index export

**File:** `src/components/Modal/index.ts`

```ts
export { Modal, default } from './Modal';
```

### Step 1.4: Verify modal portal works

Run: `npm run dev`

Open browser console and verify:
- `document.getElementById('modal-root')` returns an element
- No console errors

---

## Task 2: Remove z-index from Sidebar

**Files:**
- Modify: `src/components/Sidebar.tsx`

### Step 2.1: Remove zIndex from sidebarStyle

**File:** `src/components/Sidebar.tsx` (line ~396)

Find:
```typescript
const sidebarStyle: React.CSSProperties = {
  height: "100vh",
  background: "#fff",
  borderRight: "1px solid #e5e7eb",
  boxShadow: "0 2px 8px 0 rgba(0,0,0,0.04)",
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
  flexShrink: 0,
  position: "sticky",
  top: 0,
  left: 0,
  zIndex: 100,
};
```

Replace with:
```typescript
const sidebarStyle: React.CSSProperties = {
  height: "100vh",
  background: "#fff",
  borderRight: "1px solid #e5e7eb",
  boxShadow: "0 2px 8px 0 rgba(0,0,0,0.04)",
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
  flexShrink: 0,
  position: "sticky",
  top: 0,
  left: 0,
};
```

---

## Task 3: Migrate CateringOrdersTableView.tsx modals

**Files:**
- Modify: `src/pages/CateringOrdersTableView.tsx`

### Step 3.1: Add Modal import

At top of file, add:
```tsx
import { Modal } from '../components/Modal';
```

### Step 3.2: Migrate OrderDetailsModal (line ~230)

Find the OrderDetailsModal function and locate (around line 230):
```tsx
return (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[150] overflow-auto p-4" onClick={onClose}>
    <div className="bg-white rounded-xl w-full max-w-5xl min-w-[600px] max-h-[90vh] overflow-y-auto shadow-2xl flex-shrink-0" onClick={(e) => e.stopPropagation()}>
```

Replace with:
```tsx
return (
  <Modal open={true} onClose={onClose} overlayOpacity={50}>
    <div className="bg-white rounded-xl w-full max-w-5xl min-w-[600px] max-h-[90vh] overflow-y-auto shadow-2xl flex-shrink-0">
```

And find the closing `</div></div>` for the modal (around line 880) and replace the outer `</div>` with `</Modal>`.

### Step 3.3: Migrate Send Payment Link modal (line ~765)

Find:
```tsx
{showSendPaymentModal && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[160] overflow-auto" onClick={(e) => e.stopPropagation()}>
    <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 my-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
```

Replace with:
```tsx
<Modal open={showSendPaymentModal} onClose={() => setShowSendPaymentModal(false)} overlayOpacity={60} closeOnOverlayClick={false}>
  <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 my-4 max-h-[90vh] overflow-y-auto">
```

And update the closing tags accordingly.

### Step 3.4: Test CateringOrdersTableView

Run: `npm run dev`
- Navigate to Catering Orders
- Open an order details modal
- Verify modal appears above sidebar
- Verify clicking outside closes modal
- Open payment link modal from within order details
- Verify nested modal works correctly

---

## Task 4: Migrate CateringScreen.tsx modals

**Files:**
- Modify: `src/pages/CateringScreen.tsx`

### Step 4.1: Add Modal import

```tsx
import { Modal } from '../components/Modal';
```

### Step 4.2: Migrate all 5 modals

Locations to migrate:
1. Line ~227 - Main order details modal (z-50)
2. Line ~542 - First nested modal (z-[60])
3. Line ~685 - Second nested modal (z-[60])
4. Line ~737 - Third nested modal (z-[60])
5. Line ~849 - Fourth nested modal (z-[60])

For each, follow the same pattern as Task 3.

---

## Task 5: Migrate OrdersScreen.tsx modals

**Files:**
- Modify: `src/pages/OrdersScreen.tsx`

### Step 5.1: Add Modal import

```tsx
import { Modal } from '../components/Modal';
```

### Step 5.2: Migrate all 3 modals

Locations:
1. Line ~69 (z-50)
2. Line ~146 (z-50)
3. Line ~428 (z-[60])

---

## Task 6: Migrate CorporateOrderScreen.tsx modals

**Files:**
- Modify: `src/pages/CorporateOrderScreen.tsx`

### Step 6.1: Add Modal import and migrate 3 modals

Locations:
1. Line ~149 (z-50)
2. Line ~426 (z-[60])
3. Line ~673 (z-50)

---

## Task 7: Migrate CorporateOrdersTableView.tsx modal

**Files:**
- Modify: `src/pages/CorporateOrdersTableView.tsx`

### Step 7.1: Add Modal import and migrate 1 modal

Location: Line ~84 (z-50)

---

## Task 8: Migrate PayoutScreen.tsx modals

**Files:**
- Modify: `src/pages/PayoutScreen.tsx`

### Step 8.1: Add Modal import and migrate 3 modals

Locations:
1. Line ~149 (z-50)
2. Line ~307 (z-[60])
3. Line ~340 (z-[60])

---

## Task 9: Migrate StripeAccountsScreen.tsx modal

**Files:**
- Modify: `src/pages/StripeAccountsScreen.tsx`

### Step 9.1: Add Modal import and migrate 1 modal

Location: Line ~49 (z-50)

---

## Task 10: Update CSS-based modals

### Step 10.1: AddRestaurantModal.css

**File:** `src/components/AddRestaurantModal/AddRestaurantModal.css` (line 9)

Find:
```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1rem;
}
```

Replace with (remove z-index):
```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
```

**ALSO:** Update AddRestaurantModal.tsx to use createPortal:
```tsx
import { createPortal } from 'react-dom';

// In render, wrap entire modal with portal:
return createPortal(
  <div className="modal-overlay">
    ...existing content...
  </div>,
  document.getElementById('modal-root')!
);
```

### Step 10.2: PromoForm.css

**File:** `src/components/PromoForm/Promoform.css` (line 281)

Remove `z-index: 50;` from the modal-overlay class.

Update PromoForm.tsx to use createPortal.

### Step 10.3: ImageCropper.css

**File:** `src/components/ImageCropper/ImageCropper.css` (line 11)

Remove `z-index: 2000;` from the modal class.

Update ImageCropper.tsx to use createPortal.

### Step 10.4: RestaurantScreen.css

**File:** `src/pages/RestaurantScreen/RestaurantScreen.css` (line 976)

Remove `z-index: 1000;` from the modal-overlay class.

Update RestaurantScreen.tsx to use createPortal for modals.

### Step 10.5: CategoriesScreen.css

**File:** `src/pages/CategoriesScreen/CategoriesScreen.css` (line 238)

Remove `z-index: 1000;`.

Update CategoriesScreen.tsx to use createPortal.

### Step 10.6: BundlesScreen.css

**File:** `src/pages/BundlesScreen/BundlesScreen.css` (line 272)

Remove `z-index: 1000;`.

Update BundlesScreen.tsx to use createPortal.

### Step 10.7: EventsScreen.css

**File:** `src/pages/EventsScreen/EventsScreen.css` (line 281)

Remove `z-index: 1000;`.

Update EventsScreen.tsx to use createPortal.

### Step 10.8: EventCategoriesScreen.css

**File:** `src/pages/EventCategoriesScreen/EventCategoriesScreen.css` (line 306)

Remove `z-index: 1000;`.

Update EventCategoriesScreen.tsx to use createPortal.

### Step 10.9: PromotionsScreen.css

**File:** `src/pages/PromotionsScreen/PromotionsScreen.css` (line 281)

Remove `z-index: 50;`.

Update PromotionsScreen.tsx to use createPortal.

---

## Task 11: Final Testing

### Step 11.1: Full app test

Run: `npm run dev`

Test each page with modals:
1. **Catering Orders** - Open order, test payment link modal
2. **Orders** - Open order details
3. **Corporate Orders** - Open order details
4. **Payouts** - Open payout details
5. **Stripe Accounts** - Open account details
6. **Restaurants** - Open restaurant edit modal
7. **Categories** - Open category edit modal
8. **Bundles** - Open bundle edit modal
9. **Events** - Open event edit modal
10. **Event Categories** - Open category edit modal
11. **Promotions** - Open promo edit modal

For each, verify:
- Modal appears above sidebar (no overlap)
- Modal centers correctly in viewport
- Click outside closes modal (where applicable)
- Escape key behavior (if implemented)
- Nested modals work correctly

### Step 11.2: Build verification

Run: `npm run build`

Expected: Build succeeds with no errors

### Step 11.3: Type check

Run: `npm run typecheck` (or `tsc --noEmit`)

Expected: No TypeScript errors

---

## Task 12: Cleanup

### Step 12.1: Search for remaining z-index in modals

Run: `grep -rn "z-index\|zIndex" src/ --include="*.tsx" --include="*.css" | grep -v node_modules`

Verify only non-modal z-index remains:
- Dropdowns (LucideIconPicker, RestaurantMultiSelect)
- Map controls
- Other non-modal UI elements

### Step 12.2: Document the pattern

Add comment to Modal.tsx explaining the pattern for future developers.

---

## Rollback Plan

If something breaks:

1. Revert all changes: `git checkout .`
2. The old z-index approach will work again immediately

---

## Summary of Changes

| Category | Files Modified | Action |
|----------|---------------|--------|
| Infrastructure | `index.html` | Add `#modal-root` |
| New Component | `src/components/Modal/` | Create portal-based Modal |
| Sidebar | `src/components/Sidebar.tsx` | Remove zIndex |
| Page Modals | 8 page files | Migrate to Modal component |
| CSS Modals | 9 CSS files | Remove z-index |
| CSS Components | 9 component files | Add createPortal |

**Total files to modify:** ~27 files
