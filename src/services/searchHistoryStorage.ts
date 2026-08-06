const STORAGE_KEY = "buwangwu.searchHistory";
const MAX_HISTORY_ITEMS = 10;

type SearchHistoryStorage = Pick<Storage, "getItem" | "setItem">;

export function loadSearchHistory(storage: SearchHistoryStorage | undefined = getStorage()): string[] {
  if (!storage) return [];

  try {
    const value = JSON.parse(storage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    if (!Array.isArray(value)) return [];
    return value
      .filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim()))
      .map((entry) => entry.trim())
      .slice(0, MAX_HISTORY_ITEMS);
  } catch {
    return [];
  }
}

export function rememberSearch(
  query: string,
  storage: SearchHistoryStorage | undefined = getStorage(),
): string[] {
  const normalizedQuery = query.trim().replace(/\s+/g, " ");
  if (!normalizedQuery) return loadSearchHistory(storage);

  const nextHistory = [
    normalizedQuery,
    ...loadSearchHistory(storage).filter(
      (entry) => entry.toLocaleLowerCase("zh-CN") !== normalizedQuery.toLocaleLowerCase("zh-CN"),
    ),
  ].slice(0, MAX_HISTORY_ITEMS);

  storage?.setItem(STORAGE_KEY, JSON.stringify(nextHistory));
  return nextHistory;
}

export function clearSearchHistory(storage: SearchHistoryStorage | undefined = getStorage()): void {
  storage?.setItem(STORAGE_KEY, "[]");
}

function getStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}
