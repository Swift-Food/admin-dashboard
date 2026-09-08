import React, { useEffect, useState } from 'react';
import type {
  EmailTemplatePreview,
  EmailTemplateSummary,
} from '../../types/email-templates.types';

interface TemplatePreviewProps {
  /**
   * The selected row's summary. Every field except `html` is already here, so
   * the header and variables cards render without waiting for the fetch and
   * stay mounted across a selection change.
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

const VARIABLES_COLLAPSE_THRESHOLD = 8;

const MONOSPACE = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  summary,
  preview,
  loading,
  variant,
  onVariantChange,
}) => {
  const [mode, setMode] = useState<'desktop' | 'mobile'>('desktop');
  const [variablesExpanded, setVariablesExpanded] = useState(false);

  const summaryId = summary?.id ?? null;
  // Collapse again when the selection changes: "Show fewer" against a template
  // the user never expanded is a lie about the list they are looking at.
  useEffect(() => {
    setVariablesExpanded(false);
  }, [summaryId]);

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
  const collapsible = summary.variables.length > VARIABLES_COLLAPSE_THRESHOLD;
  const visibleVariables =
    collapsible && !variablesExpanded
      ? summary.variables.slice(0, VARIABLES_COLLAPSE_THRESHOLD)
      : summary.variables;
  // The server is authoritative about which variant was actually rendered: it
  // silently falls back to the default sample params for an unknown name. Only
  // while a request is in flight does the requested name stand in, so the
  // <select> does not jump back under the user mid-fetch.
  const selectedVariant = preview && !loading ? preview.variant : variant;

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={CARD}>
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

      <div style={CARD}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <h3
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#051661',
              margin: 0,
            }}
          >
            Variables ({summary.variables.length})
          </h3>
          {collapsible ? (
            <button
              type="button"
              onClick={() => setVariablesExpanded((open) => !open)}
              style={{
                padding: '5px 10px',
                background: '#fff',
                color: '#051661',
                border: '1px solid #051661',
                borderRadius: 8,
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {variablesExpanded
                ? 'Show fewer'
                : `Show all ${summary.variables.length}`}
            </button>
          ) : null}
        </div>

        {summary.variables.length === 0 ? (
          <p
            style={{ fontSize: '0.82rem', color: '#6b7280', margin: '10px 0 0' }}
          >
            This template takes no parameters.
          </p>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: 10,
              tableLayout: 'fixed',
            }}
          >
            <tbody>
              {visibleVariables.map((v) => (
                <tr key={v.name} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td
                    style={{
                      padding: '7px 8px 7px 0',
                      width: '40%',
                      verticalAlign: 'top',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: '#111827',
                        fontFamily: MONOSPACE,
                      }}
                    >
                      {v.name}
                    </span>
                    <span
                      style={{
                        marginLeft: 8,
                        background: '#f3f4f6',
                        color: '#6b7280',
                        borderRadius: 4,
                        padding: '1px 6px',
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {v.type}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '7px 0',
                      fontSize: '0.82rem',
                      color: '#4b5563',
                      wordBreak: 'break-word',
                    }}
                  >
                    {v.sampleValue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={CARD}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <h3
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#051661',
              margin: 0,
            }}
          >
            Preview
            {loading ? (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#6b7280',
                }}
              >
                Loading…
              </span>
            ) : null}
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['desktop', 'mobile'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMode(option)}
                style={{
                  padding: '5px 12px',
                  background: mode === option ? '#051661' : '#fff',
                  color: mode === option ? '#fff' : '#051661',
                  border: '1px solid #051661',
                  borderRadius: 8,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {failed ? (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: '#fee2e2',
              color: '#991b1b',
              fontSize: '0.85rem',
              marginBottom: 12,
            }}
          >
            This template failed to render on the server. The body below is the
            error placeholder, not the email.
          </div>
        ) : null}

        {/*
          Only this gutter changes while a preview loads: the header, subject,
          variant select and variables above stay mounted, so clicking through
          the catalogue does not repaint the whole pane. The previous body is
          held at 40% opacity rather than blanked, which keeps the scroll
          position and the gutter height stable between templates.
        */}
        <div
          style={{
            background: '#f3f4f6',
            borderRadius: 8,
            padding: 16,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 200,
            opacity: loading ? 0.4 : 1,
            transition: 'opacity 120ms ease',
          }}
        >
          {preview ? (
            /*
              Sandboxed with no tokens at all: no allow-scripts and no
              allow-same-origin, so a template cannot run script or reach the
              parent's localStorage (where the admin JWT lives). srcDoc also
              keeps the document's own <style> and body background from leaking
              out and restyling the dashboard, and it matches how a mail client
              renders. Never dangerouslySetInnerHTML.
            */
            <iframe
              title="Email preview"
              sandbox=""
              srcDoc={preview.html}
              style={{
                width,
                height: 800,
                border: 'none',
                background: '#fff',
                display: 'block',
              }}
            />
          ) : (
            <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>
              {loading ? 'Loading preview…' : 'No preview available.'}
            </span>
          )}
        </div>
        <p style={{ fontSize: '0.72rem', color: '#6b7280', margin: '8px 0 0' }}>
          Links are disabled in preview.
        </p>
      </div>
    </div>
  );
};

export default TemplatePreview;
