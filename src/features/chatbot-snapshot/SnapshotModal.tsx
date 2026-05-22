import { useEffect } from 'react';
import { TextBubble } from './parts/TextBubble';
import { MealSessionCard } from './parts/MealSessionCard';
import { MenuPreviewCard } from './parts/MenuPreviewCard';
import { TurnInspectButtons } from './TurnInspectButtons';
import { isRenderablePart, type RenderableMessagePart, type MealSessionView } from './types';
import type { TurnEntry } from './FullSessionModal';
import './snapshot.css';

interface SnapshotModalProps {
  /** The text of the immediately preceding user_message event, or null. */
  userText: string | null;
  /** The bot_reply payload's `text` field — leading prose, if any. */
  botText: string;
  /** Raw `parts` from the bot_reply payload; filtered to renderable types. */
  rawBotParts: unknown;
  /** Top-level `response.mealSessions` snapshot for this turn. Each meal
   *  is rendered as a MealSessionCard beneath the bot bubble. */
  mealSessions?: MealSessionView[];
  /** Inter-turn timeline entries (between previous bot_reply and this one). */
  turnEntries?: TurnEntry[];
  onClose: () => void;
}

export function SnapshotModal({
  userText,
  botText,
  rawBotParts,
  mealSessions = [],
  turnEntries = [],
  onClose,
}: SnapshotModalProps) {
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

  const parts: RenderableMessagePart[] = Array.isArray(rawBotParts)
    ? rawBotParts.filter(isRenderablePart)
    : [];

  // The bot_reply text is always surfaced as a TextPart inside `parts`
  // (sometimes at the head, sometimes after intent blocks). Render only
  // from `parts` and fall back to `botText` only when there are no parts
  // at all — otherwise we'd show the same prose twice.
  const hasParts = parts.length > 0;

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
          maxWidth: 720,
          width: '100%',
          maxHeight: '90vh',
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
          }}
        >
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#1f2937' }}>
            Bot reply preview
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

        {/* Scrollable body, scoped under .snapshot-design for design tokens */}
        <div
          className="snapshot-design"
          style={{ flex: 1, overflow: 'auto', padding: 20 }}
        >
          <TurnInspectButtons turnEntries={turnEntries} />

          {userText !== null && <TextBubble sender="user" text={userText} />}

          {!hasParts && botText && <TextBubble sender="bot" text={botText} />}

          {/* Render all text parts first (directly under the user bubble), */}
          {/* then the structured suggestion parts beneath. The backend may */}
          {/* place its trailing prose at the end of `parts`, but in the */}
          {/* preview we always want the bot's reply to read right after */}
          {/* the user's message. */}
          {parts
            .filter((p) => p.type === 'text')
            .map((part, i) => (
              <TextBubble key={`text-${i}`} sender="bot" text={part.text} />
            ))}

          {parts
            .filter((p) => p.type !== 'text')
            .map((part, i) => {
              if (part.type === 'menu_preview') {
                return <MenuPreviewCard key={`mp-${i}`} preview={part.preview} />;
              }
              return null;
            })}

          {/* Meal sessions live on `response.mealSessions`, not in `parts`,
              post backend consolidation. Render one card per meal. */}
          {mealSessions.map((meal, i) => (
            <MealSessionCard key={`ms-${meal.id ?? i}`} part={meal} />
          ))}
        </div>
      </div>
    </div>
  );
}
