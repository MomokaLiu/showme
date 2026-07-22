type CategoryBadgeProps = {
  label: string;
};

export function CategoryBadge({ label }: CategoryBadgeProps) {
  return <span className="category-badge">{label}</span>;
}
