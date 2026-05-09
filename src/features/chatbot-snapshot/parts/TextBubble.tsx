type Sender = 'bot' | 'user';

interface TextBubbleProps {
  sender: Sender;
  text: string;
}

export function TextBubble({ sender, text }: TextBubbleProps) {
  const isUser = sender === 'user';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 8,
      }}
    >
      <div
        className={isUser ? '' : 'display'}
        style={{
          maxWidth: '85%',
          padding: '10px 14px',
          borderRadius: '16px',
          fontSize: '0.95rem',
          lineHeight: 1.45,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
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
    </div>
  );
}
