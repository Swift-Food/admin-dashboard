# Partner Spaces Admin UI — Design Spec
Date: 2026-04-20

## Overview

Build an admin UI for managing Partner Spaces — venues (hotels, conference centers) that embed Swift Food's catering widget. Admins can create spaces, edit their details, toggle active status, view publishable keys, and rotate keys.

## API

Base URL: `/admin/partner-spaces`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/admin/partner-spaces` | List all spaces |
| POST | `/admin/partner-spaces` | Create a space |
| PATCH | `/admin/partner-spaces/:id` | Update fields |
| POST | `/admin/partner-spaces/:id/rotate-key` | Regenerate publishable key |

### Create body
```ts
{
  name: string          // required
  slug: string          // required, unique
  contactEmail: string  // required, valid email
  webhookUrl?: string   // optional, must be https://, valid TLD
}
```

### Update body (PATCH)
All create fields are optional, plus:
```ts
{
  isActive?: boolean
}
```

### Space object
```ts
{
  id: string
  name: string
  slug: string
  publishableKey: string  // "pk_" + 40 hex chars
  isActive: boolean
  contactEmail: string
  webhookUrl: string | null
  createdAt: string
  updatedAt: string
}
```

## Architecture

### New files
- `src/pages/PartnerSpacesScreen/PartnerSpacesScreen.tsx`
- `src/pages/PartnerSpacesScreen/PartnerSpacesScreen.css`
- `src/services/partner-spaces.service.ts`
- `src/types/partner-spaces.types.ts`

### Modified files
- `src/components/Sidebar.tsx` — add `"partner-spaces"` to `SidebarPage` type and swift sidebar section
- `src/App.tsx` — add path/page mapping, import, and render case

### Approach
Single-file screen (Option A), consistent with BundlesScreen. All state managed locally in `PartnerSpacesScreen`. The service wraps 4 API calls (`getAll`, `create`, `update`, `rotateKey`) using the existing `http` axios instance.

## Component & State Design

### State shape
```ts
spaces: PartnerSpace[]
loading: boolean
error: string | null
showCreateModal: boolean
showDetailModal: boolean
selectedSpace: PartnerSpace | null
submitting: boolean
showRotateConfirm: boolean
rotating: boolean
fieldErrors: Record<string, string>
```

### List view
- Full-width table with columns: Name, Slug, Contact Email, Status, Created At
- Status column: green "Active" badge / red "Inactive" badge
- Inactive rows: `opacity: 0.5` + `text-decoration: line-through` on name cell
- "Add Partner Space" button top-right opens create modal
- Clicking any row opens detail/edit modal for that space

### Create modal
- Form fields: Name, Slug, Contact Email, Webhook URL
- Slug auto-suggest: as user types name, if slug field is empty, auto-populate with `name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')`
- On submit: call `POST /admin/partner-spaces`, close modal, re-fetch list
- API errors surface inline (see Error Handling section)

### Detail/Edit modal
- All fields editable: Name, Slug, Contact Email, Webhook URL, isActive toggle
- Publishable key shown in monospace read-only box with copy button
- Copy button uses `navigator.clipboard.writeText()`, label flips to "Copied!" for 2s then reverts
- Save button calls `PATCH`, updates space in list in-place and updates `selectedSpace`
- Rotate Key button triggers inline confirmation within the modal

### Rotate Key confirmation
- Inline warning box (not `window.confirm()`): *"This will invalidate the current key. All widgets using it will stop working."*
- Cancel and Confirm buttons
- On confirm: call `POST /:id/rotate-key`, update `selectedSpace` with returned space (new key visible immediately), update space in list

## Error Handling

### API field errors (400 / 409)
- Backend returns `message` (string or string[])
- Match keywords to field: `slug` → slug field, `email` → contactEmail field, `webhook` → webhookUrl field
- Show inline below relevant input in red
- Unmatched errors show as a general error banner at top of modal

### Loading / error states
- Initial fetch: full-screen spinner and error card (matching CoworkingSpacesScreen pattern)
- Retry button on error state

### Data sync strategy
- Create: always re-fetch list after success
- Rotate key: update `selectedSpace` in state + update matching space in `spaces` array (no re-fetch)
- Edit/PATCH: update `spaces` array in-place + update `selectedSpace` (no re-fetch)

## Wiring into App

### Sidebar
- Add `"partner-spaces"` to the `SidebarPage` union type
- Add entry under the Swift sidebar section with a suitable icon (e.g. `faHandshake` from FontAwesome or `Building2` from lucide-react)

### App.tsx routing
- Add `"partner-spaces": "partner-spaces"` to `pathToPageMap`
- Add `"partner-spaces": "partner-spaces"` to `pageToPathMap`
- Add `"partner-spaces"` to `swiftPages` array
- Add render case: `case "partner-spaces": return <PartnerSpacesScreen />;`

## UX Notes
- Inactive spaces are visually muted (opacity + strikethrough name) in the list
- Slug auto-suggests only when slug field is empty — does not overwrite user edits
- publishableKey is always readable in the detail modal (not a one-time reveal)
- The rotate key warning is prominent and inline — no browser `confirm()` dialogs
