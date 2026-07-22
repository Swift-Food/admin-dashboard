import React from "react";
import "./ColorField.css";

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  hint?: string;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const ColorField: React.FC<ColorFieldProps> = ({ label, value, onChange, hint }) => {
  const safeValue = HEX_RE.test(value) ? value : "#fa43ad";
  return (
    <div className="ps-form-group">
      <label className="ps-form-label">{label}</label>
      <div className="color-field-row">
        <input
          type="color"
          className="color-field-swatch"
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          className="ps-form-input color-field-hex"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#fa43ad"
          maxLength={7}
        />
      </div>
      {hint ? <p className="ps-form-hint">{hint}</p> : null}
    </div>
  );
};

export default ColorField;
