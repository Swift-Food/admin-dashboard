import React, { useMemo, useState } from 'react';
import type {
  EmailAudience,
  EmailTemplateSummary,
} from '../../types/email-templates.types';

interface TemplateListProps {
  templates: EmailTemplateSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Display order and heading text per audience. This is a *label lookup*, not a
 * list of sections to render: the sections themselves are derived from the data
 * below, so an audience with no templates (today: `driver`) produces no heading,
 * and a future audience with templates needs only an entry here.
 */
const AUDIENCE_ORDER: readonly EmailAudience[] = [
  'customer',
  'restaurant',
  'driver',
  'partner',
];

const AUDIENCE_LABEL: Record<EmailAudience, string> = {
  customer: 'To customers',
  restaurant: 'To restaurants',
  driver: 'To drivers',
  partner: 'To partners',
};

interface Section {
  audience: EmailAudience;
  label: string;
  groups: { name: string; templates: EmailTemplateSummary[] }[];
}

/**
 * Buckets templates by audience, then by group. Audiences follow
 * AUDIENCE_ORDER; anything with an unrecognised audience is appended after the
 * known ones rather than silently dropped. Groups keep first-seen order, which
 * is the registry's own order.
 */
const buildSections = (templates: EmailTemplateSummary[]): Section[] => {
  const byAudience = new Map<EmailAudience, EmailTemplateSummary[]>();
  for (const template of templates) {
    const bucket = byAudience.get(template.audience);
    if (bucket) bucket.push(template);
    else byAudience.set(template.audience, [template]);
  }

  const known = AUDIENCE_ORDER.filter((a) => byAudience.has(a));
  const unknown = [...byAudience.keys()].filter(
    (a) => !AUDIENCE_ORDER.includes(a),
  );

  return [...known, ...unknown].map((audience) => {
    const groups: Section['groups'] = [];
    for (const template of byAudience.get(audience) ?? []) {
      const existing = groups.find((g) => g.name === template.group);
      if (existing) existing.templates.push(template);
      else groups.push({ name: template.group, templates: [template] });
    }
    return { audience, label: AUDIENCE_LABEL[audience] ?? audience, groups };
  });
};

const SECTION_HEADING: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 1,
  background: '#f9fafb',
  borderTop: '1px solid #e5e7eb',
  borderBottom: '1px solid #e5e7eb',
  padding: '8px 12px',
  margin: 0,
  fontSize: '0.8rem',
  fontWeight: 700,
  color: '#051661',
};

const GROUP_LABEL: React.CSSProperties = {
  padding: '10px 12px 4px',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: '#6b7280',
};

const TRUNCATE: React.CSSProperties = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const TemplateList: React.FC<TemplateListProps> = ({
  templates,
  selectedId,
  onSelect,
}) => {
  const [filter, setFilter] = useState('');

  const sections = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const matched = needle
      ? templates.filter((t) =>
          `${t.name} ${t.description} ${t.subjectPreview}`
            .toLowerCase()
            .includes(needle),
        )
      : templates;
    return buildSections(matched);
  }, [templates, filter]);

  const matchCount = sections.reduce(
    (total, section) =>
      total +
      section.groups.reduce((sum, group) => sum + group.templates.length, 0),
    0,
  );

  return (
    <div
      style={{
        width: 340,
        flexShrink: 0,
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 160px)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name, description or subject"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            fontSize: '0.85rem',
          }}
        />
        <div style={{ marginTop: 6, fontSize: '0.72rem', color: '#6b7280' }}>
          {matchCount} of {templates.length} templates
        </div>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {matchCount === 0 ? (
          <p style={{ padding: 16, color: '#6b7280', fontSize: '0.85rem' }}>
            No templates match “{filter}”.
          </p>
        ) : null}

        {sections.map((section) => (
          <div key={section.audience}>
            <h3 style={SECTION_HEADING}>{section.label}</h3>
            {section.groups.map((group) => (
              <div key={`${section.audience}:${group.name}`}>
                <div style={GROUP_LABEL}>{group.name}</div>
                {group.templates.map((template) => {
                  const selected = template.id === selectedId;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => onSelect(template.id)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 12px',
                        border: 'none',
                        borderLeft: selected
                          ? '3px solid #040273'
                          : '3px solid transparent',
                        background: selected ? '#eef2ff' : 'transparent',
                        cursor: 'pointer',
                        font: 'inherit',
                      }}
                    >
                      <div
                        style={{
                          ...TRUNCATE,
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: '#111827',
                        }}
                      >
                        {template.name}
                      </div>
                      <div
                        style={{ ...TRUNCATE, fontSize: 12, color: '#6b7280' }}
                      >
                        {template.subjectPreview}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplateList;
