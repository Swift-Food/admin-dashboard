# Coworking Admin Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Coworking" mode to the admin dashboard with a Spaces management page for listing spaces, toggling active/inactive, and resetting Stripe connections.

**Architecture:** Third admin mode alongside Swift/Prismo. Backend gets one new endpoint (reset-stripe). Frontend gets new types, service, and page component. Sidebar refactored from boolean ternaries to color-map lookup.

**Tech Stack:** React, TypeScript, NestJS, TypeORM, Axios, FontAwesome

**Spec:** `docs/superpowers/specs/2026-04-01-coworking-admin-page-design.md`

---

### Task 1: Backend — Add reset-stripe endpoint

**Files:**
- Modify: `/Users/momo/VSCode/Swift/backend/src/features/coworking/services/coworking-admin.service.ts`
- Modify: `/Users/momo/VSCode/Swift/backend/src/features/coworking/controllers/coworking-admin.controller.ts`

- [ ] **Step 1: Add `resetStripe` method to service**

In `coworking-admin.service.ts`, add after existing methods:

```typescript
async resetStripe(id: string): Promise<{ success: boolean; message: string }> {
  const space = await this.spaceRepo.findOne({ where: { id } });
  if (!space) {
    throw new NotFoundException(`Coworking space ${id} not found`);
  }

  space.stripeAccountId = null;
  space.stripeOnboardingComplete = false;
  await this.spaceRepo.save(space);

  this.logger.log(`Stripe connection reset for space ${space.name} (${id})`);

  return { success: true, message: 'Stripe connection reset successfully' };
}
```

- [ ] **Step 2: Add controller endpoint**

In `coworking-admin.controller.ts`, add the endpoint:

```typescript
@Post(':id/reset-stripe')
@HttpCode(HttpStatus.OK)
async resetStripe(
  @Param('id', ParseUUIDPipe) id: string,
): Promise<{ success: boolean; message: string }> {
  return this.coworkingAdminService.resetStripe(id);
}
```

- [ ] **Step 3: Type-check backend**

Run: `cd /Users/momo/VSCode/Swift/backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git -C /Users/momo/VSCode/Swift/backend add src/features/coworking/services/coworking-admin.service.ts src/features/coworking/controllers/coworking-admin.controller.ts
git -C /Users/momo/VSCode/Swift/backend commit -m "Add reset-stripe endpoint for coworking spaces"
```

---

### Task 2: Frontend — Types and service layer

**Files:**
- Create: `/Users/momo/VSCode/Swift/admin-dashboard/src/types/coworking.types.ts`
- Create: `/Users/momo/VSCode/Swift/admin-dashboard/src/services/coworking-admin.service.ts`

- [ ] **Step 1: Create types file**

Create `src/types/coworking.types.ts`:

```typescript
export interface CoworkingSpace {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean;
  depositEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedSpacesResponse {
  items: CoworkingSpace[];
  total: number;
  skip: number;
  take: number;
}
```

- [ ] **Step 2: Create service file**

Create `src/services/coworking-admin.service.ts`:

```typescript
import http from "./http";
import type { CoworkingSpace, PaginatedSpacesResponse } from "../types/coworking.types";

const coworkingAdminService = {
  getSpaces: async (): Promise<CoworkingSpace[]> => {
    const { data } = await http.get<PaginatedSpacesResponse>("/admin/coworking?take=100");
    return data.items;
  },

  getSpace: async (id: string): Promise<CoworkingSpace> => {
    const { data } = await http.get<CoworkingSpace>(`/admin/coworking/${id}`);
    return data;
  },

  updateSpace: async (id: string, updates: Partial<Pick<CoworkingSpace, "isActive" | "name">>): Promise<CoworkingSpace> => {
    const { data } = await http.put<CoworkingSpace>(`/admin/coworking/${id}`, updates);
    return data;
  },

  resetStripe: async (id: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await http.post<{ success: boolean; message: string }>(`/admin/coworking/${id}/reset-stripe`);
    return data;
  },
};

export default coworkingAdminService;
```

- [ ] **Step 3: Commit**

```bash
git -C /Users/momo/VSCode/Swift/admin-dashboard add src/types/coworking.types.ts src/services/coworking-admin.service.ts
git -C /Users/momo/VSCode/Swift/admin-dashboard commit -m "Add coworking types and admin service"
```

---

### Task 3: Sidebar — Refactor color system and add Coworking mode

**Files:**
- Modify: `/Users/momo/VSCode/Swift/admin-dashboard/src/components/Sidebar.tsx`

- [ ] **Step 1: Update types and add imports**

In `Sidebar.tsx`:

1. Add `faBuilding` to the FontAwesome import
2. Change `AdminMode` type from `"swift" | "prismo"` to `"swift" | "prismo" | "coworking"`
3. Add `"coworking-spaces"` to `SidebarPage` union type

- [ ] **Step 2: Add modeColors lookup and coworking icon style**

