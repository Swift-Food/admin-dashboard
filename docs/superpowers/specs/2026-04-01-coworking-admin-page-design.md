# Coworking Admin Page — Design Spec

## Summary

Add a third admin mode ("Coworking") to the admin dashboard alongside Swift and Prismo. The Coworking mode contains a Spaces management page where ADMIN users can list coworking spaces, view details, toggle active/inactive, and reset Stripe connections.

## Decisions

- **Mode toggle**: Three-button pill (`Swift | Prismo | Cowork`), same pattern as today's two-button toggle
- **Accent color**: Wine red `#862040`, background tint `#fbe3e8`
- **Access**: ADMIN role only. PRISMO_ADMIN and COWORKING_ADMIN cannot access this dashboard section. (COWORKING_ADMIN users manage their spaces through the Halkins frontend, not the admin dashboard.)
- **Page layout**: Table with expandable detail rows, mirroring Restaurant Management
- **Scope**: Essentials only — list, view details, reset Stripe, toggle active/inactive. No create/delete/user management/credentials on day one.

## Architecture

### 1. AdminMode Type Change

`AdminMode` union type in `Sidebar.tsx` expands from `"swift" | "prismo"` to `"swift" | "prismo" | "coworking"`.

### 2. Sidebar Changes

**Refactor color logic**: Replace the current `isSwift` boolean + ternary pattern with a `modeColors` lookup object:
```ts
const modeColors: Record<AdminMode, { primary: string; activeBg: string; border: string }> = {
  swift: { primary: "#1d4ed8", activeBg: "#dbeafe", border: "#e5e7eb" },
  prismo: { primary: "#7c3aed", activeBg: "#ede9fe", border: "#ddd6fe" },
  coworking: { primary: "#862040", activeBg: "#fbe3e8", border: "#f5c6ce" },
};
```
All existing ternaries (`isSwift ? blue : purple`) become `modeColors[adminMode].primary` etc.

**Mode toggle** (`Sidebar.tsx`):
- Expanded: Three buttons in pill. Active mode gets its colored background.
- Collapsed: Cycle through S → P → C on click. Shows initial letter in a colored circle.
- PRISMO_ADMIN users: see only Swift/Prismo toggle (same restriction as today — cannot access Coworking).

**Nav sections**: Add `coworking-management` section with `mode: "coworking"`:
- Spaces (icon: `faBuilding` — add to imports from `@fortawesome/free-solid-svg-icons`)

**Icon styles**: New `coworkingIconStyle` with `color: "#862040"`, following pattern of `prismoIconStyle`.

### 3. Routing Changes (App.tsx)

**SidebarPage union** (defined in `Sidebar.tsx`, imported by `App.tsx`): Add `"coworking-spaces"`.

**Maps** — add entries to both:
- `pathToPageMap`: `{ "spaces": "coworking-spaces" }`
- `pageToPathMap`: `{ "coworking-spaces": "spaces" }`

**Page arrays**: Add `coworkingPages: SidebarPage[] = ["home", "coworking-spaces"]`.

**Mode validation** in `PageRenderer`: Extend from `mode !== "swift" && mode !== "prismo"` to also include `"coworking"`. Block PRISMO_ADMIN from accessing coworking mode (same pattern as swift block).

**Home page rendering**: Refactor the `"home"` case from role-based to mode-based:
```ts
case "home":
  if (adminMode === "coworking") return <CoworkingSpacesScreen />;
  if (adminMode === "prismo") return <PrismoDashboard />;
  return <RestaurantAdminDashboard />;
```

**Bare path redirect**: Add `/coworking` → `/coworking/home` redirect route, matching existing `/swift` and `/prismo` redirects.

### 4. Backend: Stripe Reset Endpoint

Add to `coworking-admin.controller.ts`:

```
POST /admin/coworking/:id/reset-stripe
```

- Guarded by `@Roles(UserRole.ADMIN)`
- Controller calls `coworkingAdminService.resetStripe(id)`

