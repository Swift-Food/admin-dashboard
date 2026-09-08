import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import emailTemplatesService from '../../services/email-templates.service';
import type {
  EmailTemplatePreview,
  EmailTemplateSummary,
} from '../../types/email-templates.types';
import TemplateList from './TemplateList';
import TemplatePreviewPane from './TemplatePreview';

/**
 * `source` keeps the two independent failures apart: a list failure is fatal to
 * the page, a preview failure is not, and a successful preview must not clear
 * the list's banner.
 */
type Message = {
  type: 'success' | 'error';
  text: string;
  source: 'list' | 'preview';
};

/**
 * Turns an axios failure into something an admin can act on. 403 is the common
 * case (signed in, but not UserRole.ADMIN) and deserves its own wording rather
 * than a blank screen.
 */
const toMessage = (
  err: unknown,
  fallback: string,
  source: Message['source'],
): Message => {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 403) {
      return {
        type: 'error',
        text: 'Your account does not have admin access to the email template catalogue.',
        source,
      };
    }
    if (status === 404) {
      return { type: 'error', text: 'That template no longer exists.', source };
    }
  }
  return {
    type: 'error',
    text: err instanceof Error ? err.message : fallback,
    source,
  };
};

const SKELETON_BAR: React.CSSProperties = {
  height: 14,
  borderRadius: 6,
  background: '#e5e7eb',
  marginBottom: 10,
};

const EmailTemplatesScreen: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplateSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [variant, setVariant] = useState<string | null>(null);
  const [preview, setPreview] = useState<EmailTemplatePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    let active = true;
    emailTemplatesService
      .list()
      .then((list) => {
        if (!active) return;
        setTemplates(list);
        // Auto-select the first customer template, falling back to the first of
        // anything so the pane is never empty when no customer email exists.
        const first =
          list.find((t) => t.audience === 'customer') ?? list[0] ?? null;
        setSelectedId(first ? first.id : null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setMessage(toMessage(err, 'Failed to load email templates.', 'list'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setPreview(null);
      return;
    }
    let active = true;
    setPreviewLoading(true);
    emailTemplatesService
      .preview(selectedId, variant ?? undefined)
      .then((res) => {
        if (!active) return;
        setPreview(res);
        // Only retire a previous *preview* error; a list error is still true.
        setMessage((current) =>
          current && current.source === 'preview' ? null : current,
        );
      })
      .catch((err: unknown) => {
        if (!active) return;
        setPreview(null);
        setMessage(
          toMessage(err, 'Failed to load the template preview.', 'preview'),
        );
      })
      .finally(() => {
        if (active) setPreviewLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedId, variant]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    // A variant name belongs to one template; carrying it across would ask the
    // server for a variant the new template does not declare.
    setVariant(null);
  }, []);

  const selectedSummary =
    templates.find((t) => t.id === selectedId) ?? null;

  return (
    <div style={{ padding: 24 }}>
      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#051661',
          marginBottom: 6,
        }}
      >
        Email Templates
      </h1>
      <p
        style={{
          fontSize: '0.9rem',
          color: '#4b5563',
          marginBottom: 20,
          maxWidth: 720,
        }}
      >
        Every email Swift sends to customers, restaurants and partners, grouped
        by who receives it. Read-only: templates live in the backend codebase and
        each preview is rendered from that template's own sample data.
      </p>

      {message ? (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#166534' : '#991b1b',
            fontSize: '0.9rem',
            marginBottom: 16,
            maxWidth: 720,
          }}
        >
          {message.text}
        </div>
      ) : null}

      {loading ? (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: 20,
            maxWidth: 340,
          }}
        >
          {[80, 60, 70, 50, 65].map((widthPercent, index) => (
            <div
              key={`${widthPercent}-${index}`}
              style={{ ...SKELETON_BAR, width: `${widthPercent}%` }}
            />
          ))}
        </div>
      ) : null}

      {!loading && templates.length === 0 && !message ? (
        <p style={{ color: '#6b7280' }}>No email templates are registered.</p>
      ) : null}

      {!loading && templates.length > 0 ? (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <TemplateList
            templates={templates}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
          <TemplatePreviewPane
            summary={selectedSummary}
            preview={preview}
            loading={previewLoading}
            variant={variant}
            onVariantChange={setVariant}
          />
        </div>
      ) : null}
    </div>
  );
};

export default EmailTemplatesScreen;
