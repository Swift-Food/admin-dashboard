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

export interface IntentBlockPart {
  type: 'intent_block';
  intentId: string;
  mealSessionIndex: number;
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

export interface MealSessionPart {
  type: 'meal_session';
  mealSessionIndex: number;
  sessionName: string;
  sessionDate: string | null;
  eventTime: string | null;
  guestCount: number | null;
  intentBlocks: IntentBlockPart[];
  draft: MenuDraft | null;
}

export interface TextPart {
  type: 'text';
  text: string;
}

/** Minimal union — we only render text + suggestion parts in snapshots. */
export type RenderableMessagePart = TextPart | IntentBlockPart | MealSessionPart;

/**
 * Type guard for filtering raw bot_reply.parts (loosely typed as `any`)
 * down to the parts we actually render.
 */
export function isRenderablePart(p: unknown): p is RenderableMessagePart {
  if (!p || typeof p !== 'object') return false;
  const type = (p as { type?: unknown }).type;
  return type === 'text' || type === 'intent_block' || type === 'meal_session';
}
