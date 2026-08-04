type DatePickerFieldProps = {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  required?: boolean;
};

export function DatePickerField({ label, value, onChange, required }: DatePickerFieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="date"
        value={value ?? ""}
        onInput={(event) => onChange(event.currentTarget.value)}
        required={required}
      />
    </label>
  );
}
