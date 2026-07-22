import { DraftItemRow } from './DraftItemRow';
import { Reason } from './Reason';
import type {
  MenuDraft,
  DraftItem,
  MealCategory,
  RestaurantSummary,
  RestaurantSubtotal,
} from '../types';

interface MenuDraftCardProps {
  draft: MenuDraft;
}

const CATEGORY_LABELS: Record<MealCategory, string> = {
  main: 'Mains',
  snack: 'Sides',
  drink: 'Drinks',
  dessert: 'Desserts',
};

const CATEGORY_ORDER: MealCategory[] = ['main', 'snack', 'drink', 'dessert'];

function ItemsByCategory({
  items,
  restaurantName,
}: {
  items: DraftItem[];
  restaurantName?: string;
}) {
  const grouped: Record<MealCategory, DraftItem[]> = {
    main: [],
    snack: [],
    drink: [],
    dessert: [],
  };
  for (const item of items) {
    const cat = item.mealCategory as MealCategory;
    if (grouped[cat]) grouped[cat].push(item);
  }

  return (
    <>
      {CATEGORY_ORDER.map((cat) => {
        const catItems = grouped[cat];
        if (catItems.length === 0) return null;
        return (
          <div key={cat} style={{ paddingTop: 14, paddingBottom: 4 }}>
            <div className="small-caps" style={{ marginBottom: 4 }}>
              {CATEGORY_LABELS[cat]}
            </div>
            <ul style={{ margin: 0, padding: 0 }}>
              {catItems.map((item) => (
                <DraftItemRow key={item.id} item={item} restaurantName={restaurantName} />
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}

export function MenuDraftCard({ draft }: MenuDraftCardProps) {
  const isMultiRestaurant = draft.restaurants.length > 1;

  if (isMultiRestaurant) {
    const byRestaurant = draft.restaurants.map((r) => ({
      restaurant: r,
      subtotal: draft.restaurantSubtotals.find((s) => s.restaurantId === r.id) ?? {
        restaurantId: r.id,
        restaurantName: r.name,
        itemCount: 0,
        subtotal: 0,
        meetsMinOrder: true,
      },
      items: draft.items.filter((i) => i.restaurantId === r.id),
    }));

    return (
      <div
        style={{
          background: 'var(--paper)',
          border: '1px solid var(--rule)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
        }}
      >
        <PricingBlock draft={draft} />
        {byRestaurant.map((group) => (
          <div key={group.restaurant.id} style={{ borderTop: '1px solid var(--rule)' }}>
            <RestaurantGroupHeader
              restaurant={group.restaurant}
              subtotal={group.subtotal}
            />
            <div style={{ padding: '0 16px' }}>
              <ItemsByCategory
                items={group.items}
                restaurantName={group.restaurant.name}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--paper)',
        border: '1px solid var(--rule)',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
      }}
    >
      <RestaurantHeader draft={draft} />
      <PricingBlock draft={draft} />
      <div style={{ padding: '0 16px' }}>
        <ItemsByCategory items={draft.items} />
      </div>
    </div>
  );
}

function RestaurantHeader({ draft }: { draft: MenuDraft }) {
  const r = draft.restaurants[0];
  if (!r) return null;
  const photo = r.imageUrl;
  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        padding: '16px',
        borderBottom: '1px solid var(--rule)',
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 12,
          background: photo ? `url(${photo}) center/cover` : 'var(--paper-deep)',
          flexShrink: 0,
          border: '1px solid var(--rule)',
        }}
        aria-hidden="true"
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="display"
          style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--ink)' }}
        >
          {r.name}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', marginTop: 2 }}>
          {[r.cuisine, `feeds ${draft.feedsPeople}`].filter(Boolean).join(' · ')}
        </div>
        {draft.pickedReason ? <div style={{ marginTop: 4 }}>
            <Reason>{draft.pickedReason}</Reason>
          </div> : null}
      </div>
    </div>
  );
}

function RestaurantGroupHeader({
  restaurant,
  subtotal,
}: {
  restaurant: RestaurantSummary;
  subtotal: RestaurantSubtotal;
}) {
  const photo = restaurant.imageUrl;
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 16px',
        background: 'var(--paper-deep)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {photo ? <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: `url(${photo}) center/cover`,
              flexShrink: 0,
              border: '1px solid var(--rule)',
            }}
            aria-hidden="true"
          /> : null}
        <span
          className="display"
          style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink)' }}
        >
          {restaurant.name}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--rule)',
            borderRadius: 20,
            padding: '2px 8px',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--ink)',
          }}
        >
          £{subtotal.subtotal.toFixed(2)}
        </span>
        {!subtotal.meetsMinOrder && subtotal.minOrderShortfall ? <span style={{ fontSize: '0.72rem', color: 'var(--ink-soft)' }}>
            Add {subtotal.minOrderShortfall.missingItems} more item(s)
          </span> : null}
      </div>
    </div>
  );
}

function PricingBlock({ draft }: { draft: MenuDraft }) {
  return (
    <div
      style={{
        padding: '12px 16px',
        background: 'var(--paper-deep)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        borderBottom: '1px solid var(--rule)',
      }}
    >
      <div>
        <div
          className="display"
          style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--ink)' }}
        >
          £{draft.pricing.subtotal.toFixed(2)}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--ink-faint)' }}>
          £{draft.pricing.pricePerPerson.toFixed(2)}/person
        </div>
      </div>
      {draft.pricing.budgetRemaining > 0 && (
        <div style={{ textAlign: 'right' }}>
          <div className="small-caps">Remaining</div>
          <div className="display" style={{ color: 'var(--olive)', fontWeight: 600 }}>
            £{draft.pricing.budgetRemaining.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
}
