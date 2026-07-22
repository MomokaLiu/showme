type StatCardProps = {
  label: string;
  value: string | number;
  tone?: "green" | "orange" | "red" | "blue" | "gray";
  hint?: string;
};

export function StatCard({ label, value, tone = "blue", hint }: StatCardProps) {
  return (
    <section className={`stat-card stat-card--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </section>
  );
}
