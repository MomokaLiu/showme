import type { Category } from "../types/category";
import type { Item } from "../types/item";
import type { UsageLog } from "../types/usageLog";
import { calculateCurrentValue, calculateWasteAmount, getRemainingDays, isLowStock } from "./itemCalculations";
import { getCurrentMonth, isSameMonth } from "./dateUtils";

export function calculateInventoryValue(items: Item[]): number {
  return items.reduce((sum, item) => sum + calculateCurrentValue(item), 0);
}

export function calculateMonthlyPurchaseAmount(items: Item[], month = getCurrentMonth()): number {
  return items
    .filter((item) => isSameMonth(item.purchaseDate, month))
    .reduce((sum, item) => sum + (item.totalPrice ?? 0), 0);
}

export function calculateMonthlyWasteAmount(
  items: Item[],
  logs: UsageLog[],
  month = getCurrentMonth(),
): number {
  return logs
    .filter((log) => log.actionType === "discard" && isSameMonth(log.createdAt, month))
    .reduce((sum, log) => {
      const item = items.find((candidate) => candidate.id === log.itemId);
      if (!item) return sum;
      return sum + calculateWasteAmount(item, Math.abs(log.quantityChange ?? 0));
    }, 0);
}

export function getExpiringItems(items: Item[], days: number): Item[] {
  return items
    .filter((item) => item.status !== "finished" && item.status !== "discarded")
    .filter((item) => {
      const remainingDays = getRemainingDays(item.finalExpireDate);
      return remainingDays !== undefined && remainingDays >= 0 && remainingDays <= days;
    })
    .sort(sortByExpiry);
}

export function getExpiredItems(items: Item[]): Item[] {
  return items
    .filter((item) => item.status !== "finished" && item.status !== "discarded")
    .filter((item) => {
      const remainingDays = getRemainingDays(item.finalExpireDate);
      return remainingDays !== undefined && remainingDays < 0;
    })
    .sort(sortByExpiry);
}

export function getTodayActionItems(items: Item[], limit = 6): Item[] {
  const activeItems = items.filter(
    (item) => item.status !== "finished" && item.status !== "discarded",
  );

  return activeItems
    .map((item) => ({
      item,
      score: getActionScore(item),
    }))
    .filter((entry) => entry.score < 99)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}

export function calculateMonthlyNewItemCount(items: Item[], month = getCurrentMonth()): number {
  return items.filter((item) => isSameMonth(item.createdAt, month)).length;
}

export function getFinishedItemCount(items: Item[]): number {
  return items.filter((item) => item.status === "finished").length;
}

export function getMostExpiryProneCategory(items: Item[], categories: Category[]): string {
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    if (item.status === "expired" || item.status === "discarded") {
      acc[item.categoryId] = (acc[item.categoryId] ?? 0) + 1;
    }
    return acc;
  }, {});

  const [categoryId] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? [];
  return categories.find((category) => category.id === categoryId)?.name ?? "暂无";
}

function sortByExpiry(a: Item, b: Item): number {
  if (!a.finalExpireDate) return 1;
  if (!b.finalExpireDate) return -1;
  return a.finalExpireDate.localeCompare(b.finalExpireDate);
}

function getActionScore(item: Item): number {
  const remainingDays = getRemainingDays(item.finalExpireDate);
  if (remainingDays !== undefined) {
    if (remainingDays < 0) return 0;
    if (remainingDays === 0) return 1;
    if (remainingDays <= 3) return 2;
    if (remainingDays <= 7) return 3;
  }
  if (isLowStock(item)) return 4;
  return 99;
}
