import React, { useEffect, useState } from 'react';
import Modal from '../../components/Modal/Modal';
import type {
  EmailTemplatePreview,
  EmailTemplateSummary,
} from '../../types/email-templates.types';

interface TemplatePreviewProps {
  /**
   * The selected row's summary. Every rendered field except `html` is already
   * here, so the header card renders without waiting for the fetch and stays
   * mounted across a selection change. (`variables` is still carried by the
   * API and the type; it is deliberately not displayed.)
   */
  summary: EmailTemplateSummary | null;
  /** The rendered body. Null while the first fetch is in flight, or on error. */
  preview: EmailTemplatePreview | null;
  loading: boolean;
  /** Currently requested variant name, or null for the default sample params. */
  variant: string | null;
  onVariantChange: (variant: string | null) => void;
}

const CARD: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
};

/** The backend's degraded render, from safeRender(). Shown as an error. */
const RENDER_FAILURE_PREFIX = '<p>Template failed to render:';

const MONOSPACE = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

type PreviewMode = 'desktop' | 'mobile';

const SECTION_TITLE: React.CSSProperties = {
  fontSize: '0.95rem',
  fontWeight: 700,
  color: '#051661',
  margin: 0,
};

const LOADING_NOTE: React.CSSProperties = {
  marginLeft: 8,
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#6b7280',
};

const TOGGLE_BUTTON: React.CSSProperties = {
  padding: '5px 12px',
  border: '1px solid #051661',
  borderRadius: 8,
  fontSize: '0.75rem',
  fontWeight: 600,
  cursor: 'pointer',
  textTransform: 'capitalize',
};

/** One control, rendered both inline and in the modal off the same state. */
const ModeToggle: React.FC<{
  mode: PreviewMode;
  onChange: (mode: PreviewMode) => void;
}> = ({ mode, onChange }) => (
  <div style={{ display: 'flex', gap: 8 }}>
    {(['desktop', 'mobile'] as const).map((option) => (
      <button
        key={option}
        type="button"
        onClick={() => onChange(option)}
        style={{
          ...TOGGLE_BUTTON,
          background: mode === option ? '#051661' : '#fff',
          color: mode === option ? '#fff' : '#051661',
        }}
      >
        {option}
      </button>
    ))}
  </div>
);

const RenderFailureBanner: React.FC = () => (
  <div
    style={{
      padding: '10px 14px',
      borderRadius: 8,
      background: '#fee2e2',
      color: '#991b1b',
      fontSize: '0.85rem',
      marginBottom: 12,
      flexShrink: 0,
    }}
  >
    This template failed to render on the server. The body below is the error
    placeholder, not the email.
  </div>
);

/**
 * The grey gutter, the sandboxed iframe and the links note. Used unchanged by
 * the inline pane and by the modal, so the two can never drift apart on the one
 * thing that matters most here - the sandbox.
 */
const PreviewFrame: React.FC<{
  preview: EmailTemplatePreview | null;
  loading: boolean;
  width: number | string;
}> = ({ preview, loading, width }) => (
  <>
    {/*
      Only this gutter changes while a preview loads: the header, subject and
      variant select above stay mounted, so clicking through the catalogue does
      not repaint the whole pane. The previous body is held at 40% opacity
      rather than blanked. It flexes to fill the space the pane has left, and
      the iframe scrolls its own document, so the page never scrolls.
    */}
    <div
      style={{
        background: '#f3f4f6',
        borderRadius: 8,
        padding: 16,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'stretch',
        flex: 1,
        minHeight: 0,
        opacity: loading ? 0.4 : 1,
        transition: 'opacity 120ms ease',
      }}
    >
      {preview ? (
        /*
          Sandboxed with no tokens at all: no allow-scripts and no
          allow-same-origin, so a template cannot run script or reach the
          parent's localStorage (where the admin JWT lives). srcDoc also keeps
          the document's own <style> and body background from leaking out and
          restyling the dashboard, and it matches how a mail client renders.
          Never dangerouslySetInnerHTML.
        */
        <iframe
          title="Email preview"
          sandbox=""
          srcDoc={preview.html}
          style={{
            width,
            height: '100%',
            border: 'none',
            background: '#fff',
            display: 'block',
          }}
        />
      ) : (
        <span
          style={{
            color: '#6b7280',
            fontSize: '0.85rem',
            alignSelf: 'center',
          }}
        >
          {loading ? 'Loading preview…' : 'No preview available.'}
        </span>
      )}
    </div>
    <p
      style={{
        fontSize: '0.72rem',
        color: '#6b7280',
        margin: '8px 0 0',
        flexShrink: 0,
      }}
    >
      Links are disabled in preview.
    </p>
  </>
);

