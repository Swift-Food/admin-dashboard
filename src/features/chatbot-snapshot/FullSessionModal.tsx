import { useEffect, useMemo, useRef, useState } from 'react';
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
  feedback?: Array<{
    id: number;
    rating: number;
    note: string | null;
    source: string;
    isAddressed: boolean;
  }>;
}

interface FullSessionModalProps {
  turns: SessionTurn[];
  generalFeedback?: SessionTurn['feedback'];
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
  feedback: NonNullable<SessionTurn['feedback']>;
}

export function FullSessionModal({ turns, generalFeedback, onClose }: FullSessionModalProps) {
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
          feedback: turn.feedback ?? [],
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
              <SuggestionsPane key={selectedTurn?.index ?? 0} turn={selectedTurn} />
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
              {generalFeedback && generalFeedback.length > 0 && (
                <div style={{
                  marginBottom: 12,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #e9d5ff',
                  background: '#faf5ff',
                }}>
                  <div style={{
                    fontSize: '0.7rem',
                    color: '#7c3aed',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 600,
                    marginBottom: 6,
                  }}>
                    General feedback ({generalFeedback.length})
                  </div>
                  {generalFeedback.map((fb) => (
                    <FeedbackPill key={fb.id} fb={fb} />
                  ))}
                </div>
              )}
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
  const [activeMealIdx, setActiveMealIdx] = useState(0);
  if (!turn) return null;

  const meals = turn.mealSessions;
  const safeMealIdx = Math.min(Math.max(0, activeMealIdx), meals.length - 1);
  const activeMeal = meals[safeMealIdx];

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
          {meals.length > 1 && (
            <MealPicker
              meals={meals}
              activeIdx={safeMealIdx}
              onSelect={setActiveMealIdx}
            />
          )}
          {activeMeal && (
            <MealSessionCard
              key={`ms-${activeMeal.id ?? safeMealIdx}`}
              part={activeMeal}
              hideHeader={meals.length > 1}
            />
          )}
        </>
      )}
    </>
  );
}

function formatMealMeta(meal: MealSessionView): string {
  const parts: string[] = [];
  if (meal.sessionDate) parts.push(meal.sessionDate);
  if (meal.eventTime) parts.push(meal.eventTime);
  if (meal.guestCount !== null) parts.push(`${meal.guestCount} guests`);
  return parts.length > 0 ? parts.join(' · ') : 'Time not set';
}

function MealPicker({
  meals,
  activeIdx,
  onSelect,
}: {
  meals: MealSessionView[];
  activeIdx: number;
  onSelect: (idx: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeMeal = meals[activeIdx];

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!activeMeal) return null;

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', marginBottom: 16 }}
    >
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          width: '100%',
          padding: '10px 14px',
          borderRadius: 10,
          border: '1px solid var(--rule)',
          backgroundColor: 'var(--paper)',
          color: 'var(--ink)',
          cursor: 'pointer',
          textAlign: 'left',
          font: 'inherit',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span
            className="display"
            style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--ink)' }}
          >
            {activeMeal.sessionName}
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--ink-faint)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {formatMealMeta(activeMeal)}
          </span>
        </span>
        <span
          aria-hidden="true"
          style={{
            fontSize: '0.7rem',
            color: 'var(--ink-faint)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 120ms ease',
          }}
        >
          ▾
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 10,
            background: 'var(--paper)',
            border: '1px solid var(--rule)',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 14px',
              borderBottom: '1px solid var(--rule)',
              background: 'var(--paper-deep)',
              fontSize: '0.75rem',
              color: 'var(--ink-faint)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            <span>Meal sessions</span>
            <span>{meals.length} {meals.length === 1 ? 'session' : 'sessions'}</span>
          </div>
          {meals.map((meal, idx) => {
            const isActive = idx === activeIdx;
            return (
              <button
                key={meal.id ?? idx}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  onSelect(idx);
                  setOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 14px',
                  border: 0,
                  borderTop: idx === 0 ? 0 : '1px solid var(--rule)',
                  background: isActive ? 'var(--paper-deep)' : 'transparent',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  font: 'inherit',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    flex: '0 0 auto',
                    width: 16,
                    color: isActive ? 'var(--ink)' : 'transparent',
                    fontWeight: 700,
                  }}
                >
                  ✓
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span
                    className="display"
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: isActive ? 700 : 600,
                      color: 'var(--ink)',
                    }}
                  >
                    {meal.sessionName}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--ink-faint)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {formatMealMeta(meal)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FeedbackPill({ fb }: { fb: NonNullable<SessionTurn['feedback']>[number] }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 8px',
      borderRadius: 6,
      border: '1px solid #e9d5ff',
      background: '#faf5ff',
      marginBottom: 4,
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: '0.8rem' }} title={`${fb.rating}/5`}>
        {[1, 2, 3, 4, 5].map(n => (
          <span key={n} style={{ color: n <= fb.rating ? '#fbbf24' : '#d1d5db' }}>★</span>
        ))}
      </span>
      <span style={{
        fontSize: '0.6rem',
        fontWeight: 600,
        padding: '1px 5px',
        borderRadius: 4,
        background: '#e9d5ff',
        color: '#6b21a8',
        textTransform: 'uppercase',
      }}>
        {fb.source}
      </span>
      {fb.isAddressed && (
        <span style={{
          fontSize: '0.6rem',
          fontWeight: 600,
          padding: '1px 5px',
          borderRadius: 4,
          background: '#d1fae5',
          color: '#047857',
        }}>
          addressed
        </span>
      )}
      {fb.note && (
        <span style={{ fontSize: '0.75rem', color: '#374151', fontStyle: 'italic' }}>
          &ldquo;{fb.note}&rdquo;
        </span>
      )}
    </div>
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
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
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
      {turn.userText !== null && (
        <TextBubble sender="user" text={turn.userText} clickToCopy={isSelected} />
      )}
      {turn.textParts.map((text, i) => (
        <TextBubble key={`bt-${i}`} sender="bot" text={text} clickToCopy={isSelected} />
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
      {turn.feedback.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {turn.feedback.map((fb) => (
            <FeedbackPill key={fb.id} fb={fb} />
          ))}
        </div>
      )}
    </div>
  );
}
