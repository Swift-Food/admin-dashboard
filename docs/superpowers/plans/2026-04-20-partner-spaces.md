# Partner Spaces Admin UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Partner Spaces management screen in the Swift admin dashboard that lets admins list, create, edit, and rotate keys for partner venue spaces.

**Architecture:** Single-file screen (`PartnerSpacesScreen.tsx`) with all state managed locally, following the BundlesScreen pattern. A dedicated service and types file keep API logic separate. Wired into Swift mode's sidebar and the existing `/:mode/:page` routing.

**Tech Stack:** React, TypeScript, Axios (via existing `http` instance), CSS Modules (plain `.css`), lucide-react icons, FontAwesome (for sidebar icon).

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/types/partner-spaces.types.ts` | Create | TS types for PartnerSpace, CreateDto, UpdateDto |
| `src/services/partner-spaces.service.ts` | Create | API calls: getAll, create, update, rotateKey |
| `src/pages/PartnerSpacesScreen/PartnerSpacesScreen.tsx` | Create | Full screen: list, create modal, detail/edit modal, rotate key |
| `src/pages/PartnerSpacesScreen/PartnerSpacesScreen.css` | Create | All styles for the screen |
| `src/components/Sidebar.tsx` | Modify | Add `"partner-spaces"` to `SidebarPage` type + swift nav item |
| `src/App.tsx` | Modify | Add path mappings, `swiftPages` entry, import, render case |

---

## Task 1: Types

**Files:**
- Create: `src/types/partner-spaces.types.ts`

- [ ] **Step 1: Create the types file**

```ts
export interface PartnerSpace {
  id: string;
  name: string;
  slug: string;
  publishableKey: string;
  isActive: boolean;
  contactEmail: string;
  webhookUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePartnerSpaceDto {
  name: string;
  slug: string;
  contactEmail: string;
  webhookUrl?: string;
}

export interface UpdatePartnerSpaceDto {
  name?: string;
  slug?: string;
  contactEmail?: string;
  webhookUrl?: string;
  isActive?: boolean;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/partner-spaces.types.ts
git commit -m "feat: add partner-spaces types"
```

---

## Task 2: Service

**Files:**
- Create: `src/services/partner-spaces.service.ts`

- [ ] **Step 1: Create the service file**

```ts
import http from "./http";
import type {
  PartnerSpace,
  CreatePartnerSpaceDto,
  UpdatePartnerSpaceDto,
} from "../types/partner-spaces.types";

const partnerSpacesService = {
  getAll: async (): Promise<PartnerSpace[]> => {
    const { data } = await http.get<PartnerSpace[]>("/admin/partner-spaces");
    return data;
  },

  create: async (dto: CreatePartnerSpaceDto): Promise<PartnerSpace> => {
    const { data } = await http.post<PartnerSpace>("/admin/partner-spaces", dto);
    return data;
  },

  update: async (id: string, dto: UpdatePartnerSpaceDto): Promise<PartnerSpace> => {
    const { data } = await http.patch<PartnerSpace>(`/admin/partner-spaces/${id}`, dto);
    return data;
  },

  rotateKey: async (id: string): Promise<PartnerSpace> => {
    const { data } = await http.post<PartnerSpace>(
      `/admin/partner-spaces/${id}/rotate-key`
    );
    return data;
  },
};

export default partnerSpacesService;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/partner-spaces.service.ts
git commit -m "feat: add partner-spaces service"
```

---

## Task 3: Screen Skeleton + CSS

**Files:**
- Create: `src/pages/PartnerSpacesScreen/PartnerSpacesScreen.tsx`
- Create: `src/pages/PartnerSpacesScreen/PartnerSpacesScreen.css`

- [ ] **Step 1: Create the CSS file**

```css
/* Layout */
.ps-screen {
  min-height: 100vh;
  background: #f9fafb;
  padding: 1.5rem;
}

.ps-content {
  max-width: 1280px;
  margin: 0 auto;
}

/* Header */
.ps-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.ps-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.ps-subtitle {
  color: #6b7280;
  margin-top: 0.25rem;
  font-size: 0.875rem;
}

/* Buttons */
.ps-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background 0.15s;
}

.ps-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ps-btn-primary {
  background: #1d4ed8;
  color: #fff;
}

.ps-btn-primary:hover:not(:disabled) {
  background: #1e40af;
}

.ps-btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
}