**Service method** in `coworking-admin.service.ts`:
- Fetch space by ID (throw NotFoundException if missing)
- Set `stripeAccountId = null`, `stripeOnboardingComplete = false`
- Save to DB
- Return `{ success: true, message: "Stripe connection reset" }`

### 5. Frontend Types (`coworking.types.ts`)

```ts
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

### 6. Frontend Service (`coworking-admin.service.ts`)

New service file using `http` client from `services/http.ts`:
- `getSpaces()` → `GET /admin/coworking?take=100` (fetch all — small dataset, no pagination UI needed)
- `getSpace(id)` → `GET /admin/coworking/:id`
- `updateSpace(id, data)` → `PUT /admin/coworking/:id` (for `isActive` toggle)
- `resetStripe(id)` → `POST /admin/coworking/:id/reset-stripe`

### 7. Frontend Page (`CoworkingSpacesScreen`)

**File**: `src/pages/CoworkingSpacesScreen/CoworkingSpacesScreen.tsx`

**States**: Loading spinner while fetching, error card with retry on failure (matching RestaurantScreen pattern).

**Table columns**:
| Column | Content |
|--------|---------|
| Space | Name (bold) |
| Slug | Monospace slug |
| Status | Toggle: Active / Inactive (maps to `isActive: boolean`, NOT a status enum) |
| Stripe | Badge: "Connected" (blue) or "Not connected" (gray) |
| Actions | "Details" button (wine red) |

**Status toggle**: On change, calls `updateSpace(id, { isActive: !current })`. On failure, shows alert (no rollback — same pattern as RestaurantScreen).

**Expanded detail row** (shown when "Details" clicked):
- Left column: Name, Slug, Deposit Enabled
- Right column: Stripe Account ID (truncated), Onboarding status, **Reset Stripe Connection** button

**Reset Stripe button**:
- Styled as destructive: white background, red border, warning icon
- On click: reuse existing confirmation dialog pattern ("Are you sure? This will disconnect Stripe for this space.")
- On confirm: calls `resetStripe(id)`, refreshes the space list
- Helper text below: "Clears Stripe account ID so the space can reconnect fresh."
- Hidden when space has no Stripe connection (nothing to reset)

### 8. Color System

| Element | Swift | Prismo | Coworking |
|---------|-------|--------|-----------|
| Primary | `#1d4ed8` | `#7c3aed` | `#862040` |
| Active bg | `#dbeafe` | `#ede9fe` | `#fbe3e8` |
| Brand text | "Swift" | "Prismo" | "Coworking" |
| Sidebar border | `#e5e7eb` | `#ddd6fe` | `#f5c6ce` |

## Files to Create

1. `src/pages/CoworkingSpacesScreen/CoworkingSpacesScreen.tsx` — main page component
2. `src/pages/CoworkingSpacesScreen/CoworkingSpacesScreen.css` — page styles
3. `src/services/coworking-admin.service.ts` — API service
4. `src/types/coworking.types.ts` — TypeScript interfaces

## Files to Modify

1. `src/components/Sidebar.tsx` — `AdminMode` type, `SidebarPage` type, `modeColors` refactor, three-button toggle, coworking nav section, `faBuilding` import
2. `src/App.tsx` — `coworkingPages` array, both route maps, `PageRenderer` mode validation, home-page mode-based dispatch, `/coworking` bare redirect, imports
3. `backend/src/features/coworking/controllers/coworking-admin.controller.ts` — add `POST /:id/reset-stripe` endpoint
4. `backend/src/features/coworking/services/coworking-admin.service.ts` — add `resetStripe(id)` method

## Out of Scope

- Create/delete spaces (use DB directly for now)
- User/role management per space
- Credential management
- Coworking orders view
- Coworking-specific Stripe accounts page
- COWORKING_ADMIN dashboard access (they use the Halkins frontend)
