import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  createInventoryBackup,
  downloadInventoryData,
  listInventoryBackups,
  parseInventoryImport,
  type InventoryBackup,
} from "../services/inventoryBackupService";
import { useInventoryStore } from "../store/itemStore";

export function DataSafetyCard() {
  const { items, logs, categories, locations, shoppingItems, restoreInventoryData } = useInventoryStore();
  const [backups, setBackups] = useState<InventoryBackup[]>([]);
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const data = { items, logs, categories, locations, shoppingItems };

  useEffect(() => {
    void refreshBackups();
  }, []);

  async function refreshBackups() {
    setBackups(await listInventoryBackups());
  }

  async function createManualBackup() {
    await createInventoryBackup(data, "manual");
    setMessage("已在本机保存快照。");
    await refreshBackups();
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      const imported = parseInventoryImport(await file.text());
      const summary = `${imported.items.length} 件物品、${imported.shoppingItems.length} 个购物项`;
      if (!window.confirm(`文件包含 ${summary}。恢复前会自动备份当前数据，是否继续？`)) return;
      await restoreInventoryData(imported, "import");
      setMessage(`导入完成：${summary}。`);
      await refreshBackups();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "导入失败。");
    }
  }

  async function restoreBackup(backup: InventoryBackup) {
    if (!window.confirm(`将恢复 ${new Date(backup.createdAt).toLocaleString("zh-CN")} 的本机快照，是否继续？`)) return;
    await restoreInventoryData(backup.data, "manual");
    setMessage("本机快照已恢复。");
    await refreshBackups();
  }

  return (
    <div className="data-safety-card">
      <p>数据默认保存在当前设备。导入或从 WebDAV 恢复前，会自动保留最近 3 个本机快照。</p>
      <div className="data-safety-actions">
        <button type="button" onClick={createManualBackup}>创建本机快照</button>
        <button type="button" onClick={() => downloadInventoryData(data)}>导出 JSON</button>
        <button type="button" onClick={() => fileInput.current?.click()}>导入备份</button>
        <input ref={fileInput} className="visually-hidden" type="file" accept="application/json,.json" onChange={importFile} />
      </div>
      {backups.length ? (
        <div className="backup-list">
          {backups.map((backup) => (
            <div key={backup.id}>
              <span><strong>{formatReason(backup.reason)}</strong><small>{new Date(backup.createdAt).toLocaleString("zh-CN")} · {backup.data.items.length} 件</small></span>
              <button type="button" onClick={() => restoreBackup(backup)}>恢复</button>
            </div>
          ))}
        </div>
      ) : <small>还没有本机快照。</small>}
      {message ? <p className="form-message" role="status">{message}</p> : null}
    </div>
  );
}

function formatReason(reason: InventoryBackup["reason"]): string {
  if (reason === "import") return "导入前快照";
  if (reason === "webdav-restore") return "云端恢复前快照";
  return "手动快照";
}
