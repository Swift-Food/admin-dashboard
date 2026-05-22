import { useState } from 'react';
import { IntentBlockCard } from './IntentBlockCard';
import type { MealSessionView } from '../types';

interface MealSessionCardProps {
  part: MealSessionView;
  /** Suppress the meal name + date/time/headcount header. Used when the
   *  containing surface (e.g. FullSessionModal's meal tabs) already
   *  displays those details. */
  hideHeader?: boolean;
}

/**
 * Read-only meal-session view: header + a horizontal tab strip of
 * intent pills, with the selected intent's block rendered below.
 */
export function MealSessionCard({ part, hideHeader = false }: MealSessionCardProps) {
  const blocks = part.intentBlocks;
  const [activeIdx, setActiveIdx] = useState(0);

  if (blocks.length === 0) return null;

  const safeIdx = Math.min(activeIdx, blocks.length - 1);
  const active = blocks[safeIdx];

  return (
    <div style={{ marginTop: 16, marginBottom: 16 }}>
      {!hideHeader && (
        <header style={{ marginBottom: 8, padding: '0 4px' }}>
          <div className="display" style={{ fontSize: '1.1rem', color: 'var(--ink)' }}>
            {part.sessionName}
          </div>
          {(part.sessionDate || part.guestCount !== null) && (
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--ink-faint)',
                marginTop: 2,
              }}
            >
              {part.sessionDate}
              {part.eventTime && ` · ${part.eventTime}`}
              {part.guestCount !== null && ` · ${part.guestCount} guests`}
            </div>
          )}
        </header>
      )}

      {blocks.length > 1 && (
        <IntentTabs
          blocks={blocks}
          activeIdx={safeIdx}
          onSelect={setActiveIdx}
        />
      )}

      {active && <IntentBlockCard key={active.intentId} part={active} />}
    </div>
  );
}

function IntentTabs({
  blocks,
  activeIdx,
  onSelect,
}: {
  blocks: MealSessionView['intentBlocks'];
  activeIdx: number;
  onSelect: (idx: number) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        padding: '0 4px',
        marginBottom: 12,
      }}
    >
      {blocks.map((block, idx) => {
        const isActive = idx === activeIdx;
        return (
          <button
            key={block.intentId}
            type="button"
            onClick={() => onSelect(idx)}
            style={{
              fontSize: '0.78rem',
              fontWeight: isActive ? 600 : 500,
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid',
              borderColor: isActive ? 'var(--ink)' : 'var(--rule)',
              backgroundColor: isActive ? 'var(--ink)' : 'var(--paper)',
              color: isActive ? 'var(--paper)' : 'var(--ink)',
              cursor: 'pointer',
              textTransform: 'capitalize',
              whiteSpace: 'nowrap',
            }}
          >
            {block.intent.phrase}
            {block.intent.category && (
              <span
                style={{
                  marginLeft: 6,
                  fontSize: '0.65rem',
                  opacity: 0.7,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {block.intent.category}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
