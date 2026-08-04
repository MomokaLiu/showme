export type InventoryViewMode = "list" | "grid";

const STORAGE_KEY = "buwangwu.inventoryViewMode";

export function loadInventoryViewMode(storage: Pick<Storage, "getItem"> = window.localStorage): InventoryViewMode {
  return storage.getItem(STORAGE_KEY) === "grid" ? "grid" : "list";
}

export function saveInventoryViewMode(
  mode: InventoryViewMode,
  storage: Pick<Storage, "setItem"> = window.localStorage,
) {
  storage.setItem(STORAGE_KEY, mode);
}
