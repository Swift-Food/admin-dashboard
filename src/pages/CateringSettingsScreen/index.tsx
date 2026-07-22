import React, { useEffect, useMemo, useState } from 'react';
import cateringSettingsService from '../../services/catering-settings.service';
import type { CateringSettings } from '../../services/catering-settings.service';

const CARD: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
  maxWidth: 620,
};

const CateringSettingsScreen: React.FC = () => {
  const [saved, setSaved] = useState<CateringSettings | null>(null);
  const [draft, setDraft] = useState<CateringSettings | null>(null);
  const [defaults, setDefaults] = useState<CateringSettings | null>(null);
  const [limits, setLimits] = useState<{ min: number; max: number }>({
    min: 0,
    max: 600,
  });
  const [autoBookLimits, setAutoBookLimits] = useState<{
    min: number;
    max: number;
  }>({
    min: 1,
    max: 72,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    cateringSettingsService
      .get()
      .then((res) => {
        if (!active) return;
        setSaved(res.settings);
        setDraft(res.settings);
        setDefaults(res.defaults);
        setLimits(res.limits.collectionLeadMinutes);
        setAutoBookLimits(res.limits.autoBookLeadHours);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to load settings.',
        });
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const dirty = useMemo(
    () => JSON.stringify(saved) !== JSON.stringify(draft),
    [saved, draft],
  );

  const leadValid =
    draft != null &&
    Number.isFinite(draft.collectionLeadMinutes) &&
    draft.collectionLeadMinutes >= limits.min &&
    draft.collectionLeadMinutes <= limits.max;

  const autoBookLeadHoursValid =
    draft != null &&
    Number.isFinite(draft.autoBookLeadHours) &&
    draft.autoBookLeadHours >= autoBookLimits.min &&
    draft.autoBookLeadHours <= autoBookLimits.max;

  const handleSave = async () => {
    if (!draft || !leadValid || !autoBookLeadHoursValid) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await cateringSettingsService.update({
        collectionLeadMinutes: Math.round(draft.collectionLeadMinutes),
        autoBookCourier: draft.autoBookCourier,
        autoBookLeadHours: Math.round(draft.autoBookLeadHours),
      });
      setSaved(res.settings);
      setDraft(res.settings);
      setMessage({
        type: 'success',
        text: 'Saved. Applies to new catering orders and edits immediately.',
      });
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save settings.',
      });
    } finally {
      setSaving(false);
    }
  };

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
        Catering Settings
      </h1>
      <p
        style={{
          fontSize: '0.9rem',
          color: '#4b5563',
          marginBottom: 20,
          maxWidth: 620,
        }}
      >
        Operational settings for catering orders. Changes save to the backend and
        apply immediately — no deploy needed.
      </p>

      {loading ? <p style={{ color: '#6b7280' }}>Loading…</p> : null}

      {!loading && draft ? <div style={CARD}>
          <h2
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#051661',
              margin: 0,
            }}
          >
            Collection lead time
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '4px 0 14px' }}>
            How many minutes before the event start time the driver collects the
            food from the restaurant (collection time = event time − this value).
            {defaults
              ? ` Default is ${defaults.collectionLeadMinutes} min.`
              : ''}
          </p>

          <label
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#4b5563',
              marginBottom: 4,
            }}
          >
            Minutes before event
          </label>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input
              type="number"
              min={limits.min}
              max={limits.max}
              step={5}
              value={
                Number.isFinite(draft.collectionLeadMinutes)
                  ? draft.collectionLeadMinutes
                  : ''
              }
              onChange={(e) =>
                setDraft({
                  ...draft,
                  collectionLeadMinutes:
                    e.target.value === '' ? NaN : Number(e.target.value),
                })
              }
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                border: `1px solid ${leadValid ? '#d1d5db' : '#dc2626'}`,
                fontSize: '0.9rem',
                width: 120,
              }}
            />
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              minutes ({limits.min}–{limits.max})
            </span>
          </div>

          <div
            style={{ marginTop: 24, display: 'flex', gap: 12, alignItems: 'center' }}
          >
            <input
              type="checkbox"
              id="autoBookCourier"
              checked={draft.autoBookCourier}
              onChange={(e) =>
                setDraft({ ...draft, autoBookCourier: e.target.checked })
              }
            />
            <label
              htmlFor="autoBookCourier"
              style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}
            >
              Auto-book courier (Pedivan)
            </label>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '4px 0 14px' }}>
            When on, sessions are booked automatically N hours before collection.
            Leave OFF for manual booking from Catering Sessions.
          </p>

          <label
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#4b5563',
              marginBottom: 4,
            }}
          >
            Auto-book lead (hours)
          </label>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input
              type="number"
              min={autoBookLimits.min}
              max={autoBookLimits.max}
              step={1}
              disabled={!draft.autoBookCourier}
              value={
                Number.isFinite(draft.autoBookLeadHours)
                  ? draft.autoBookLeadHours
                  : ''
              }
              onChange={(e) =>
                setDraft({
                  ...draft,
                  autoBookLeadHours:
                    e.target.value === '' ? NaN : Number(e.target.value),
                })
              }
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                border: `1px solid ${
                  autoBookLeadHoursValid ? '#d1d5db' : '#dc2626'
                }`,
                fontSize: '0.9rem',
                width: 120,
                background: draft.autoBookCourier ? '#fff' : '#e5e7eb',
                color: draft.autoBookCourier ? undefined : '#9ca3af',
              }}
            />
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              hours ({autoBookLimits.min}–{autoBookLimits.max})
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              marginTop: 18,
            }}
          >
            <button
              onClick={handleSave}
              disabled={!dirty || !leadValid || !autoBookLeadHoursValid || saving}
              style={{
                padding: '10px 18px',
                background:
                  !dirty || !leadValid || !autoBookLeadHoursValid || saving
                    ? '#9ca3af'
                    : '#051661',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor:
                  !dirty || !leadValid || !autoBookLeadHoursValid || saving
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {dirty && !saving ? <button
                onClick={() => {
                  setDraft(saved);
                  setMessage(null);
                }}
                style={{
                  padding: '6px 12px',
                  background: '#fff',
                  color: '#051661',
                  border: '1px solid #051661',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Discard
              </button> : null}
            {message ? <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: message.type === 'success' ? '#166534' : '#991b1b',
                }}
              >
                {message.text}
              </span> : null}
          </div>
        </div> : null}

      {!loading && !draft && message ? <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: '#fee2e2',
            color: '#991b1b',
            fontSize: '0.9rem',
            maxWidth: 620,
          }}
        >
          {message.text}
        </div> : null}
    </div>
  );
};

export default CateringSettingsScreen;