.ps-btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.ps-btn-danger {
  background: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.ps-btn-danger:hover:not(:disabled) {
  background: #fecaca;
}

.ps-btn-sm {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
}

/* Loading State */
.ps-loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f9fafb;
}

.ps-spinner {
  width: 3rem;
  height: 3rem;
  border: 2px solid #e5e7eb;
  border-top-color: #1d4ed8;
  border-radius: 50%;
  animation: ps-spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes ps-spin {
  to { transform: rotate(360deg); }
}

.ps-loading-text {
  color: #6b7280;
  text-align: center;
}

/* Error State */
.ps-error-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f9fafb;
}

.ps-error-card {
  background: #fff;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 1.5rem 2rem;
  text-align: center;
  max-width: 400px;
}

.ps-error-title {
  color: #b91c1c;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.ps-error-message {
  color: #6b7280;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

/* Table */
.ps-table-container {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.ps-table {
  width: 100%;
  border-collapse: collapse;
}

.ps-table th {
  background: #f9fafb;
  padding: 0.75rem 1rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #e5e7eb;
}

.ps-table td {
  padding: 0.875rem 1rem;
  font-size: 0.875rem;
  color: #374151;
  border-bottom: 1px solid #f3f4f6;
}

.ps-table tr:last-child td {
  border-bottom: none;
}

.ps-table tbody tr {
  cursor: pointer;
  transition: background 0.1s;
}

.ps-table tbody tr:hover {
  background: #f9fafb;
}

.ps-table tbody tr.ps-row-inactive td:first-child {
  text-decoration: line-through;
}

.ps-table tbody tr.ps-row-inactive {
  opacity: 0.5;
}

/* Status Badge */
.ps-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.ps-badge-active {
  background: #dcfce7;
  color: #166534;
}

.ps-badge-inactive {
  background: #fee2e2;
  color: #991b1b;
}

/* Empty State */
.ps-empty {
  padding: 3rem 1rem;
  text-align: center;
  color: #6b7280;
}

/* Modal Overlay */
.ps-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.ps-modal {
  background: #fff;
  border-radius: 10px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.ps-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.ps-modal-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.ps-modal-close {
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  padding: 0.25rem;
  display: flex;
  align-items: center;
}

.ps-modal-close:hover {
  color: #111827;
}

.ps-modal-body {
  padding: 1.5rem;
}

.ps-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
}

/* Form */
.ps-form-group {
  margin-bottom: 1.25rem;
}

.ps-form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.4rem;
}

.ps-form-label .ps-required {
  color: #ef4444;
  margin-left: 2px;
}

.ps-form-input,
.ps-form-select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #111827;
  background: #fff;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.ps-form-input:focus,
.ps-form-select:focus {
  outline: none;
  border-color: #1d4ed8;
  box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.1);
}

.ps-form-input.ps-input-error {
  border-color: #ef4444;
}

.ps-form-input:read-only {
  background: #f9fafb;
  cursor: default;
}

.ps-field-error {
  color: #b91c1c;
  font-size: 0.75rem;
  margin-top: 0.3rem;
}

.ps-form-hint {
  color: #6b7280;
  font-size: 0.75rem;
  margin-top: 0.3rem;
}

.ps-general-error {
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  color: #b91c1c;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

/* Key Box */
.ps-key-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
}

