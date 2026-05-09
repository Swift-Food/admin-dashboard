import { useState } from 'react';
import { JsonModal } from '../../components/JsonModal';
import type { TurnEntry } from './FullSessionModal';

interface TurnInspectButtonsProps {
  turnEntries: TurnEntry[];
}

const KIND_STYLES: Record<TurnEntry['kind'], string> = {
  event:
    'text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded px-2 py-1 hover:bg-gray-100 transition-colors',
  llm_call:
    'text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-2 py-1 hover:bg-indigo-100 transition-colors',
  retrieval:
    'text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 hover:bg-amber-100 transition-colors',
};

/**
 * One pill per inter-turn timeline entry, in chronological order.
 * Clicking a pill opens its full payload in a JsonModal layered above
 * the snapshot. When the turn has no entries, the bar is hidden.
 */
export function TurnInspectButtons({ turnEntries }: TurnInspectButtonsProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  if (turnEntries.length === 0) return null;

  const openEntry = openIdx !== null ? turnEntries[openIdx] : null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        padding: '8px 4px',
        marginBottom: 12,
        borderBottom: '1px dashed var(--rule)',
      }}
    >
      <span className="small-caps" style={{ alignSelf: 'center', marginRight: 4 }}>
        Turn events:
      </span>
      {turnEntries.map((entry, i) => (
        <button
          key={i}
          type="button"
          onClick={() => setOpenIdx(i)}
          className={KIND_STYLES[entry.kind]}
          title={entry.kind}
        >
          {entry.label}
        </button>
      ))}

      {openEntry && (
        <JsonModal
          title={`${openEntry.kind} — ${openEntry.label}`}
          value={openEntry.value}
          onClose={() => setOpenIdx(null)}
        />
      )}
    </div>
  );
}
