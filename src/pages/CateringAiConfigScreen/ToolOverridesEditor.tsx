import React, { useState } from 'react';
import type { ToolOverride } from '../../types/pipeline-config.types';
import { styles } from './styles';
import ModelSelect from './ModelSelect';

interface ToolOverridesEditorProps {
  overrides: Record<string, ToolOverride>;
  /** All tool names available for the stage (from the API options). */
  tools: string[];
  models: string[];
  onChange: (next: Record<string, ToolOverride>) => void;
}

const INHERIT = '(inherit stage default)';

/**
 * Edits the per-tool model overrides for a stage. Each override sets any
 * subset of {model, fallback, temperature}; unset fields inherit the stage
 * default. Removing a row deletes the override entirely.
 */
const ToolOverridesEditor: React.FC<ToolOverridesEditorProps> = ({
  overrides,
  tools,
  models,
  onChange,
}) => {
  const overriddenTools = Object.keys(overrides);
  const available = tools.filter((t) => !overriddenTools.includes(t));
  const [toAdd, setToAdd] = useState('');

  const setOverride = (tool: string, next: ToolOverride) => {
    onChange({ ...overrides, [tool]: next });
  };

  const removeOverride = (tool: string) => {
    const copy = { ...overrides };
    delete copy[tool];
    onChange(copy);
  };

  const addOverride = () => {
    const tool = toAdd || available[0];
    if (!tool) return;
    onChange({ ...overrides, [tool]: {} });
    setToAdd('');
  };

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ ...styles.fieldLabel, marginBottom: 8 }}>
        Per-tool overrides
      </div>

      {overriddenTools.length === 0 && (
        <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '0 0 10px' }}>
          No overrides — every tool uses the stage default above.
        </p>
      )}

      {overriddenTools.map((tool) => {
        const ov = overrides[tool];
        return (
          <div
            key={tool}
            style={{
              border: '1px solid #eef0f3',
              borderRadius: 8,
              padding: 12,
              marginBottom: 10,
              background: '#fafbfc',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <code style={{ fontSize: '0.82rem', color: '#051661', fontWeight: 700 }}>
                {tool}
              </code>
              <button style={styles.linkButton} onClick={() => removeOverride(tool)}>
                Remove
              </button>
            </div>
            <div style={styles.fieldRow}>
              <ModelSelect
                label="Model"
                value={ov.model ?? ''}
                options={models}
                inheritLabel={INHERIT}
                onChange={(v) =>
                  setOverride(tool, { ...ov, model: v || undefined })
                }
              />
              <ModelSelect
                label="Fallback"
                value={ov.fallback ?? ''}
                options={models}
                inheritLabel={INHERIT}
                onChange={(v) =>
                  setOverride(tool, { ...ov, fallback: v || undefined })
                }
              />
              <div>
                <label style={styles.fieldLabel}>Temperature</label>
                <input
                  style={styles.number}
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  placeholder="inherit"
                  value={ov.temperature ?? ''}
                  onChange={(e) =>
                    setOverride(tool, {
                      ...ov,
                      temperature:
                        e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          </div>
        );
      })}

      {available.length > 0 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
          <select
            style={styles.select}
            value={toAdd}
            onChange={(e) => setToAdd(e.target.value)}
          >
            <option value="">Add override for…</option>
            {available.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button style={styles.secondaryButton} onClick={addOverride} disabled={!toAdd}>
            Add
          </button>
        </div>
      )}
    </div>
  );
};

export default ToolOverridesEditor;
