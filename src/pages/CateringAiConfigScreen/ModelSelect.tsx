import React from 'react';
import { styles } from './styles';

interface ModelSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  /** When set, prepends an "(inherit)" option that maps to '' (used by
   *  per-tool overrides to fall back to the stage default). */
  inheritLabel?: string;
}

/** Labeled <select> for picking a Gemini model. Reused for primary model,
 *  fallback model, and per-tool override fields. */
const ModelSelect: React.FC<ModelSelectProps> = ({
  label,
  value,
  options,
  onChange,
  inheritLabel,
}) => (
  <div>
    <label style={styles.fieldLabel}>{label}</label>
    <select
      style={styles.select}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {inheritLabel !== undefined && <option value="">{inheritLabel}</option>}
      {options.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </select>
  </div>
);

export default ModelSelect;
