import type { Item } from "../types/item";
import { toDateInputValue } from "../utils/dateUtils";
import { calculateActualDailyCost } from "./dailyCostCalculator";
import type { DailyCostRefreshStorage } from "./dailyCostRefreshStorage";

export const DAILY_COST_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

type DailyCostRepository = {
  replaceAll: (items: Item[]) => Promise<void>;
};

type DailyCostRefreshOptions = {
  items: Item[];
  repository: DailyCostRepository;
  storage: DailyCostRefreshStorage;
  now?: Date;
};

export type DailyCostRefreshResult = {
  refreshed: boolean;
  items: Item[];
  refreshedAt?: string;
};

export function shouldRefreshDailyCosts(
  lastRefreshTime: string | undefined,
  now = new Date(),
): boolean {
  if (!lastRefreshTime) return true;
  const lastRefreshTimestamp = Date.parse(lastRefreshTime);
  if (!Number.isFinite(lastRefreshTimestamp)) return true;
  return now.getTime() - lastRefreshTimestamp >= DAILY_COST_REFRESH_INTERVAL_MS;
}

export async function refreshDailyCostsIfNeeded({
  items,
  repository,
  storage,
  now = new Date(),
}: DailyCostRefreshOptions): Promise<DailyCostRefreshResult> {
  if (!items.length || !shouldRefreshDailyCosts(storage.getLastRefreshTime(), now)) {
    return { refreshed: false, items };
  }

  const refreshedAt = now.toISOString();
  const asOfDate = toDateInputValue(now);
  const refreshedItems = items.map((item) => ({
    ...item,
    actualDailyCost: calculateActualDailyCost(item, asOfDate),
  }));

  await repository.replaceAll(refreshedItems);
  storage.setLastRefreshTime(refreshedAt);
  return { refreshed: true, items: refreshedItems, refreshedAt };
}
