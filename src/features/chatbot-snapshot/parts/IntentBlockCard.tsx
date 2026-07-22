import { useState } from 'react';
import type {
  RestaurantPick,
  GroupSection,
  IntentBlockItem,
  IntentBlockView,
} from '../types';

interface IntentBlockCardProps {
  part: IntentBlockView;
}

/**
 * Read-only port of the website's IntentBlockCard. Lets the operator
 * preview alternative-restaurant chips locally (state is owned here),
 * but no swap/add/edit handlers — this is purely for log inspection.
 */
export function IntentBlockCard({ part }: IntentBlockCardProps) {
  const defaultId = part.restaurantPicks[0]?.restaurant.id ?? '';
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(defaultId);

  const selectedIdx = Math.max(
    0,
    part.restaurantPicks.findIndex((rp) => rp.restaurant.id === selectedRestaurantId),
  );
  const selected: RestaurantPick | undefined =
    part.restaurantPicks[selectedIdx] ?? part.restaurantPicks[0];
  if (!selected) return null;
  const alts = part.restaurantPicks.filter(
    (rp) => rp.restaurant.id !== selected.restaurant.id,
  );

  return (
    <div
      style={{
        backgroundColor: 'var(--paper)',
        border: '1px solid var(--rule)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <h3
          className="display"
          style={{
            margin: 0,
            fontSize: '1.25rem',
            color: 'var(--ink)',
            textTransform: 'capitalize',
          }}
        >
          {part.intent.phrase}
        </h3>
        {part.intent.category ? <span className="small-caps">{part.intent.category}</span> : null}
      </div>

      {/* Picked-restaurant strip */}
      <div
        style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginBottom: 14 }}
      >
        From{' '}
        <span style={{ color: 'var(--ink)', fontWeight: 600 }}>
          {selected.restaurant.name}
        </span>
        {selected.restaurant.cuisineTags.length > 0 && (
          <span style={{ color: 'var(--ink-faint)' }}>
            {' · '}
            {selected.restaurant.cuisineTags.slice(0, 3).join(' · ')}
          </span>
        )}
        {selected.pickedReason ? <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--ink-faint)',
              marginTop: 2,
              fontStyle: 'italic',
            }}
          >
            {selected.pickedReason}
          </div> : null}
      </div>

      {/* Group sections */}
      {selected.groupSections.map((section) => (
        <SectionBlock
          key={`${part.intentId}-${selected.restaurant.id}-${section.title ?? '_null'}`}
          section={section}
          items={selected.items}
        />
      ))}

      {/* Alternative restaurants */}
      {alts.length >= 1 && (
        <AltRestaurantChips
          alts={alts}
          intentPhrase={part.intent.phrase}
          onSelect={setSelectedRestaurantId}
        />
      )}
    </div>
  );
}

function SectionBlock({
  section,
  items,
}: {
  section: GroupSection;
  items: IntentBlockItem[];
}) {
  return (
    <section style={{ marginBottom: 14 }}>
      {section.title ? <div className="small-caps" style={{ marginBottom: 6 }}>
          {section.title}
        </div> : null}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {section.itemIndexes.map((idx) => {
          const item = items[idx];
          if (!item) return null;
          return (
            <li
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                backgroundColor: 'var(--paper-deep)',
                border: '1px solid var(--rule)',
                borderRadius: 8,
                marginBottom: 6,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    color: 'var(--ink)',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.name}
                </div>
                {item.description ? <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--ink-faint)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.description}
                  </div> : null}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexShrink: 0,
                  marginLeft: 12,
                }}
              >
                <span
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '0.85rem',
                  }}
                >
                  £{item.price.toFixed(2)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function AltRestaurantChips({
  alts,
  intentPhrase,
  onSelect,
}: {
  alts: RestaurantPick[];
  intentPhrase: string;
  onSelect: (restaurantId: string) => void;
}) {
  return (
    <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 10, marginTop: 4 }}>
      <div className="small-caps" style={{ marginBottom: 6 }}>
        Other options for {intentPhrase}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {alts.map((rp) => (
          <button
            key={rp.restaurant.id}
            type="button"
            onClick={() => onSelect(rp.restaurant.id)}
            style={{
              fontSize: '0.75rem',
              padding: '5px 12px',
              borderRadius: 999,
              border: '1px solid var(--rule)',
              backgroundColor: 'var(--paper)',
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            {rp.restaurant.name}
            <span style={{ marginLeft: 4, color: 'var(--ink-faint)' }}>
              · {rp.candidateCount}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
