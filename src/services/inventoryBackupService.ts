import { IndexedDbRepository } from "../repositories/indexedDbRepository";
import type { InventorySyncData, InventorySyncDocument } from "../types/sync";

export type InventoryBackupReason = "manual" | "import" | "webdav-restore";

export type InventoryBackup = {
  id: string;
  createdAt: string;
  reason: InventoryBackupReason;
  data: InventorySyncData;
};

const backupRepository = new IndexedDbRepository<InventoryBackup>("backups");
const MAX_BACKUPS = 3;

export async function createInventoryBackup(
  data: InventorySyncData,
  reason: InventoryBackupReason,
): Promise<InventoryBackup> {
  const createdAt = new Date().toISOString();
  const backup: InventoryBackup = {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-backup`,
    createdAt,
    reason,
    data: structuredClone(data),
  };
  const current = await backupRepository.getAll();
  const next = [backup, ...current]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, MAX_BACKUPS);
  await backupRepository.replaceAll(next);
  return backup;
}

export async function listInventoryBackups(): Promise<InventoryBackup[]> {
  return (await backupRepository.getAll()).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function parseInventoryImport(raw: string): InventorySyncData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("所选文件不是有效的 JSON。 ");
  }
  const candidate = parsed as Partial<InventorySyncDocument & InventorySyncData>;
  const data = candidate.app === "buwangwu" && candidate.data ? candidate.data : candidate;
  if (
    !data ||
    !Array.isArray(data.items) ||
    !Array.isArray(data.logs) ||
    !Array.isArray(data.categories) ||
    !Array.isArray(data.locations) ||
    !Array.isArray(data.shoppingItems)
  ) {
    throw new Error("备份文件缺少库存、日志、分类、位置或购物清单数据。");
  }
  return data as InventorySyncData;
}

export function downloadInventoryData(data: InventorySyncData): void {
  const document: InventorySyncDocument = {
    app: "buwangwu",
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    data,
  };
  const blob = new Blob([JSON.stringify(document, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = `buwangwu-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
