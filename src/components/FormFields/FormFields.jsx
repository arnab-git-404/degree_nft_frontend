import "./FormFields.css";

const COLOR_PRESETS = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6"];

// Colour for a create form. value "" = automatic: the first swatch shows the generated colour (autoColor)
// and the form sends no colour, so the server generates the same one. Any other value is the user's pick.
export function ColorField({ value, autoColor, onChange, hint = "Automatic picks a colour for you; choose another if you prefer." }) {
  const shown = value || autoColor;
  return (
    <div className="space-y-1.5">
      <span className="field-label block">Colour</span>
      <div className="swatches" role="radiogroup" aria-label="Colour">
        <button
          type="button"
          role="radio"
          aria-checked={!value}
          className={`swatch swatch-auto ${!value ? "is-on" : ""}`}
          style={{ background: autoColor }}
          title="Automatic"
          onClick={() => onChange("")}
        >
          Auto
        </button>
        {COLOR_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            role="radio"
            aria-checked={value === preset}
            aria-label={preset}
            className={`swatch ${value === preset ? "is-on" : ""}`}
            style={{ background: preset }}
            onClick={() => onChange(preset)}
          />
        ))}
        <label className="swatch swatch-custom" title="Custom colour">
          <input type="color" value={shown} onChange={(event) => onChange(event.target.value)} aria-label="Custom colour" />
        </label>
      </div>
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

// Selectable cards instead of a plain dropdown. choices: [{ value, label, hint, tone: "success" | "info" | "neutral" }].
export function StatusCards({ label = "Status", choices, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <span className="field-label block">{label}</span>
      <div className="status-cards" role="radiogroup" aria-label={label} style={{ gridTemplateColumns: `repeat(${choices.length}, 1fr)` }}>
        {choices.map((choice) => (
          <button
            key={choice.value}
            type="button"
            role="radio"
            aria-checked={value === choice.value}
            className={`status-card ${value === choice.value ? `is-on is-${choice.tone}` : ""}`}
            onClick={() => onChange(choice.value)}
          >
            <b>{choice.label}</b>
            <span>{choice.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// "Preview" strip at the bottom of a create form: icon tile in the record's colour, title, extra badge.
export function FormPreview({ icon: Icon, color, title, children }) {
  return (
    <div className="form-preview">
      <span className="form-preview__tile" style={{ background: color }}>
        <Icon className="h-4 w-4" />
      </span>
      <strong>{title}</strong>
      {children}
    </div>
  );
}