Replace `const isSwift = adminMode === "swift";` usage pattern. Add after the existing style constants:

```typescript
const modeColors: Record<AdminMode, { primary: string; activeBg: string; border: string; label: string; initial: string }> = {
  swift: { primary: "#1d4ed8", activeBg: "#dbeafe", border: "#e5e7eb", label: "Swift", initial: "S" },
  prismo: { primary: "#7c3aed", activeBg: "#ede9fe", border: "#ddd6fe", label: "Prismo", initial: "P" },
  coworking: { primary: "#862040", activeBg: "#fbe3e8", border: "#f5c6ce", label: "Coworking", initial: "C" },
};

const coworkingIconStyle = {
  ...iconCommonStyle,
  color: "#862040",
};
```

- [ ] **Step 3: Add coworking nav section**

Add to `navSections` array after `prismo-management`:

```typescript
{
  id: "coworking-management",
  label: "Manage",
  mode: "coworking" as AdminMode,
  items: [
    {
      id: "coworking-spaces" as SidebarPage,
      label: "Spaces",
      icon: <FontAwesomeIcon icon={faBuilding} style={coworkingIconStyle} />,
    },
  ],
},
```

- [ ] **Step 4: Refactor color ternaries to use modeColors**

Replace all `isSwift ? X : Y` patterns in the component JSX and styles with `modeColors[adminMode]` lookups. Key locations:

- Header brand color: `color: modeColors[adminMode].primary`
- Sidebar border: `borderRightColor: modeColors[adminMode].border`
- Toggle button icon color: `color: modeColors[adminMode].primary`
- Active nav item background: `modeColors[adminMode].activeBg`
- Active nav item text color: `modeColors[adminMode].primary`
- Section header active color: `modeColors[adminMode].primary`

Remove the `const isSwift = adminMode === "swift";` line.

- [ ] **Step 5: Update mode toggle for three buttons**

Replace the expanded mode toggle (currently two buttons) with three:

```typescript
{expanded ? (
  <div style={modeToggleStyle}>
    {(isPrismoAdmin
      ? (["prismo"] as AdminMode[])
      : (["swift", "prismo", "coworking"] as AdminMode[])
    ).map((m) => (
      <button
        key={m}
        onClick={() => handleModeChange(m)}
        style={{
          ...modeButtonStyle,
          background: adminMode === m ? modeColors[m].activeBg : "transparent",
          color: adminMode === m ? modeColors[m].primary : "#6b7280",
          fontWeight: adminMode === m ? 600 : 400,
        }}
      >
        {modeColors[m].label}
      </button>
    ))}
  </div>
) : (
  <button
    onClick={() => {
      const modes: AdminMode[] = isPrismoAdmin
        ? ["prismo"]
        : ["swift", "prismo", "coworking"];
      const currentIndex = modes.indexOf(adminMode);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      handleModeChange(nextMode);
    }}
    style={modeIconButtonStyle}
    title={`Switch mode (current: ${modeColors[adminMode].label})`}
  >
    <span
      style={{
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: modeColors[adminMode].activeBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 700,
        color: modeColors[adminMode].primary,
      }}
    >
      {modeColors[adminMode].initial}
    </span>
  </button>
)}
```

- [ ] **Step 6: Commit**

```bash
git -C /Users/momo/VSCode/Swift/admin-dashboard add src/components/Sidebar.tsx
git -C /Users/momo/VSCode/Swift/admin-dashboard commit -m "Add Coworking mode to sidebar with modeColors refactor"
```

---

### Task 4: App.tsx — Routing and mode validation

**Files:**
- Modify: `/Users/momo/VSCode/Swift/admin-dashboard/src/App.tsx`

- [ ] **Step 1: Add route maps and page array**

Add to `pathToPageMap`:
```typescript
spaces: "coworking-spaces",
```

Add to `pageToPathMap`:
```typescript
"coworking-spaces": "spaces",
```

Add after `prismoPages`:
```typescript
const coworkingPages: SidebarPage[] = ["home", "coworking-spaces"];
```

- [ ] **Step 2: Update PageRenderer mode validation**

Change mode validation from:
```typescript
if (mode !== "swift" && mode !== "prismo") {
```
to:
```typescript
if (mode !== "swift" && mode !== "prismo" && mode !== "coworking") {
```

Add after the PRISMO_ADMIN swift block:
```typescript
// PRISMO_ADMIN cannot access coworking mode
if (isPrismoAdmin && mode === "coworking") {
  return <Navigate to="/prismo/home" replace />;
}
```

Update `validPagesForMode`:
```typescript
const validPagesForMode =
  adminMode === "coworking" ? coworkingPages :
  adminMode === "prismo" ? prismoPages :
  swiftPages;
```

- [ ] **Step 3: Update renderPage and home case**

Add import at top:
```typescript
import CoworkingSpacesScreen from "./pages/CoworkingSpacesScreen/CoworkingSpacesScreen";
```

