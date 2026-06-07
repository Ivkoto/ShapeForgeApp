interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
}

export function Field({ label, value, onChange, suffix }: FieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="field-control">
        <input value={value} onChange={(e) => onChange(e.target.value)} />
        {suffix ? <em>{suffix}</em> : null}
      </div>
    </label>
  );
}
