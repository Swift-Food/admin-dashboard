import { useEffect } from 'react';
import { TextBubble } from './parts/TextBubble';
import { IntentBlockCard } from './parts/IntentBlockCard';
import { MealSessionCard } from './parts/MealSessionCard';
import { isRenderablePart, type RenderableMessagePart } from './types';
import './snapshot.css';

interface SnapshotModalProps {
  /** The text of the immediately preceding user_message event, or null. */
  userText: string | null;
  /** The bot_reply payload's `text` field — leading prose, if any. */
  botText: string;
  /** Raw `parts` from the bot_reply payload; filtered to renderable types. */
  rawBotParts: unknown;
  onClose: () => void;
}

export function SnapshotModal({
  userText,
  botText,
  rawBotParts,
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

  // The bot_reply.text is also surfaced as a TextPart at the head of
  // response.parts, so deduplicate: if the first text part matches botText,
  // skip the standalone botText bubble. Otherwise show both.
  const firstPart = parts[0];
  const firstIsLeadingText =
    firstPart && firstPart.type === 'text' && firstPart.text === botText;

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
          {userText !== null && <TextBubble sender="user" text={userText} />}

          {botText && !firstIsLeadingText && (
            <TextBubble sender="bot" text={botText} />
          )}

          {parts.map((part, i) => {
            if (part.type === 'text') {
              return <TextBubble key={`text-${i}`} sender="bot" text={part.text} />;
            }
            if (part.type === 'intent_block') {
              return <IntentBlockCard key={`ib-${part.intentId}-${i}`} part={part} />;
            }
            if (part.type === 'meal_session') {
              return (
                <MealSessionCard
                  key={`ms-${part.mealSessionIndex}-${i}`}
                  part={part}
                />
              );
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
}
