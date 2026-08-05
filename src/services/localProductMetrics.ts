export type LocalProductEvent =
  | "app_opened"
  | "item_created"
  | "item_created_with_location"
  | "item_found"
  | "item_moved"
  | "search_no_result";

type LocalProductMetrics = Partial<Record<LocalProductEvent, number>> & {
  lastUpdatedAt?: string;
};

const STORAGE_KEY = "buwangwu.localProductMetrics";

export function loadLocalProductMetrics(storage: Storage | undefined = getStorage()): LocalProductMetrics {
  if (!storage) return {};
  try {
    const value = JSON.parse(storage.getItem(STORAGE_KEY) ?? "{}") as LocalProductMetrics;
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

export function recordLocalProductEvent(
  event: LocalProductEvent,
  storage: Storage | undefined = getStorage(),
): void {
  if (!storage) return;
  const current = loadLocalProductMetrics(storage);
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...current, [event]: (current[event] ?? 0) + 1, lastUpdatedAt: new Date().toISOString() }),
  );
}

function getStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}
