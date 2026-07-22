import type { ItemStatus } from "../types/item";
import { statusText } from "../utils/formatters";

type StatusBadgeProps = {
  status: ItemStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${status}`}>{statusText[status]}</span>;
}
