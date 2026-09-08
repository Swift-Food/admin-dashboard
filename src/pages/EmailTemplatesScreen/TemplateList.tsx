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

/**
 * A tab is the section heading without its "To " preposition — "To customers"
 * becomes "Customers" — so a new audience still needs only the one
 * AUDIENCE_LABEL entry. Anything that does not start with "To " is used as-is.
 */
const toTabLabel = (sectionLabel: string): string => {
  const bare = sectionLabel.startsWith('To ')
    ? sectionLabel.slice(3)
    : sectionLabel;
  return bare.charAt(0).toUpperCase() + bare.slice(1);
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

const countTemplates = (section: Section): number =>
  section.groups.reduce((sum, group) => sum + group.templates.length, 0);

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

const TAB_STRIP: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 4,
  padding: '8px 8px 0',
  borderBottom: '1px solid #e5e7eb',
};

const TemplateList: React.FC<TemplateListProps> = ({
  templates,
  selectedId,
  onSelect,
}) => {
  const [filter, setFilter] = useState('');

  // Every audience present in the data, in AUDIENCE_ORDER, with its full
  // contents. Drives the tab strip and the unfiltered single-audience view.
  const allSections = useMemo(() => buildSections(templates), [templates]);

  const selectedAudience = useMemo(
    () => templates.find((t) => t.id === selectedId)?.audience ?? null,
    [templates, selectedId],
  );

  const [activeAudience, setActiveAudience] = useState<EmailAudience | null>(
    null,
  );
  // The tab follows the selection: whenever `selectedId` changes the active tab
  // moves to that template's audience. Adjusting state during render rather
  // than in an effect keeps the two in step within a single commit, so the list
  // never paints the wrong tab first.
  //
  // `syncedId` is seeded `null`, never from `selectedId`: this list only mounts
  // once the parent has already auto-selected a template, so seeding it from
  // the prop would make the branch a no-op on mount and leave the initial tab
  // to the fallback below - i.e. the first audience in AUDIENCE_ORDER rather
  // than the audience of the template actually selected. Seeding null costs one
  // extra pre-commit render pass and makes the initial tab genuinely derived
  // from the selection.
  const [syncedId, setSyncedId] = useState<string | null>(null);
  if (selectedId !== syncedId) {
    setSyncedId(selectedId);
    if (selectedAudience && selectedAudience !== activeAudience) {
      setActiveAudience(selectedAudience);
    }
  }

  // Guard against a stored audience that the latest data no longer contains.
  const currentAudience =
    activeAudience && allSections.some((s) => s.audience === activeAudience)
      ? activeAudience
      : (allSections[0]?.audience ?? null);

  const needle = filter.trim().toLowerCase();
  const filtering = needle.length > 0;

  // The filter deliberately ignores the active tab: a match in another audience
  // must stay reachable, so results are grouped by audience and labelled.
  const matchSections = useMemo(() => {
    if (!needle) return null;
    return buildSections(
      templates.filter((t) =>
        `${t.name} ${t.description} ${t.subjectPreview}`
          .toLowerCase()
          .includes(needle),
      ),
    );
  }, [templates, needle]);

  // Per-tab counts: total contents normally, matching contents while
  // filtering. A zero-match tab is dimmed but kept, so the strip does not
  // reflow while the user types.
  const countByAudience = useMemo(() => {
    const source = matchSections ?? allSections;
    const counts = new Map<EmailAudience, number>();
    for (const section of source) {
      counts.set(section.audience, countTemplates(section));
    }
    return counts;
  }, [matchSections, allSections]);

  const visibleSections = matchSections
    ? matchSections
    : allSections.filter((s) => s.audience === currentAudience);

  const matchCount = (matchSections ?? allSections).reduce(
    (total, section) => total + countTemplates(section),
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
      <div style={TAB_STRIP} role="tablist" aria-label="Audience">
        {allSections.map((section) => {
          const active = section.audience === currentAudience;
          const count = countByAudience.get(section.audience) ?? 0;
          return (
            <button
              key={section.audience}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveAudience(section.audience)}
              style={{
                padding: '8px 10px',
                border: 'none',
                borderBottom: active
                  ? '2px solid #040273'
                  : '2px solid transparent',
                // Sit the accent underline on top of TAB_STRIP's grey rule
                // instead of stacking a second rule beneath it.
                marginBottom: -1,
                borderTopLeftRadius: 6,
                borderTopRightRadius: 6,
                background: active ? '#eef2ff' : 'transparent',
                color: active ? '#040273' : '#6b7280',
                opacity: count === 0 ? 0.5 : 1,
                fontSize: '0.8rem',
                fontWeight: 700,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              {toTabLabel(section.label)}{' '}
              <span style={{ fontWeight: 400 }}>({count})</span>
            </button>
          );
        })}
      </div>

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
          {filtering
            ? `${matchCount} of ${templates.length} templates match, across all audiences`
            : `${matchCount} of ${templates.length} templates`}
        </div>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {matchCount === 0 ? (
          <p style={{ padding: 16, color: '#6b7280', fontSize: '0.85rem' }}>
            No templates match “{filter}”.
          </p>
        ) : null}

        {visibleSections.map((section) => (
          <div key={section.audience}>
            {filtering ? (
              <h3 style={SECTION_HEADING}>{section.label}</h3>
            ) : null}
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
