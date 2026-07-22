type NumberInputFieldProps = {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
  min?: number;
  step?: number;
  required?: boolean;
};

export function NumberInputField({
  label,
  value,
  onChange,
  min,
  step = 1,
  required,
}: NumberInputFieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        step={step}
        value={value ?? ""}
        onChange={(event) => {
          const nextValue = event.target.value;
          onChange(nextValue === "" ? undefined : Number(nextValue));
        }}
        required={required}
      />
    </label>
  );
}