Add case to `renderPage()`:
```typescript
case "coworking-spaces":
  return <CoworkingSpacesScreen />;
```

Refactor `"home"` case:
```typescript
case "home":
  if (adminMode === "coworking") return <CoworkingSpacesScreen />;
  if (adminMode === "prismo") return <PrismoDashboard />;
  return <RestaurantAdminDashboard />;
```

Update default:
```typescript
default:
  if (adminMode === "coworking") return <CoworkingSpacesScreen />;
  if (adminMode === "prismo") return <PrismoDashboard />;
  return <RestaurantAdminDashboard />;
```

- [ ] **Step 4: Add /coworking bare redirect**

In the Routes block, add after the `/prismo` redirect:
```typescript
{/* Coworking routes */}
<Route path="/coworking" element={
  isPrismoAdmin ? <Navigate to="/prismo/home" replace /> : <Navigate to="/coworking/home" replace />
} />
```

- [ ] **Step 5: Commit**

```bash
git -C /Users/momo/VSCode/Swift/admin-dashboard add src/App.tsx
git -C /Users/momo/VSCode/Swift/admin-dashboard commit -m "Add coworking routing, mode validation, and page dispatch"
```

---

### Task 5: CoworkingSpacesScreen — Page component and styles

**Files:**
- Create: `/Users/momo/VSCode/Swift/admin-dashboard/src/pages/CoworkingSpacesScreen/CoworkingSpacesScreen.tsx`
- Create: `/Users/momo/VSCode/Swift/admin-dashboard/src/pages/CoworkingSpacesScreen/CoworkingSpacesScreen.css`

- [ ] **Step 1: Create CSS file**

Create `src/pages/CoworkingSpacesScreen/CoworkingSpacesScreen.css` with styles matching RestaurantScreen patterns but using wine red accent (`#862040`, `#fbe3e8`). Key classes:

- `.coworking-container` — outer padding
- `.coworking-header` — title + subtitle
- `.coworking-table` — table wrapper with border-radius and shadow
- `.coworking-row` — grid row for table
- `.coworking-detail` — expanded detail panel with `background: #fdf8f9`
- `.stripe-badge-connected` / `.stripe-badge-disconnected` — status badges
- `.btn-reset-stripe` — destructive button (white bg, red border)
- `.btn-details` — wine red button

- [ ] **Step 2: Create page component**

Create `src/pages/CoworkingSpacesScreen/CoworkingSpacesScreen.tsx`:

```typescript
import React, { useState, useEffect, useCallback } from "react";
import { AlertCircle } from "lucide-react";
import coworkingAdminService from "../../services/coworking-admin.service";
import type { CoworkingSpace } from "../../types/coworking.types";
import "./CoworkingSpacesScreen.css";
```

Component structure:
- State: `spaces: CoworkingSpace[]`, `loading`, `error`, `expandedId: string | null`, `updatingId: string | null`, `showResetConfirm: string | null`
- `fetchSpaces()` — calls `coworkingAdminService.getSpaces()`, sets loading/error states
- `handleToggleActive(space)` — calls `updateSpace(id, { isActive: !isActive })`, updates local state on success, alerts on failure
- `handleResetStripe(id)` — shows confirmation, on confirm calls `resetStripe(id)`, refreshes spaces
- Loading state: spinner matching RestaurantScreen pattern
- Error state: error card with retry button
- Table with header row + data rows
- Expanded detail row with two-column grid (space info left, Stripe info + reset button right)
- Reset confirmation modal (simple overlay matching existing delete confirmation patterns)

- [ ] **Step 3: Verify the app compiles**

Run: `cd /Users/momo/VSCode/Swift/admin-dashboard && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git -C /Users/momo/VSCode/Swift/admin-dashboard add src/pages/CoworkingSpacesScreen/
git -C /Users/momo/VSCode/Swift/admin-dashboard commit -m "Add CoworkingSpacesScreen page with table, details, and Stripe reset"
```

---

### Task 6: Deploy and verify

**Files:** None (deployment only)

- [ ] **Step 1: Push backend and deploy to Heroku**

```bash
git -C /Users/momo/VSCode/Swift/backend push origin main
git -C /Users/momo/VSCode/Swift/backend push heroku main
```

Wait for build success. No migration needed (no schema changes).

- [ ] **Step 2: Push admin dashboard**

```bash
git -C /Users/momo/VSCode/Swift/admin-dashboard push origin main
```

Wait for Netlify deploy.

- [ ] **Step 3: Verify**

1. Open admin dashboard, verify three-mode toggle appears (Swift | Prismo | Cowork)
2. Click "Cowork" — sidebar shows wine red branding, "Spaces" nav item
3. Spaces table loads with Halkin and test spaces
4. Click "Details" on Halkin — expanded row shows space info and Stripe connection
5. Toggle active/inactive on a space — updates correctly
6. Test Reset Stripe button (on a test space if available)
