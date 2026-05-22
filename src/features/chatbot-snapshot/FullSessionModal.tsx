import { useEffect, useMemo, useState } from 'react';
import { TextBubble } from './parts/TextBubble';
import { MealSessionCard } from './parts/MealSessionCard';
import { MenuPreviewCard } from './parts/MenuPreviewCard';
import { TurnInspectButtons } from './TurnInspectButtons';
import { isRenderablePart, type RenderableMessagePart, type MealSessionView } from './types';
import './snapshot.css';

/**
 * One inter-turn timeline entry: an llm_call, retrieval, or side event
 * that fired between the previous bot_reply and the current one. Each
 * gets its own pill in the inspect bar; clicking opens a JsonModal.
 */
export interface TurnEntry {
  kind: 'event' | 'llm_call' | 'retrieval';
  /** Short label rendered on the pill, e.g. "intent_extracted" or "intent_extractor (gemini-2.5-flash)". */
  label: string;
  /** Full payload for the JsonModal. */
  value: unknown;
}

export interface SessionTurn {
  userText: string | null;
  botText: string;
  rawBotParts: unknown;
  /**
   * Top-level `response.mealSessions` snapshot at the moment of this
   * bot_reply. Post-consolidation the backend ships meal sessions here
   * rather than inside `parts`.
   */
  mealSessions: MealSessionView[];
  /**
   * Every timeline entry between the prior bot_reply and this one
   * (excluding user_message + the bot_reply itself), in chronological
   * order. Each entry becomes a pill in the inspect bar.
   */
  turnEntries: TurnEntry[];
}

interface FullSessionModalProps {
  turns: SessionTurn[];
  onClose: () => void;
}

interface NormalisedTurn {
  index: number;
  userText: string | null;
  textParts: string[];
  structuredParts: RenderableMessagePart[];
  mealSessions: MealSessionView[];
  hasSuggestions: boolean;
  turnEntries: TurnEntry[];
}

export function FullSessionModal({ turns, onClose }: FullSessionModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const normalised: NormalisedTurn[] = useMemo(
    () =>
      turns.map((turn, index) => {
        const parts: RenderableMessagePart[] = Array.isArray(turn.rawBotParts)
          ? turn.rawBotParts.filter(isRenderablePart)
          : [];
        const textParts = parts.filter((p) => p.type === 'text').map((p) => p.text);
        const structuredParts = parts.filter((p) => p.type !== 'text');
        // Fallback to bot_reply.text when there are no parts at all.
        const fallbackText = parts.length === 0 && turn.botText ? [turn.botText] : [];
        return {
          index,
          userText: turn.userText,
          textParts: textParts.length > 0 ? textParts : fallbackText,
          structuredParts,
          mealSessions: turn.mealSessions,
          hasSuggestions:
            structuredParts.length > 0 || turn.mealSessions.length > 0,
          turnEntries: turn.turnEntries,
        };
      }),
    [turns],
  );

  // Default to the most recent turn that has suggestion parts, or the
  // last turn if none do.
  const initialSelected = useMemo(() => {
    for (let i = normalised.length - 1; i >= 0; i--) {
      if (normalised[i].hasSuggestions) return i;
    }
    return normalised.length - 1;
  }, [normalised]);

  const [selectedIdx, setSelectedIdx] = useState<number>(initialSelected);
  const safeSelected = Math.min(Math.max(0, selectedIdx), normalised.length - 1);
  const selectedTurn = normalised[safeSelected];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 12,
          width: 'min(1200px, 95vw)',
          height: 'min(900px, 90vh)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb',
            flexShrink: 0,
          }}
        >
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#1f2937' }}>
            Full conversation preview ({turns.length} {turns.length === 1 ? 'reply' : 'replies'})
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            style={{
              border: 0,
              background: 'transparent',
              fontSize: '1.5rem',
              lineHeight: 1,
              cursor: 'pointer',
              color: '#6b7280',
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {turns.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
            }}
          >
            No bot replies in this session.
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            {/* Left: suggestions for selected turn */}
            <div
              className="snapshot-design"
              style={{
                flex: '2 1 0',
                minWidth: 0,
                borderRight: '1px solid var(--rule)',
                overflow: 'auto',
                padding: 20,
              }}
            >
              <SuggestionsPane turn={selectedTurn} />
            </div>

            {/* Right: chat thread of clickable turns */}
            <div
              className="snapshot-design"
              style={{
                flex: '1 1 0',
                minWidth: 320,
                overflow: 'auto',
                padding: 20,
                background: 'var(--paper)',
              }}
            >
              {normalised.map((turn) => (
                <TurnRow
                  key={turn.index}
                  turn={turn}
                  isSelected={turn.index === safeSelected}
                  onSelect={() => setSelectedIdx(turn.index)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SuggestionsPane({ turn }: { turn: NormalisedTurn | undefined }) {
  if (!turn) return null;
  return (
    <>
      <TurnInspectButtons turnEntries={turn.turnEntries} />
      {!turn.hasSuggestions ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ink-faint)',
            fontSize: '0.9rem',
            textAlign: 'center',
            padding: '40px 24px',
          }}
        >
          No item suggestions for this reply.
        </div>
      ) : (
        <>
          {turn.structuredParts.map((part, i) => {
            if (part.type === 'menu_preview') {
              return <MenuPreviewCard key={`mp-${i}`} preview={part.preview} />;
            }
            return null;
          })}
          {turn.mealSessions.map((meal, i) => (
            <MealSessionCard key={`ms-${meal.id ?? i}`} part={meal} />
          ))}
        </>
      )}
    </>
  );
}

function TurnRow({
  turn,
  isSelected,
  onSelect,
}: {
  turn: NormalisedTurn;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: isSelected ? 'var(--paper-deep)' : 'transparent',
        border: '1px solid',
        borderColor: isSelected ? 'var(--ink-faint)' : 'transparent',
        borderRadius: 12,
        padding: '10px 12px',
        marginBottom: 8,
        cursor: 'pointer',
        font: 'inherit',
        color: 'inherit',
      }}
    >
      {turn.userText !== null && <TextBubble sender="user" text={turn.userText} />}
      {turn.textParts.map((text, i) => (
        <TextBubble key={`bt-${i}`} sender="bot" text={text} />
      ))}
      {turn.hasSuggestions && (() => {
        const count = turn.structuredParts.length + turn.mealSessions.length;
        return (
          <div
            style={{
              marginTop: 6,
              fontSize: '0.7rem',
              color: 'var(--ink-faint)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {count} {count === 1 ? 'suggestion' : 'suggestions'} — click to view
          </div>
        );
      })()}
    </button>
  );
}
