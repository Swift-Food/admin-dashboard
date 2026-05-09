import { useEffect, useMemo, useState } from 'react';
import { TextBubble } from './parts/TextBubble';
import { IntentBlockCard } from './parts/IntentBlockCard';
import { MealSessionCard } from './parts/MealSessionCard';
import { MenuPreviewCard } from './parts/MenuPreviewCard';
import { isRenderablePart, type RenderableMessagePart } from './types';
import './snapshot.css';

export interface SessionTurn {
  userText: string | null;
  botText: string;
  rawBotParts: unknown;
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
  hasSuggestions: boolean;
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
          hasSuggestions: structuredParts.length > 0,
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
  if (!turn.hasSuggestions) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink-faint)',
          fontSize: '0.9rem',
          textAlign: 'center',
          padding: 24,
        }}
      >
        No item suggestions for this reply.
      </div>
    );
  }
  return (
    <>
      {turn.structuredParts.map((part, i) => {
        if (part.type === 'intent_block') {
          return <IntentBlockCard key={`ib-${part.intentId}-${i}`} part={part} />;
        }
        if (part.type === 'meal_session') {
          return (
            <MealSessionCard key={`ms-${part.mealSessionIndex}-${i}`} part={part} />
          );
        }
        if (part.type === 'menu_preview') {
          return <MenuPreviewCard key={`mp-${i}`} preview={part.preview} />;
        }
        return null;
      })}
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
      {turn.hasSuggestions && (
        <div
          style={{
            marginTop: 6,
            fontSize: '0.7rem',
            color: 'var(--ink-faint)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {turn.structuredParts.length}{' '}
          {turn.structuredParts.length === 1 ? 'suggestion' : 'suggestions'} — click to view
        </div>
      )}
    </button>
  );
}
