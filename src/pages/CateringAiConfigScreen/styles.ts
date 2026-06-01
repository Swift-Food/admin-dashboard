import type { CSSProperties } from 'react';

// Shared inline styles for the pipeline-config screen, matching the
// palette used elsewhere in the dashboard (headings #051661, body #4b5563).
export const styles: Record<string, CSSProperties> = {
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    maxWidth: 760,
  },
  cardTitle: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#051661',
    margin: 0,
  },
  cardDesc: {
    fontSize: '0.82rem',
    color: '#6b7280',
    margin: '4px 0 14px',
  },
  fieldRow: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#4b5563',
    marginBottom: 4,
  },
  select: {
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    fontSize: '0.85rem',
    background: '#fff',
    color: '#111827',
    minWidth: 190,
  },
  number: {
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    fontSize: '0.85rem',
    width: 110,
  },
  primaryButton: {
    padding: '10px 18px',
    background: '#051661',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '6px 12px',
    background: '#fff',
    color: '#051661',
    border: '1px solid #051661',
    borderRadius: 8,
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#dc2626',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
  },
};
