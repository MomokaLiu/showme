import type { CSSProperties } from "react";

type GaugeTone = "green" | "orange" | "red" | "blue";

type GaugeCardProps = {
  label: string;
  value: number;
  suffix?: string;
  helper?: string;
  tone?: GaugeTone;
};

export function GaugeCard({ label, value, suffix = "%", helper, tone = "green" }: GaugeCardProps) {
  const normalizedValue = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <section className={`gauge-card gauge-card--${tone}`}>
      <div
        className="gauge-card__meter"
        style={{ "--gauge-value": `${normalizedValue}%` } as CSSProperties}
        aria-label={`${label} ${normalizedValue}${suffix}`}
      >
        <div className="gauge-card__value">
          <strong>
            {normalizedValue}
            {suffix}
          </strong>
          <span>{label}</span>
        </div>
      </div>
      {helper ? <p>{helper}</p> : null}
    </section>
  );
}
