import React from 'react';
import type {
  StageModelConfig,
  ToolOverride,
} from '../../types/pipeline-config.types';
import { styles } from './styles';
import ModelSelect from './ModelSelect';
import ToolOverridesEditor from './ToolOverridesEditor';

export type StageValue = StageModelConfig & {
  toolOverrides?: Record<string, ToolOverride>;
};

interface StageCardProps {
  title: string;
  description: string;
  value: StageValue;
  models: string[];
  /** When provided, the stage supports per-tool overrides (slot_extractor,
   *  pro_cart_fallback) and these are the tool names available. */
  tools?: string[];
  onChange: (next: StageValue) => void;
}

/** One stage's controls: primary model, fallback, temperature, and — for
 *  per-tool stages — the collapsible per-tool override editor. */
const StageCard: React.FC<StageCardProps> = ({
  title,
  description,
  value,
  models,
  tools,
  onChange,
}) => (
  <div style={styles.card}>
    <h3 style={styles.cardTitle}>{title}</h3>
    <p style={styles.cardDesc}>{description}</p>

    <div style={styles.fieldRow}>
      <ModelSelect
        label="Model"
        value={value.model}
        options={models}
        onChange={(model) => onChange({ ...value, model })}
      />
      <ModelSelect
        label="Fallback"
        value={value.fallback}
        options={models}
        onChange={(fallback) => onChange({ ...value, fallback })}
      />
      <div>
        <label style={styles.fieldLabel}>Temperature</label>
        <input
          style={styles.number}
          type="number"
          min={0}
          max={2}
          step={0.1}
          value={value.temperature}
          onChange={(e) =>
            onChange({ ...value, temperature: Number(e.target.value) })
          }
        />
      </div>
    </div>

    {tools ? <ToolOverridesEditor
        overrides={value.toolOverrides ?? {}}
        tools={tools}
        models={models}
        onChange={(toolOverrides) => onChange({ ...value, toolOverrides })}
      /> : null}
  </div>
);

export default StageCard;
