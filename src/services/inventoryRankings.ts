import type { Item } from "../types/item";
import type { UsageLog } from "../types/usageLog";
import { diffInCalendarDays, toDateInputValue } from "../utils/dateUtils";

export type RankingEntry = {
  item: Item;
  value: number;
};

export function getMostExpensiveRanking(items: Item[], limit = 10): RankingEntry[] {
  return rank(
    items
      .filter((item) => item.totalPrice !== undefined && item.totalPrice !== null)
      .map((item) => ({ item, value: item.totalPrice as number })),
    limit,
  );
}

export function getHighestDailyCostRanking(items: Item[], limit = 10): RankingEntry[] {
  return rank(
    items
      .filter((item) => item.actualDailyCost !== undefined && item.actualDailyCost !== null)
      .map((item) => ({ item, value: item.actualDailyCost as number })),
    limit,
  );
}

export function getMostFoundRanking(items: Item[], limit = 10): RankingEntry[] {
  return items
    .filter((item) => (item.findCount ?? 0) > 0)
    .map((item) => ({ item, value: item.findCount ?? 0 }))
    .sort((a, b) =>
      b.value - a.value ||
      (b.item.lastFoundAt ?? "").localeCompare(a.item.lastFoundAt ?? "") ||
      a.item.name.localeCompare(b.item.name, "zh-CN"),
    )
    .slice(0, limit);
}

export function getLongestUsedRanking(
  items: Item[],
  asOfDate = toDateInputValue(),
  limit = 10,
): RankingEntry[] {
  return rank(
    items.flatMap((item) => {
      const days = item.purchaseDate ? diffInCalendarDays(asOfDate, item.purchaseDate) : undefined;
      return days !== undefined && days > 0 ? [{ item, value: days }] : [];
    }),
    limit,
  );
}

export function getIdleRanking(
  items: Item[],
  logs: UsageLog[],
  asOfDate = toDateInputValue(),
  minimumOwnedDays = 30,
  limit = 10,
): RankingEntry[] {
  const lastUseByItem = new Map<string, string>();
  for (const log of logs) {
    if (log.actionType !== "consume" && log.actionType !== "open") continue;
    const current = lastUseByItem.get(log.itemId);
    if (!current || log.createdAt > current) lastUseByItem.set(log.itemId, log.createdAt);
  }

  return rank(
    items.flatMap((item) => {
      if (!item.purchaseDate || item.status === "finished" || item.status === "discarded") return [];
      const ownedDays = diffInCalendarDays(asOfDate, item.purchaseDate);
      if (ownedDays === undefined || ownedDays < minimumOwnedDays) return [];
      const lastUseDate = lastUseByItem.get(item.id)?.slice(0, 10) ?? item.purchaseDate;
      const idleDays = diffInCalendarDays(asOfDate, lastUseDate);
      return idleDays !== undefined && idleDays >= minimumOwnedDays ? [{ item, value: idleDays }] : [];
    }),
    limit,
  );
}

function rank(entries: RankingEntry[], limit: number): RankingEntry[] {
  return entries.sort((a, b) => b.value - a.value || a.item.name.localeCompare(b.item.name, "zh-CN")).slice(0, limit);
}
