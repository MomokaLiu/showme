const STORAGE_KEY = "buwangwu.recentLocations";
const MAX_RECENT_LOCATIONS = 3;

export function loadRecentLocationIds(storage: Pick<Storage, "getItem"> = window.localStorage): string[] {
  try {
    const value = JSON.parse(storage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string").slice(0, MAX_RECENT_LOCATIONS) : [];
  } catch {
    return [];
  }
}

export function rememberLocationId(id: string, storage: Pick<Storage, "setItem"> = window.localStorage): void {
  if (!id) return;
  const next = [id, ...loadRecentLocationIds()].filter((entry, index, values) => values.indexOf(entry) === index);
  storage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, MAX_RECENT_LOCATIONS)));
}
