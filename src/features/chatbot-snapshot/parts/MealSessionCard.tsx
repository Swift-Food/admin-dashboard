import { IntentBlockCard } from './IntentBlockCard';
import { MenuDraftCard } from './MenuDraftCard';
import type { MealSessionPart } from '../types';

interface MealSessionCardProps {
  part: MealSessionPart;
}

/**
 * Read-only port of the website's MealSessionStepper, simplified: always
 * shows all intent blocks (no step mode), no cohesion across blocks (each
 * IntentBlockCard owns its own restaurant selection), and renders the
 * draft cart inline below the intent blocks when present.
 */
export function MealSessionCard({ part }: MealSessionCardProps) {
  const blocks = part.intentBlocks;

  return (
    <div style={{ marginTop: 16, marginBottom: 16 }}>
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

      {blocks.map((block) => (
        <IntentBlockCard key={block.intentId} part={block} />
      ))}

      {part.draft && (
        <div style={{ marginTop: 12 }}>
          <MenuDraftCard draft={part.draft} />
        </div>
      )}
    </div>
  );
}
