import { useState } from 'react';

type Sender = 'bot' | 'user';

interface TextBubbleProps {
  sender: Sender;
  text: string;
  /**
   * If true, clicking anywhere on the bubble itself copies the text.
   * The dedicated icon button is always available regardless.
   */
  clickToCopy?: boolean;
}

function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => fallback(text));
  }
  return Promise.resolve(fallback(text));
}

function fallback(text: string): boolean {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function CopyIcon({ copied }: { copied: boolean }) {
  if (copied) {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 8.5L6.5 12L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="5" y="3" width="8" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M11 3V2.5C11 2.22 10.78 2 10.5 2H7.5C7.22 2 7 2.22 7 2.5V3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 5.5V13C3 13.55 3.45 14 4 14H10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function TextBubble({ sender, text, clickToCopy = false }: TextBubbleProps) {
  const isUser = sender === 'user';
  const [hover, setHover] = useState(false);
  const [copied, setCopied] = useState(false);

  const doCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  const iconButton = (
    <button
      type="button"
      onClick={doCopy}
      aria-label={copied ? 'Copied' : `Copy ${sender} message`}
      title={copied ? 'Copied!' : 'Copy message'}
      style={{
        flex: '0 0 auto',
        alignSelf: 'center',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 20,
        height: 20,
        border: 0,
        background: 'transparent',
        color: copied ? '#047857' : '#6b7280',
        padding: 0,
        cursor: 'pointer',
        opacity: hover || copied ? 1 : 0,
        transition: 'opacity 120ms ease',
      }}
    >
      <CopyIcon copied={copied} />
    </button>
  );

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
      }}
    >
      {isUser && iconButton}
      <div
        onClick={clickToCopy ? doCopy : undefined}
        className={`${isUser ? '' : 'display'}${copied ? ' snapshot-bubble-copied' : ''}`}
        style={{
          maxWidth: '85%',
          padding: '10px 14px',
          borderRadius: '16px',
          fontSize: '0.95rem',
          lineHeight: 1.45,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          cursor: clickToCopy ? 'copy' : 'inherit',
          ...(isUser
            ? {
                backgroundColor: 'var(--brand)',
                color: 'white',
                borderBottomRightRadius: '4px',
                fontFamily: 'var(--font-body)',
              }
            : {
                backgroundColor: 'var(--paper)',
                color: 'var(--ink)',
                border: '1px solid var(--rule)',
                borderBottomLeftRadius: '4px',
              }),
        }}
      >
        {text}
      </div>
      {!isUser && iconButton}
    </div>
  );
}