.ps-key-text {
  font-family: monospace;
  font-size: 0.8rem;
  color: #374151;
  flex: 1;
  word-break: break-all;
}

/* Active Toggle */
.ps-toggle-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-top: 1px solid #f3f4f6;
  margin-top: 1rem;
}

.ps-toggle-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

/* Rotate Key Warning */
.ps-rotate-warning {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 6px;
  padding: 1rem;
  margin-top: 1rem;
}

.ps-rotate-warning-text {
  font-size: 0.875rem;
  color: #92400e;
  margin-bottom: 0.75rem;
}

.ps-rotate-actions {
  display: flex;
  gap: 0.5rem;
}

/* Section separator */
.ps-section-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 1.25rem 0 0.5rem;
}
```

- [ ] **Step 2: Create the screen skeleton**

```tsx
import { useEffect, useState } from "react";
import { Plus, X, Copy, Check, RefreshCw } from "lucide-react";
import partnerSpacesService from "../../services/partner-spaces.service";
import type {
  PartnerSpace,
  CreatePartnerSpaceDto,
  UpdatePartnerSpaceDto,
} from "../../types/partner-spaces.types";
import "./PartnerSpacesScreen.css";

const toSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const parseApiErrors = (
  err: unknown
): { fieldErrors: Record<string, string>; general: string | null } => {
  const anyErr = err as any;
  const raw = anyErr?.response?.data?.message;
  const messages: string[] = Array.isArray(raw)
    ? raw
    : [raw || anyErr?.message || "An error occurred"];

  const fieldErrors: Record<string, string> = {};
  let general: string | null = null;

  for (const msg of messages) {
    if (typeof msg !== "string") continue;
    const lower = msg.toLowerCase();
    if (lower.includes("slug")) fieldErrors.slug = msg;
    else if (lower.includes("email")) fieldErrors.contactEmail = msg;
    else if (lower.includes("webhook")) fieldErrors.webhookUrl = msg;
    else if (lower.includes("name")) fieldErrors.name = msg;
    else general = msg;
  }

  if (Object.keys(fieldErrors).length === 0 && !general) {
    general = messages[0] ?? "An error occurred";
  }

  return { fieldErrors, general };
};

const emptyCreate: CreatePartnerSpaceDto = {
  name: "",
  slug: "",
  contactEmail: "",
  webhookUrl: "",
};

