import { Reason } from './Reason';
import type { DraftItem } from '../types';

interface DraftItemRowProps {
  item: DraftItem;
  restaurantName?: string;
}

const PLACEHOLDER_BG =
  'linear-gradient(135deg, var(--paper-deep) 0%, var(--rule) 100%)';

/**
 * Read-only port of the website's DraftItemRow. No swap/remove/qty controls
 * — we only render what the bot_reply event captured.
 */
export function DraftItemRow({ item, restaurantName }: DraftItemRowProps) {
  const dietary = (item.dietaryFilters ?? []).filter(Boolean);
  const allergens = (item.allergens ?? []).filter(
    (a) => a && a.toLowerCase() !== 'no specific allergens',
  );

  return (
    <li
      style={{
        display: 'flex',
        gap: '12px',
        padding: '12px 0',
        borderBottom: '1px solid var(--rule)',
        listStyle: 'none',
      }}
    >
      <ItemPhoto src={item.imageUrl} fallback={item.name} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="display"
          style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--ink)' }}
        >
          {item.name}
        </div>
        {restaurantName && (
          <span className="item-restaurant-badge">from {restaurantName}</span>
        )}
        {item.description && (
          <div
            style={{
              fontSize: '0.78rem',
              color: 'var(--ink-soft)',
              lineHeight: 1.4,
              marginTop: 4,
            }}
          >
            {item.description}
          </div>
        )}
        {item.reason && (
          <div style={{ marginTop: 4 }}>
            <Reason>{item.reason}</Reason>
          </div>
        )}
        {(dietary.length > 0 || allergens.length > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
            {dietary.map((d) => (
              <span key={`d-${d}`} className="dietary-pill">
                {d.replace(/_/g, ' ')}
              </span>
            ))}
            {allergens.slice(0, 3).map((a) => (
              <span key={`a-${a}`} className="allergen-pill">
                {a.toLowerCase()}
              </span>
            ))}
            {allergens.length > 3 && (
              <span className="allergen-pill">+{allergens.length - 3}</span>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          textAlign: 'right',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          flexShrink: 0,
          gap: 6,
        }}
      >
        <div
          className="display"
          style={{
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--ink)',
            fontSize: '0.95rem',
            fontWeight: 600,
          }}
        >
          £{item.totalPrice.toFixed(2)}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--ink-faint)' }}>
          £{item.unitPrice.toFixed(2)} ea · feeds {item.feedsPerUnit}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
          ×{item.quantity}
        </div>
      </div>
    </li>
  );
}

function ItemPhoto({ src, fallback }: { src: string | null; fallback: string }) {
  const initial = (fallback ?? '?').trim()[0]?.toUpperCase() ?? '?';
  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 10,
        background: src ? `url(${src}) center/cover` : PLACEHOLDER_BG,
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid var(--rule)',
      }}
      aria-hidden="true"
    >
      {!src && (
        <span
          className="display-italic"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.6rem',
            color: 'var(--ink-faint)',
          }}
        >
          {initial}
        </span>
      )}
    </div>
  );
}
