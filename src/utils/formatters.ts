import type { ItemStatus } from "../types/item";

export const statusText: Record<ItemStatus, string> = {
  normal: "正常",
  near_expiry: "临期",
  expired: "已过期",
  finished: "已用完",
  discarded: "已丢弃",
  transferred: "已转移",
  long_term: "长期",
};

export const actionText = {
  purchase: "购入",
  consume: "消耗",
  finish: "用完",
  discard: "丢弃",
  open: "开封",
  edit: "编辑",
  restock: "补充",
} as const;

export function formatCurrency(value?: number): string {
  if (value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value?: number, maximumFractionDigits = 2): string {
  if (value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits }).format(value);
}

export function formatRemainingDays(days?: number): string {
  if (days === undefined) return "无期限";
  if (days < 0) return `已过期 ${Math.abs(days)} 天`;
  if (days === 0) return "今天到期";
  return `剩 ${days} 天`;
}
