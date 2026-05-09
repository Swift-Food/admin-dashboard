# Bot-Reply Snapshot Preview — Design

**Date:** 2026-05-09
**Status:** Draft, pending review

## Problem

In the admin-dashboard ChatbotLogsScreen, `bot_reply` events show only raw JSON. Operators reviewing logs cannot easily see how a given reply *looked* to the user — what menu suggestions, restaurant picks, and intent blocks were rendered. They have to mentally reconstruct the UI from the payload.

## Goal

For each `bot_reply` event in the timeline, expose a "View preview" button that opens a modal showing a single-turn snapshot:
- The immediately preceding `user_message` (as a user bubble).
- The bot reply (as a bot bubble + rendered suggestion parts).

The modal should look like the catering-AI UI at `website/app/(public)/catering-AI`, scoped to the suggestion surface.

## Non-Goals

- Full session replay (every turn rendered in sequence).
- Interactivity (swap items, edit fields, cart mutations, feedback thumbs).
- Pixel-perfect parity with the website (~95% visual fidelity is acceptable).
- A shared package between `website` and `admin-dashboard` — components will be **copy-ported**.

## Data Source

The backend already logs the full structured response on `bot_reply` (`backend/src/features/catering-chat/catering-chat.service.ts:1189`):

```ts
this.eventLogger.logEvent(sessionId, 'bot_reply', {
  source: 'user_message',
  text: session.last_response_message,
  parts: response.parts,            // <-- MessagePart[]
  message_part_types: response.parts.map((p) => p.type),
  latency_ms: ...,
});
```

`parts` is the same `MessagePart[]` discriminated union the backend sends to the website. No backend or schema changes are required.

## Parts to Render

Only suggestion-related parts. Functional/clarifier parts are skipped.

| Part type | Render? | Component |
|---|---|---|
| `text` | yes | `TextBubble` |
| `intent_block` | yes | `IntentBlockCard` |
| `meal_session` | yes (incl. its `draft`) | `MealSessionCard` (renders nested `IntentBlockCard`s + `MenuDraftCard`) |
| `chips` | no | — |
| `summary_card` | no | — |
| `clarifier` | no | — |
| `inheritance_clarifier` | no | — |
| `feedback` | no | — |

If a `bot_reply` has no suggestion parts (text-only reply), the "View preview" button is still shown; the modal renders the text bubble pair only.

## File Layout

New code lives under `admin-dashboard/src/features/chatbot-snapshot/`:

```
features/chatbot-snapshot/
  types.ts                    # copied MessagePart + minimal transitive types
  SnapshotModal.tsx           # modal shell, close button, layout
  SnapshotMessage.tsx         # renders a single message bubble; switches on part.type
  parts/
    TextBubble.tsx            # ported from website, read-only
    IntentBlockCard.tsx       # ported, read-only (no swap/edit handlers)
    MealSessionCard.tsx       # ported, read-only (renders MenuDraftCard inline)
    MenuDraftCard.tsx         # ported, read-only
```

Ported components have all callbacks (`onSwap`, `onEdit`, `onPickMealSession`, etc.), local state, navigation, and cart mutation logic stripped. They are pure render-from-props.

## Type Sharing

Copy `backend/src/features/catering-chat/types/message-part.types.ts` and its minimal transitive types (`Intent`, `MenuDraft`, `RestaurantPick`, `IntentBlockItem`, `GroupSection`, etc.) into `admin-dashboard/src/features/chatbot-snapshot/types.ts`.

- Inline-flatten dependencies; drop unused branches and unused type imports.
- Drift risk is acknowledged. Mitigation: admin-dashboard only consumes a read-only subset; the log payload is the source of truth and any backend change that breaks rendering will be visible immediately on real logs. If the part shapes evolve significantly in future, revisit by extracting a shared package.

## UI Integration

In `admin-dashboard/src/pages/ChatbotLogsScreen/index.tsx`:

1. The parent that maps `timeline.map((entry) => <EventCard …>)` computes, for each `bot_reply` event, the most recent prior `user_message` event in the timeline. It passes the user message's text (or `null`) as a new `previousUserMessage` prop to `EventCard`.
2. `EventCard` adds a new branch: when `entry.data.eventType === 'bot_reply'`, render the existing payload JSON block plus a "View preview" button.
3. Clicking the button opens `SnapshotModal` with:
   ```ts
   {
     userText: string | null,
     botText: string,                  // from payload.text
     botParts: MessagePart[],          // from payload.parts, filtered to renderable types
   }
   ```
4. `SnapshotModal` renders, top to bottom:
   - User bubble (if `userText` not null).
   - Bot bubble for `botText`.
   - For each renderable part in `botParts`, the matching component.

## Styling

- Tailwind classes are ported as-is from the website.
- Font and color tokens unique to the website are replaced inline with their plain Tailwind equivalents (e.g. concrete color names) — no admin-dashboard `tailwind.config.ts` changes.
- No iframe / shadow-root isolation. The modal is scoped enough that style bleed is not a concern.

## Testing

Manual verification only:
- Load a session in ChatbotLogsScreen with at least one `bot_reply` containing an `intent_block`.
- Open the preview; confirm user message + bot reply + suggestion parts render.
- Open a preview for a text-only `bot_reply`; confirm bubbles render and no error.
- Open a preview for a `bot_reply` whose previous event is *not* a `user_message` (e.g. a system event); confirm the user bubble is omitted gracefully.

## Risks

- **Type drift** between admin-dashboard's copy and the backend canonical types. Acceptable for v1; revisit if drift causes real bugs.
- **Visual divergence** from the live website as `CateringAIClient` evolves. Acceptable; this is a debug/operator tool, not a production surface.
- **Style bleed** from admin-dashboard's global CSS into ported components. Mitigated by the fact that ported components use only utility classes.
