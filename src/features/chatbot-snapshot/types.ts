/**
 * Read-only copies of the backend's MessagePart types, flattened to the
 * minimum needed to render bot_reply snapshots in the chatbot-logs UI.
 *
 * Source of truth: backend/src/features/catering-chat/types/message-part.types.ts
 * Drift is acceptable for v1 — the log payload is the authoritative shape we
 * actually render against.
 */

export type MealCategory = 'main' | 'snack' | 'drink' | 'dessert';

export interface IntentLite {
  intentId: string;
  phrase: string;
  category: MealCategory | null;
  count: number | null;
  restaurantScope: string[] | null;
  excludes: string[] | null;
  /** Pack-count of a single dish. Present in the post-consolidation backend Intent. */
  quantity?: number | null;
  /** Number of different items to pick within this intent. Present in the post-consolidation backend Intent. */
  variety?: number | null;
}

export interface IntentBlockItem {
  id: string;
  name: string;
  price: number;
  groupTitle: string | null;
  displayOrder: number;
  mealCategory: MealCategory;
  description: string | null;
  imageUrl: string | null;
  reason: string | null;
  allergens: string[];
  dietaryFilters: string[];
  feedsPerUnit: number;
  cateringQuantityUnit: number;
}

export interface GroupSection {
  title: string | null;
  order: number;
  itemIndexes: number[];
}

export interface RestaurantPick {
  restaurant: {
    id: string;
    name: string;
    cuisineTags: string[];
    imageUrl: string | null;
    rating: number;
    minQuantity: number;
  };
  items: IntentBlockItem[];
  groupSections: GroupSection[];
  candidateCount: number;
  pickedReason: string | null;
}

/**
 * One picker row inside a meal session: top-ranked restaurants for a
 * single Intent. Post-consolidation the backend ships this inline on
 * `ChatMealSessionView.intentBlocks[]`, with no `type` discriminator and
 * no `mealSessionIndex` (positional within its meal).
 *
 * Source of truth: backend/src/features/catering-chat/types/message-part.types.ts
 * (`IntentBlock`).
 */
export interface IntentBlockView {
  intentId: string;
  intent: IntentLite;
  restaurantPicks: RestaurantPick[];
}

export interface RestaurantSummary {
  id: string;
  name: string;
  imageUrl: string | null;
  cuisine: string;
  cuisineTags?: string[];
}

export interface RestaurantSubtotal {
  restaurantId: string;
  restaurantName: string;
  itemCount: number;
  subtotal: number;
  meetsMinOrder: boolean;
  minOrderShortfall?: {
    missingItems: number;
    missingValue: number;
  };
}

export interface DraftItem {
  id: string;
  menuItemId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  groupTitle: string | null;
  mealCategory: string;
  allergens: string[];
  dietaryFilters: string[];
  unitPrice: number;
  feedsPerUnit: number;
  cateringQuantityUnit: number;
  quantity: number;
  totalPrice: number;
  reason: string;
  restaurantId: string;
  intentPhrase: string;
}

export interface DraftPricing {
  subtotal: number;
  pricePerPerson: number;
  budgetRemaining: number;
  promotionDiscount?: number;
  total?: number;
}

export interface RestaurantCandidate {
  restaurant: RestaurantSummary;
  estimatedPricePerPerson: number;
  pickedReason: string;
}

export interface MenuDraft {
  id: string;
  restaurants: RestaurantSummary[];
  restaurantSubtotals: RestaurantSubtotal[];
  items: DraftItem[];
  pricing: DraftPricing;
  feedsPeople: number;
  pickedReason: string;
  alternatives: RestaurantCandidate[];
  retrievalEventId?: string;
}

/**
 * Read-only copy of backend `ChatMealSessionView`. Post-consolidation
 * the chat response ships meal sessions as a top-level
 * `response.mealSessions: MealSessionView[]` field — they no longer
 * travel through `MessagePart[]`.
 *
 * Source of truth:
 * backend/src/features/catering-chat/services/datetime-format.helper.ts
 * (`ChatMealSessionView`).
 */
export interface MealSessionView {
  /** Stable meal-session identity (UUID). */
  id: string;
  sessionName: string;
  /** Friendly display form (e.g. "Friday 28 May"). Empty string when unset. */
  sessionDate: string;
  /** Friendly display form (e.g. "12:30 PM"). Empty string when unset. */
  eventTime: string;
  guestCount: number | null;
  mealTime: string | null;
  intentBlocks: IntentBlockView[];
  draft: MenuDraft | null;
}

export interface TextPart {
  type: 'text';
  text: string;
}

// ── Exploration-mode menu preview (no headcount) ───────────────────────

export interface PreviewItem {
  menuItemId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  groupTitle: string | null;
  mealCategory: MealCategory;
  allergens: string[];
  dietaryFilters: string[];
  unitPrice: number;
  feedsPerUnit: number;
  restaurant: RestaurantSummary;
  matchReason: string;
}

export interface PreviewSection {
  intent: string;
  items: PreviewItem[];
}

export interface MenuPreview {
  sections: PreviewSection[];
}

export interface MenuPreviewPart {
  type: 'menu_preview';
  preview: MenuPreview;
}

/**
 * Minimal union — we only render text + browse-mode menu previews from
 * `MessagePart[]`. Meal sessions (and their nested intent blocks) now
 * arrive on `response.mealSessions`, not in `parts`.
 */
export type RenderableMessagePart = TextPart | MenuPreviewPart;

/**
 * Type guard for filtering raw bot_reply.parts (loosely typed as `any`)
 * down to the parts we actually render.
 */
export function isRenderablePart(p: unknown): p is RenderableMessagePart {
  if (!p || typeof p !== 'object') return false;
  const type = (p as { type?: unknown }).type;
  return type === 'text' || type === 'menu_preview';
}

/**
 * Type guard for the top-level `response.mealSessions` field. Verifies
 * the minimum shape we need to render (intentBlocks array present).
 */
export function isMealSessionView(p: unknown): p is MealSessionView {
  if (!p || typeof p !== 'object') return false;
  const r = p as Record<string, unknown>;
  return (
    typeof r.sessionName === 'string' &&
    Array.isArray(r.intentBlocks)
  );
}
