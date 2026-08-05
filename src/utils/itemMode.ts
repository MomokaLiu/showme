import type { Item, ItemMode } from "../types/item";
import type { UsageLog } from "../types/usageLog";

export function inferItemMode(item: Partial<Item>, logs: UsageLog[] = []): ItemMode {
  if (item.mode === "regular" || item.mode === "consumable") return item.mode;
  const hasConsumableDates = Boolean(
    item.expireDate ||
      item.finalExpireDate ||
      item.shelfLifeDays ||
      item.openDate ||
      item.afterOpenDays ||
      item.expiryReminderEnabled,
  );
  const hasConsumableState = item.status === "near_expiry" || item.status === "expired";
  const hasConsumableLog = logs.some(
    (log) => log.itemId === item.id && ["consume", "finish", "discard", "open", "restock"].includes(log.actionType),
  );
  return hasConsumableDates || hasConsumableState || hasConsumableLog ? "consumable" : "regular";
}

export function normalizeItemMode(item: Item, logs: UsageLog[] = []): Item {
  return { ...item, mode: inferItemMode(item, logs) };
}