const PartnerSpacesScreen = () => {
  const [spaces, setSpaces] = useState<PartnerSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreatePartnerSpaceDto>({ ...emptyCreate });
  const [submitting, setSubmitting] = useState(false);
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string>>({});
  const [createGeneralError, setCreateGeneralError] = useState<string | null>(null);

  // Detail/Edit modal
  const [selectedSpace, setSelectedSpace] = useState<PartnerSpace | null>(null);
  const [editForm, setEditForm] = useState<UpdatePartnerSpaceDto & { name: string; slug: string; contactEmail: string; webhookUrl: string }>({
    name: "",
    slug: "",
    contactEmail: "",
    webhookUrl: "",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});
  const [editGeneralError, setEditGeneralError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await partnerSpacesService.getAll();
      setSpaces(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load partner spaces");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="ps-loading-container">
        <div>
          <div className="ps-spinner" />
          <p className="ps-loading-text">Loading partner spaces...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ps-error-container">
        <div className="ps-error-card">
          <p className="ps-error-title">Error Loading Data</p>
          <p className="ps-error-message">{error}</p>
          <button className="ps-btn ps-btn-secondary" onClick={fetchSpaces}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ps-screen">
      <div className="ps-content">
        <div className="ps-header">
          <div>
            <h1 className="ps-title">Partner Spaces</h1>
            <p className="ps-subtitle">Manage venues that embed the Swift catering widget</p>
          </div>
          <button className="ps-btn ps-btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            Add Partner Space
          </button>
        </div>

        {/* List table — Task 4 */}
        <div className="ps-table-container">
          {spaces.length === 0 ? (
            <div className="ps-empty">
              <p>No partner spaces yet.</p>
            </div>
          ) : (
            <p style={{ padding: "1rem", color: "#6b7280" }}>
              {spaces.length} space(s) — table coming in Task 4
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PartnerSpacesScreen;
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/PartnerSpacesScreen/
git commit -m "feat: add PartnerSpacesScreen skeleton and CSS"
```

---

## Task 4: Wire into Sidebar + App

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add `"partner-spaces"` to the `SidebarPage` union type in `Sidebar.tsx`**

Find the `SidebarPage` type (around line 30) and add the new entry:

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
  | "partner-spaces"    // ← add this
  | "miscellaneous";
```

- [ ] **Step 2: Add the sidebar icon import**

The `faHandshake` icon from FontAwesome suits "partners". Add it to the existing import block at the top of `Sidebar.tsx`:

```ts
import {
  // ...existing icons...
  faHandshake,
} from "@fortawesome/free-solid-svg-icons";
```

- [ ] **Step 3: Add nav item to the swift-management section in `Sidebar.tsx`**

Find the `swift-management` section in the `navSections` array and add:

```ts
{
  id: "partner-spaces" as SidebarPage,
  label: "Partner Spaces",
  icon: <FontAwesomeIcon icon={faHandshake} style={iconCommonStyle} />,
},
```

Add it after the `"catering-bundles"` item.

- [ ] **Step 4: Update `App.tsx` — path maps**

In `pathToPageMap`, add:
```ts
"partner-spaces": "partner-spaces",
```

In `pageToPathMap`, add:
```ts
"partner-spaces": "partner-spaces",
```

- [ ] **Step 5: Add to `swiftPages` array in `App.tsx`**

```ts
const swiftPages: SidebarPage[] = [
  // ...existing pages...
  "partner-spaces",   // ← add
];
```

- [ ] **Step 6: Add import and render case in `App.tsx`**

Add import near the other page imports:
```ts
import PartnerSpacesScreen from "./pages/PartnerSpacesScreen/PartnerSpacesScreen";
```

Add render case inside `renderPage()`:
```ts
case "partner-spaces":
  return <PartnerSpacesScreen />;
```

Add it before the `case "home":` line.

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 8: Manual verification**

Start the dev server (`npm run dev`) and navigate to `/swift/partner-spaces`. Confirm:
- "Partner Spaces" appears in the sidebar under Management
- The page loads with the spinner, then shows "No partner spaces yet." (or a list if the API has data)
- No console errors

- [ ] **Step 9: Commit**

```bash
git add src/components/Sidebar.tsx src/App.tsx
git commit -m "feat: wire partner-spaces into sidebar and routing"
```

---

## Task 5: List Table

**Files:**
- Modify: `src/pages/PartnerSpacesScreen/PartnerSpacesScreen.tsx`

Replace the placeholder content inside the `ps-table-container` div with the real table. Find this block:

```tsx
{spaces.length === 0 ? (
  <div className="ps-empty">
    <p>No partner spaces yet.</p>
  </div>
) : (
  <p style={{ padding: "1rem", color: "#6b7280" }}>
    {spaces.length} space(s) — table coming in Task 4
  </p>
)}
```

- [ ] **Step 1: Replace with the full table**

```tsx
{spaces.length === 0 ? (
  <div className="ps-empty">
    <p>No partner spaces yet. Click "Add Partner Space" to create one.</p>
  </div>
) : (
  <table className="ps-table">
    <thead>
      <tr>
        <th>Name</th>
        <th>Slug</th>
        <th>Contact Email</th>
        <th>Status</th>
        <th>Created</th>
      </tr>
    </thead>
    <tbody>
      {spaces.map((space) => (
        <tr
          key={space.id}
          className={!space.isActive ? "ps-row-inactive" : ""}
          onClick={() => openDetail(space)}
        >
          <td>{space.name}</td>
          <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{space.slug}</td>
          <td>{space.contactEmail}</td>
          <td>
            <span className={`ps-badge ${space.isActive ? "ps-badge-active" : "ps-badge-inactive"}`}>
              {space.isActive ? "Active" : "Inactive"}
            </span>
          </td>
          <td>{new Date(space.createdAt).toLocaleDateString()}</td>
        </tr>
      ))}
    </tbody>
  </table>
)}
```

- [ ] **Step 2: Add the `openDetail` handler** (place it with other handlers, before the `return` statement)

```tsx
const openDetail = (space: PartnerSpace) => {
  setSelectedSpace(space);
  setEditForm({
    name: space.name,
    slug: space.slug,
    contactEmail: space.contactEmail,
    webhookUrl: space.webhookUrl ?? "",
    isActive: space.isActive,
  });
  setEditFieldErrors({});
  setEditGeneralError(null);
  setShowRotateConfirm(false);
  setCopiedKey(false);
};

const closeDetail = () => {
  setSelectedSpace(null);
  setShowRotateConfirm(false);
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Manual check**

Navigate to `/swift/partner-spaces`. If the API has data, confirm the table renders with correct columns. Inactive rows should appear muted with strikethrough on the name.

- [ ] **Step 5: Commit**

```bash
git add src/pages/PartnerSpacesScreen/PartnerSpacesScreen.tsx
git commit -m "feat: add partner spaces list table"
```

---

## Task 6: Create Modal

**Files:**
- Modify: `src/pages/PartnerSpacesScreen/PartnerSpacesScreen.tsx`

- [ ] **Step 1: Add the create handler** (before the `return` statement)

```tsx
const openCreate = () => {
  setCreateForm({ ...emptyCreate });
  setCreateFieldErrors({});
  setCreateGeneralError(null);
  setShowCreate(true);
};

const closeCreate = () => {
  setShowCreate(false);
};

const handleCreateNameChange = (name: string) => {
  setCreateForm((prev) => ({
    ...prev,
    name,
    slug: prev.slug === "" || prev.slug === toSlug(prev.name) ? toSlug(name) : prev.slug,
  }));
};

const handleCreate = async (e: React.FormEvent) => {
  e.preventDefault();
  setCreateFieldErrors({});
  setCreateGeneralError(null);

  const dto: CreatePartnerSpaceDto = {
    name: createForm.name.trim(),
    slug: createForm.slug.trim(),
    contactEmail: createForm.contactEmail.trim(),
    ...(createForm.webhookUrl?.trim() ? { webhookUrl: createForm.webhookUrl.trim() } : {}),
  };

  try {
    setSubmitting(true);
    await partnerSpacesService.create(dto);
    await fetchSpaces();
    closeCreate();
  } catch (err) {
    const { fieldErrors, general } = parseApiErrors(err);
    setCreateFieldErrors(fieldErrors);
    setCreateGeneralError(general);
  } finally {
    setSubmitting(false);
  }
};
```

- [ ] **Step 2: Update the "Add Partner Space" button** to call `openCreate` instead of `setShowCreate(true)`

```tsx
<button className="ps-btn ps-btn-primary" onClick={openCreate}>
  <Plus size={16} />
  Add Partner Space
</button>
```

- [ ] **Step 3: Add the create modal JSX** at the bottom of the component's return, just before the closing `</div>` of `ps-screen`

```tsx
{showCreate && (
  <div className="ps-modal-overlay" onClick={closeCreate}>
    <div className="ps-modal" onClick={(e) => e.stopPropagation()}>
      <div className="ps-modal-header">
        <h2 className="ps-modal-title">Add Partner Space</h2>
        <button className="ps-modal-close" onClick={closeCreate}>
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleCreate}>
        <div className="ps-modal-body">
          {createGeneralError && (
            <div className="ps-general-error">{createGeneralError}</div>
          )}

          <div className="ps-form-group">
            <label className="ps-form-label">
              Name <span className="ps-required">*</span>
            </label>
            <input
              className={`ps-form-input${createFieldErrors.name ? " ps-input-error" : ""}`}
              value={createForm.name}
              onChange={(e) => handleCreateNameChange(e.target.value)}
              placeholder="e.g. Grand Hotel London"
              autoFocus
            />
            {createFieldErrors.name && (
              <p className="ps-field-error">{createFieldErrors.name}</p>
            )}
          </div>

          <div className="ps-form-group">
            <label className="ps-form-label">
              Slug <span className="ps-required">*</span>
            </label>
            <input
              className={`ps-form-input${createFieldErrors.slug ? " ps-input-error" : ""}`}
              value={createForm.slug}
              onChange={(e) => setCreateForm((p) => ({ ...p, slug: e.target.value }))}
              placeholder="e.g. grand-hotel-london"
            />
            <p className="ps-form-hint">Auto-suggested from name. Must be unique.</p>
            {createFieldErrors.slug && (
              <p className="ps-field-error">{createFieldErrors.slug}</p>
            )}
          </div>

          <div className="ps-form-group">
            <label className="ps-form-label">
              Contact Email <span className="ps-required">*</span>
            </label>
            <input
              type="email"
              className={`ps-form-input${createFieldErrors.contactEmail ? " ps-input-error" : ""}`}
              value={createForm.contactEmail}
              onChange={(e) => setCreateForm((p) => ({ ...p, contactEmail: e.target.value }))}
              placeholder="contact@venue.com"
            />
            {createFieldErrors.contactEmail && (
              <p className="ps-field-error">{createFieldErrors.contactEmail}</p>
            )}
          </div>

          <div className="ps-form-group">
            <label className="ps-form-label">Webhook URL</label>
            <input
              type="url"
              className={`ps-form-input${createFieldErrors.webhookUrl ? " ps-input-error" : ""}`}
              value={createForm.webhookUrl}
              onChange={(e) => setCreateForm((p) => ({ ...p, webhookUrl: e.target.value }))}
              placeholder="https://venue.com/webhooks/swift"
            />
            <p className="ps-form-hint">Optional. Must start with https://</p>
            {createFieldErrors.webhookUrl && (
              <p className="ps-field-error">{createFieldErrors.webhookUrl}</p>
            )}
          </div>
        </div>

        <div className="ps-modal-actions">
          <button
            type="button"
            className="ps-btn ps-btn-secondary"
            onClick={closeCreate}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ps-btn ps-btn-primary"
            disabled={submitting}
          >
            {submitting ? "Creating..." : "Create Space"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Manual check**

Open the create modal. Verify:
- Typing in Name auto-populates Slug (only while slug is empty / matches derived slug)
- Submitting with empty fields shows required validation from the API
- On success the modal closes and the new space appears in the table

- [ ] **Step 6: Commit**

```bash
git add src/pages/PartnerSpacesScreen/PartnerSpacesScreen.tsx
git commit -m "feat: add create partner space modal"
```

---

## Task 7: Detail / Edit Modal

**Files:**
- Modify: `src/pages/PartnerSpacesScreen/PartnerSpacesScreen.tsx`

- [ ] **Step 1: Add copy-key and save handlers** (before the `return` statement)

```tsx
const handleCopyKey = async () => {
  if (!selectedSpace) return;
  await navigator.clipboard.writeText(selectedSpace.publishableKey);
  setCopiedKey(true);
  setTimeout(() => setCopiedKey(false), 2000);
};

const handleSave = async () => {
  if (!selectedSpace) return;
  setEditFieldErrors({});
  setEditGeneralError(null);

  const dto: UpdatePartnerSpaceDto = {
    name: editForm.name.trim() || undefined,
    slug: editForm.slug.trim() || undefined,
    contactEmail: editForm.contactEmail.trim() || undefined,
    webhookUrl: editForm.webhookUrl?.trim() || undefined,
    isActive: editForm.isActive,
  };

  try {
    setSaving(true);
    const updated = await partnerSpacesService.update(selectedSpace.id, dto);
    setSpaces((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setSelectedSpace(updated);
  } catch (err) {
    const { fieldErrors, general } = parseApiErrors(err);
    setEditFieldErrors(fieldErrors);
    setEditGeneralError(general);
  } finally {
    setSaving(false);
  }
};
```

- [ ] **Step 2: Add the detail/edit modal JSX** after the create modal block

```tsx
{selectedSpace && (
  <div className="ps-modal-overlay" onClick={closeDetail}>
    <div className="ps-modal" onClick={(e) => e.stopPropagation()}>
      <div className="ps-modal-header">
        <h2 className="ps-modal-title">{selectedSpace.name}</h2>
        <button className="ps-modal-close" onClick={closeDetail}>
          <X size={20} />
        </button>
      </div>

      <div className="ps-modal-body">
        {editGeneralError && (
          <div className="ps-general-error">{editGeneralError}</div>
        )}

        <div className="ps-form-group">
          <label className="ps-form-label">
            Name <span className="ps-required">*</span>
          </label>
          <input
            className={`ps-form-input${editFieldErrors.name ? " ps-input-error" : ""}`}
            value={editForm.name}
            onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
          />
          {editFieldErrors.name && (
            <p className="ps-field-error">{editFieldErrors.name}</p>
          )}
        </div>

        <div className="ps-form-group">
          <label className="ps-form-label">
            Slug <span className="ps-required">*</span>
          </label>
          <input
            className={`ps-form-input${editFieldErrors.slug ? " ps-input-error" : ""}`}
            value={editForm.slug}
            onChange={(e) => setEditForm((p) => ({ ...p, slug: e.target.value }))}
          />
          {editFieldErrors.slug && (
            <p className="ps-field-error">{editFieldErrors.slug}</p>
          )}
        </div>

        <div className="ps-form-group">
          <label className="ps-form-label">
            Contact Email <span className="ps-required">*</span>
          </label>
          <input
            type="email"
            className={`ps-form-input${editFieldErrors.contactEmail ? " ps-input-error" : ""}`}
            value={editForm.contactEmail}
            onChange={(e) => setEditForm((p) => ({ ...p, contactEmail: e.target.value }))}
          />
          {editFieldErrors.contactEmail && (
            <p className="ps-field-error">{editFieldErrors.contactEmail}</p>
          )}
        </div>

        <div className="ps-form-group">
          <label className="ps-form-label">Webhook URL</label>
          <input
            type="url"
            className={`ps-form-input${editFieldErrors.webhookUrl ? " ps-input-error" : ""}`}
            value={editForm.webhookUrl}
            onChange={(e) => setEditForm((p) => ({ ...p, webhookUrl: e.target.value }))}
            placeholder="https://"
          />
          {editFieldErrors.webhookUrl && (
            <p className="ps-field-error">{editFieldErrors.webhookUrl}</p>
          )}
        </div>

        <p className="ps-section-label">Publishable Key</p>
        <div className="ps-key-box">
          <span className="ps-key-text">{selectedSpace.publishableKey}</span>
          <button
            type="button"
            className="ps-btn ps-btn-sm ps-btn-secondary"
            onClick={handleCopyKey}
          >
            {copiedKey ? <Check size={14} /> : <Copy size={14} />}
            {copiedKey ? "Copied!" : "Copy"}
          </button>
        </div>

        <div className="ps-toggle-row">
          <span className="ps-toggle-label">Active</span>
          <input
            type="checkbox"
            checked={editForm.isActive}
            onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.checked }))}
          />
        </div>

        {/* Rotate Key — Task 8 */}
        <p className="ps-section-label" style={{ marginTop: "1.5rem" }}>Danger Zone</p>
        {!showRotateConfirm ? (
          <button
            type="button"
            className="ps-btn ps-btn-secondary ps-btn-sm"
            onClick={() => setShowRotateConfirm(true)}
          >
            <RefreshCw size={14} />
            Rotate Key
          </button>
        ) : (
          <div className="ps-rotate-warning">
            <p className="ps-rotate-warning-text">
              This will invalidate the current key. All widgets using it will stop working.
            </p>
            <div className="ps-rotate-actions">
              <button
                type="button"
                className="ps-btn ps-btn-sm ps-btn-secondary"
                onClick={() => setShowRotateConfirm(false)}
                disabled={rotating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ps-btn ps-btn-sm ps-btn-danger"
                disabled={rotating}
                onClick={() => {/* Task 8 */}}
              >
                {rotating ? "Rotating..." : "Confirm Rotate"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="ps-modal-actions">
        <button
          type="button"
          className="ps-btn ps-btn-secondary"
          onClick={closeDetail}
          disabled={saving}
        >
          Close
        </button>
        <button
          type="button"
          className="ps-btn ps-btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Manual check**

Click a row in the list. Verify:
- Modal opens with all fields pre-populated
- Editing fields and clicking Save calls PATCH and updates the row in the list
- Publishable key shows in monospace box with copy button
- Copy button shows "Copied!" for 2 seconds
- Active checkbox updates `isActive` on save
- "Rotate Key" button shows the warning box

- [ ] **Step 5: Commit**

```bash
git add src/pages/PartnerSpacesScreen/PartnerSpacesScreen.tsx
git commit -m "feat: add detail/edit modal for partner spaces"
```

---

## Task 8: Rotate Key

**Files:**
- Modify: `src/pages/PartnerSpacesScreen/PartnerSpacesScreen.tsx`

- [ ] **Step 1: Add the rotate handler** (before the `return` statement)

```tsx
const handleRotateKey = async () => {
  if (!selectedSpace) return;
  try {
    setRotating(true);
    const updated = await partnerSpacesService.rotateKey(selectedSpace.id);
    setSelectedSpace(updated);
    setSpaces((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setShowRotateConfirm(false);
    setCopiedKey(false);
  } catch (err) {
    const anyErr = err as any;
    const msg =
      anyErr?.response?.data?.message ||
      anyErr?.message ||
      "Failed to rotate key";
    setEditGeneralError(typeof msg === "string" ? msg : "Failed to rotate key");
    setShowRotateConfirm(false);
  } finally {
    setRotating(false);
  }
};
```

- [ ] **Step 2: Wire the handler into the Confirm Rotate button**

Find the "Confirm Rotate" button inside the detail modal (it currently has `onClick={() => {/* Task 8 */}}`). Replace it with:

```tsx
<button
  type="button"
  className="ps-btn ps-btn-sm ps-btn-danger"
  disabled={rotating}
  onClick={handleRotateKey}
>
  {rotating ? "Rotating..." : "Confirm Rotate"}
</button>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Manual check**

Open a space's detail modal. Click "Rotate Key", then "Confirm Rotate". Verify:
- The publishable key in the monospace box updates to the new value
- The confirmation box disappears
- The list row is still in sync (if you close and reopen the modal, the key matches)

- [ ] **Step 5: Final end-to-end check**

Walk through the full golden path:
1. Create a new space — verify it appears in the list
2. Click the new space — edit the name, save — verify the list updates
3. Toggle `isActive` off — verify the row becomes muted in the list
4. Rotate the key — verify the key changes in the modal
5. Create a second space with the same slug — verify the inline field error appears on the slug field

- [ ] **Step 6: Commit**

```bash
git add src/pages/PartnerSpacesScreen/PartnerSpacesScreen.tsx
git commit -m "feat: add rotate key to partner spaces"
```