const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  summary,
  preview,
  loading,
  variant,
  onVariantChange,
}) => {
  const [mode, setMode] = useState<PreviewMode>('desktop');
  const [expanded, setExpanded] = useState(false);

  // Lock the page behind the modal and close it on Escape. The shared Modal
  // does neither: it only closes on an overlay click. Handled here rather than
  // in Modal so the other call sites' behaviour is left exactly as it is.
  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [expanded]);

  if (!summary) {
    return (
      <div style={{ flex: 1 }}>
        <div style={CARD}>
          <p style={{ margin: 0, color: '#6b7280' }}>
            Select a template to preview it.
          </p>
        </div>
      </div>
    );
  }

  const width = mode === 'mobile' ? 390 : '100%';
  const failed = preview?.html.startsWith(RENDER_FAILURE_PREFIX) ?? false;
  // The server is authoritative about which variant was actually rendered: it
  // silently falls back to the default sample params for an unknown name. Only
  // while a request is in flight does the requested name stand in, so the
  // <select> does not jump back under the user mid-fetch.
  const selectedVariant = preview && !loading ? preview.variant : variant;

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ ...CARD, flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <h2
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#051661',
              margin: 0,
            }}
          >
            {summary.name}
          </h2>
          <code
            style={{
              background: '#f3f4f6',
              color: '#374151',
              borderRadius: 999,
              padding: '3px 10px',
              fontSize: '0.72rem',
              fontFamily: MONOSPACE,
            }}
          >
            {summary.id}
          </code>
        </div>
        <p
          style={{ fontSize: '0.82rem', color: '#6b7280', margin: '6px 0 14px' }}
        >
          {summary.description}
        </p>

        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            background: '#f9fafb',
            padding: '10px 12px',
            display: 'flex',
            gap: 8,
            alignItems: 'baseline',
          }}
        >
          <span
            style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6b7280' }}
          >
            Subject
          </span>
          <span
            style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111827' }}
          >
            {summary.subjectPreview}
          </span>
        </div>

        {summary.variants.length > 0 ? (
          <div
            style={{
              marginTop: 14,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6b7280' }}
            >
              Variant
            </span>
            <select
              value={selectedVariant ?? ''}
              onChange={(e) => onVariantChange(e.target.value || null)}
              style={{
                padding: '6px 8px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: '0.82rem',
              }}
            >
              <option value="">Default sample</option>
              {summary.variants.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <div
        style={{
          ...CARD,
          marginBottom: 0,
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 12,
            flexShrink: 0,
          }}
        >
          <h3 style={SECTION_TITLE}>
            Preview
            {loading ? <span style={LOADING_NOTE}>Loading…</span> : null}
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <ModeToggle mode={mode} onChange={setMode} />
            <button
              type="button"
              onClick={() => setExpanded(true)}
              style={{ ...TOGGLE_BUTTON, background: '#fff', color: '#051661' }}
            >
              Expand
            </button>
          </div>
        </div>

        {failed ? <RenderFailureBanner /> : null}

        <PreviewFrame preview={preview} loading={loading} width={width} />
      </div>

      <Modal open={expanded} onClose={() => setExpanded(false)}>
        <div
          style={{
            width: '85vw',
            height: '85vh',
            background: '#fff',
            borderRadius: 12,
            padding: 20,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 12,
              flexShrink: 0,
            }}
          >
            <h3 style={{ ...SECTION_TITLE, minWidth: 0 }}>
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                }}
              >
                {summary.name}
              </span>
            </h3>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {/* One piece of state, two renderers: toggling here and closing
                  leaves the inline pane on the same width. */}
              <ModeToggle mode={mode} onChange={setMode} />
              <button
                type="button"
                onClick={() => setExpanded(false)}
                aria-label="Close preview"
                style={{ ...TOGGLE_BUTTON, background: '#051661', color: '#fff' }}
              >
                Close
              </button>
            </div>
          </div>

          {failed ? <RenderFailureBanner /> : null}

          <PreviewFrame preview={preview} loading={loading} width={width} />
        </div>
      </Modal>
    </div>
  );
};

export default TemplatePreview;
