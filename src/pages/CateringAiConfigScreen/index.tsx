import React, { useEffect, useMemo, useState } from 'react';
import pipelineConfigService from '../../services/pipeline-config.service';
import type {
  PerToolStageConfig,
  PipelineConfig,
  PipelineConfigOptions,
  PipelineConfigPatch,
  StageName,
  StagePatch,
  ToolOverridePatch,
} from '../../types/pipeline-config.types';
import { styles } from './styles';
import StageCard, { type StageValue } from './StageCard';

const STAGE_META: Array<{ key: StageName; label: string; description: string }> = [
  {
    key: 'intent_classifier',
    label: 'Intent Classifier',
    description: 'Classifies each user message into a set of actions. Runs once per turn.',
  },
  {
    key: 'slot_extractor',
    label: 'Slot Extractor',
    description:
      'Extracts tool arguments from the message. Runs once per tool — supports per-tool overrides.',
  },
  {
    key: 'qa_composer',
    label: 'Q&A Composer',
    description:
      'Composes a one-line answer from restaurant facts (e.g. ask_restaurant results). Runs only on Q&A turns; a peer to the reply polisher.',
  },
  {
    key: 'pro_disambiguator',
    label: 'Pro Disambiguator',
    description:
      'Resolves ambiguous turns into concrete actions. Runs only when the classifier flags ambiguity.',
  },
  {
    key: 'pro_cart_fallback',
    label: 'Pro Cart Fallback',
    description:
      'Retries cart edits that failed validation. Runs only on a cart-edit miss — supports per-tool overrides.',
  },
  {
    key: 'reply_polisher',
    label: 'Reply Polisher',
    description: 'Rewrites the final draft reply into natural prose. Runs once per turn.',
  },
];

/** Build the PATCH body: the full edited config, plus explicit `null` for any
 *  per-tool override that was removed since load (the backend merge only
 *  deletes an override when it receives null). */
function buildPatch(
  original: PipelineConfig,
  edited: PipelineConfig,
  perToolStages: StageName[],
): PipelineConfigPatch {
  const patch = JSON.parse(JSON.stringify(edited)) as PipelineConfigPatch;
  for (const stage of perToolStages) {
    const orig = (original[stage] as PerToolStageConfig).toolOverrides ?? {};
    const cur = (edited[stage] as PerToolStageConfig).toolOverrides ?? {};
    const merged: Record<string, ToolOverridePatch> = { ...cur };
    for (const tool of Object.keys(orig)) {
      if (!(tool in cur)) merged[tool] = null;
    }
    (patch[stage] as StagePatch).toolOverrides = merged;
  }
  return patch;
}

const CateringAiConfigScreen: React.FC = () => {
  const [options, setOptions] = useState<PipelineConfigOptions | null>(null);
  const [saved, setSaved] = useState<PipelineConfig | null>(null);
  const [draft, setDraft] = useState<PipelineConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    pipelineConfigService
      .get()
      .then((res) => {
        if (!active) return;
        setOptions(res.options);
        setSaved(res.config);
        setDraft(res.config);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to load config.',
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

  const updateStage = (key: StageName, next: StageValue) => {
    setDraft((prev) => (prev ? { ...prev, [key]: next } : prev));
  };

  const handleSave = async () => {
    if (!saved || !draft || !options) return;
    setSaving(true);
    setMessage(null);
    try {
      const patch = buildPatch(saved, draft, options.perToolStages);
      const res = await pipelineConfigService.update(patch);
      setSaved(res.config);
      setDraft(res.config);
      setMessage({ type: 'success', text: 'Saved. Changes take effect on the next message.' });
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save config.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDraft(saved);
    setMessage(null);
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#051661', marginBottom: 6 }}>
        Catering AI — Model Config
      </h1>
      <p style={{ fontSize: '0.9rem', color: '#4b5563', marginBottom: 20, maxWidth: 760 }}>
        Per-stage model, fallback, and temperature for the pipeline_v1 chat flow.
        Changes are saved to the backend and apply on the next message — no
        deploy needed. Leave everything as-is to keep the current defaults.
      </p>

      {loading ? <p style={{ color: '#6b7280' }}>Loading…</p> : null}

      {!loading && draft && options ? <>
          <div
            style={{
              position: 'sticky',
              top: 0,
              background: '#f5f7fa',
              padding: '8px 0 14px',
              zIndex: 1,
              display: 'flex',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <button
              style={{
                ...styles.primaryButton,
                background: !dirty || saving ? '#9ca3af' : styles.primaryButton.background,
                cursor: !dirty || saving ? 'not-allowed' : 'pointer',
              }}
              onClick={handleSave}
              disabled={!dirty || saving}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {dirty && !saving ? <button style={styles.secondaryButton} onClick={handleReset}>
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

          {STAGE_META.map((meta) => (
            <StageCard
              key={meta.key}
              title={meta.label}
              description={meta.description}
              value={draft[meta.key]}
              models={options.models}
              tools={options.perToolStages.includes(meta.key) ? options.tools : undefined}
              onChange={(next) => updateStage(meta.key, next)}
            />
          ))}
        </> : null}

      {!loading && !draft && message ? <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: '#fee2e2',
            color: '#991b1b',
            fontSize: '0.9rem',
            maxWidth: 760,
          }}
        >
          {message.text}
        </div> : null}
    </div>
  );
};

export default CateringAiConfigScreen;
