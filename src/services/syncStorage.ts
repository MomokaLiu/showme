import type { InventorySyncData, LocalSyncMetadata, WebDavConfig } from "../types/sync";

const CONFIG_KEY = "buwangwu.webdavConfig";
const METADATA_KEY = "buwangwu.syncMetadata";

const EMPTY_CONFIG: WebDavConfig = {
  url: "",
  username: "",
  password: "",
};

export function loadWebDavConfig(): WebDavConfig {
  return readJson<WebDavConfig>(CONFIG_KEY) ?? EMPTY_CONFIG;
}

export function saveWebDavConfig(config: WebDavConfig): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    CONFIG_KEY,
    JSON.stringify({
      url: config.url.trim(),
      username: config.username.trim(),
      password: config.password,
    }),
  );
}

export function loadSyncMetadata(): LocalSyncMetadata {
  return readJson<LocalSyncMetadata>(METADATA_KEY) ?? {};
}

export function markLocalDataChanged(updatedAt = new Date().toISOString()): void {
  const current = loadSyncMetadata();
  saveSyncMetadata({ ...current, localUpdatedAt: updatedAt });
}

export function saveSyncMetadata(metadata: LocalSyncMetadata): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
}

export function getLocalDataUpdatedAt(data: InventorySyncData): string {
  const metadata = loadSyncMetadata();
  const candidates = [
    metadata.localUpdatedAt,
    ...data.items.flatMap((item) => [item.updatedAt, item.createdAt]),
    ...data.logs.map((log) => log.createdAt),
    ...data.shoppingItems.flatMap((item) => [item.updatedAt, item.createdAt]),
  ].filter((value): value is string => Boolean(value && Number.isFinite(Date.parse(value))));

  if (!candidates.length) return new Date(0).toISOString();
  return candidates.sort((left, right) => Date.parse(right) - Date.parse(left))[0];
}

function readJson<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.localStorage.getItem(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}
