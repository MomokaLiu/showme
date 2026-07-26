import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { defaultCategories } from "../constants/defaultCategories";
import { defaultLocations } from "../constants/defaultLocations";
import { categoryRepository } from "../repositories/categoryRepository";
import { itemRepository } from "../repositories/itemRepository";
import { locationRepository } from "../repositories/locationRepository";
import { shoppingRepository } from "../repositories/shoppingRepository";
import { usageLogRepository } from "../repositories/usageLogRepository";
import { capacitorWebDavTransport } from "../services/capacitorWebDavTransport";
import {
  getLocalDataUpdatedAt,
  loadSyncMetadata,
  markLocalDataChanged,
  saveSyncMetadata,
} from "../services/syncStorage";
import {
  createWebDavSync,
  getWebDavErrorDetails,
  type WebDavErrorDetails,
} from "../services/webDavSync";
import type { Category } from "../types/category";
import type { Item, ItemDraft } from "../types/item";
import type { Location } from "../types/location";
import type { ShoppingItem } from "../types/shopping";
import type {
  InventorySyncData,
  WebDavConfig,
  WebDavSyncMode,
  WebDavSyncResult,
} from "../types/sync";
import type { UsageActionType, UsageLog } from "../types/usageLog";
import { toDateInputValue } from "../utils/dateUtils";
import { normalizeItemImages } from "../utils/itemImages";
import { enrichItem } from "../utils/itemCalculations";

type ShoppingDraft = Omit<ShoppingItem, "id" | "isPurchased" | "createdAt" | "updatedAt"> & {
  isPurchased?: boolean;
};

type WebDavSyncState = {
  isSyncing: boolean;
  message?: string;
  isError?: boolean;
  errorDetails?: WebDavErrorDetails;
  lastSyncedAt?: string;
};

type InventoryStore = {
  isLoaded: boolean;
  items: Item[];
  logs: UsageLog[];
  categories: Category[];
  locations: Location[];
  shoppingItems: ShoppingItem[];
  getCategoryName: (id?: string) => string;
  getLocationName: (id?: string) => string;
  createItem: (draft: ItemDraft) => Promise<string>;
  updateItem: (id: string, patch: Partial<Item>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  consumeItem: (id: string, quantity: number, note?: string) => Promise<void>;
  finishItem: (id: string, note?: string) => Promise<void>;
  discardItem: (id: string, note?: string) => Promise<void>;
  markOpened: (id: string, openDate?: string) => Promise<void>;
  restockItem: (id: string, quantity: number, note?: string) => Promise<void>;
  addShoppingItem: (draft: ShoppingDraft) => Promise<string>;
  addItemToShoppingList: (itemId: string) => Promise<void>;
  toggleShoppingPurchased: (id: string) => Promise<void>;
  deleteShoppingItem: (id: string) => Promise<void>;
  webDavSyncState: WebDavSyncState;
  testWebDavConnection: (config: WebDavConfig) => Promise<void>;
  synchronizeWebDav: (config: WebDavConfig, mode?: WebDavSyncMode) => Promise<WebDavSyncResult>;
};

const InventoryContext = createContext<InventoryStore | undefined>(undefined);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [locations, setLocations] = useState<Location[]>(defaultLocations);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [webDavSyncState, setWebDavSyncState] = useState<WebDavSyncState>(() => ({
    isSyncing: false,
    lastSyncedAt: loadSyncMetadata().lastSyncedAt,
  }));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [storedItems, storedLogs, storedCategories, storedLocations, storedShopping] =
        await Promise.all([
          itemRepository.getAll(),
          usageLogRepository.getAll(),
          categoryRepository.getAll(),
          locationRepository.getAll(),
          shoppingRepository.getAll(),
        ]);

      if (cancelled) return;

      const nextCategories = storedCategories.length ? storedCategories : defaultCategories;
      const nextLocations = storedLocations.length ? storedLocations : defaultLocations;
      const nextItems = storedItems.map((item) => enrichItem(normalizeItemImages(item)));

      setCategories(nextCategories);
      setLocations(nextLocations);
      setItems(nextItems);
      setLogs(storedLogs);
      setShoppingItems(storedShopping);
      setIsLoaded(true);

      if (!storedCategories.length) await categoryRepository.replaceAll(defaultCategories);
      if (!storedLocations.length) await locationRepository.replaceAll(defaultLocations);
      if (storedItems.length) await itemRepository.replaceAll(nextItems);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const commitItems = useCallback(async (nextItems: Item[]) => {
    const enrichedItems = nextItems.map((item) => enrichItem(normalizeItemImages(item)));
    setItems(enrichedItems);
    await itemRepository.replaceAll(enrichedItems);
    markLocalDataChanged();
  }, []);

  const commitLogs = useCallback(async (nextLogs: UsageLog[]) => {
    setLogs(nextLogs);
    await usageLogRepository.replaceAll(nextLogs);
    markLocalDataChanged();
  }, []);

  const commitShoppingItems = useCallback(async (nextShoppingItems: ShoppingItem[]) => {
    setShoppingItems(nextShoppingItems);
    await shoppingRepository.replaceAll(nextShoppingItems);
    markLocalDataChanged();
  }, []);

  const createLog = useCallback(
    async (
      itemId: string,
      actionType: UsageActionType,
      quantityChange?: number,
      remainingQuantity?: number,
      note?: string,
    ) => {
      const log: UsageLog = {
        id: createId(),
        itemId,
        actionType,
        quantityChange,
        remainingQuantity,
        note,
        createdAt: new Date().toISOString(),
      };
      await commitLogs([log, ...logs]);
    },
    [commitLogs, logs],
  );

  const getCategoryName = useCallback(
    (id?: string) => categories.find((category) => category.id === id)?.name ?? "未分类",
    [categories],
  );

  const getLocationName = useCallback(
    (id?: string) => locations.find((location) => location.id === id)?.name ?? "未设置",
    [locations],
  );

  const createItem = useCallback(
    async (draft: ItemDraft) => {
      const now = new Date().toISOString();
      const item: Item = enrichItem({
        ...draft,
        id: createId(),
        status: draft.status ?? "normal",
        initialQuantity: draft.initialQuantity || draft.quantity,
        createdAt: now,
        updatedAt: now,
      });

      await commitItems([item, ...items]);
      const purchaseLog: UsageLog = {
        id: createId(),
        itemId: item.id,
        actionType: "purchase",
        quantityChange: item.quantity,
        remainingQuantity: item.quantity,
        note: "创建库存",
        createdAt: now,
      };
      await commitLogs([purchaseLog, ...logs]);
      return item.id;
    },
    [commitItems, commitLogs, items, logs],
  );

  const updateItem = useCallback(
    async (id: string, patch: Partial<Item>) => {
      const now = new Date().toISOString();
      const nextItems = items.map((item) =>
        item.id === id ? enrichItem({ ...item, ...patch, updatedAt: now }) : item,
      );
      await commitItems(nextItems);
      await createLog(id, "edit", undefined, nextItems.find((item) => item.id === id)?.quantity);
    },
    [commitItems, createLog, items],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      await commitItems(items.filter((item) => item.id !== id));
      await commitLogs(logs.filter((log) => log.itemId !== id));
    },
    [commitItems, commitLogs, items, logs],
  );

  const consumeItem = useCallback(
    async (id: string, quantity: number, note?: string) => {
      const item = items.find((candidate) => candidate.id === id);
      if (!item || quantity <= 0) return;
      const consumedQuantity = Math.min(item.quantity, quantity);
      const nextQuantity = Math.max(0, item.quantity - consumedQuantity);
      const now = toDateInputValue();
      const patch: Partial<Item> =
        nextQuantity === 0
          ? { quantity: 0, status: "finished", finishDate: item.finishDate ?? now }
          : { quantity: nextQuantity };

      const nextItems = items.map((candidate) =>
        candidate.id === id ? enrichItem({ ...candidate, ...patch, updatedAt: new Date().toISOString() }) : candidate,
      );
      await commitItems(nextItems);
      await createLog(
        id,
        nextQuantity === 0 ? "finish" : "consume",
        -consumedQuantity,
        nextQuantity,
        note,
      );
    },
    [commitItems, createLog, items],
  );

  const finishItem = useCallback(
    async (id: string, note?: string) => {
      const item = items.find((candidate) => candidate.id === id);
      if (!item) return;
      const now = toDateInputValue();
      const nextItems = items.map((candidate) =>
        candidate.id === id
          ? enrichItem({
              ...candidate,
              quantity: 0,
              status: "finished",
              finishDate: candidate.finishDate ?? now,
              updatedAt: new Date().toISOString(),
            })
          : candidate,
      );
      await commitItems(nextItems);
      await createLog(id, "finish", -item.quantity, 0, note);
    },
    [commitItems, createLog, items],
  );

  const discardItem = useCallback(
    async (id: string, note?: string) => {
      const item = items.find((candidate) => candidate.id === id);
      if (!item) return;
      const now = toDateInputValue();
      const discardedQuantity = item.quantity;
      const nextItems = items.map((candidate) =>
        candidate.id === id
          ? enrichItem({
              ...candidate,
              quantity: 0,
              status: "discarded",
              discardDate: candidate.discardDate ?? now,
              updatedAt: new Date().toISOString(),
            })
          : candidate,
      );
      await commitItems(nextItems);
      await createLog(id, "discard", -discardedQuantity, 0, note);
    },
    [commitItems, createLog, items],
  );

  const markOpened = useCallback(
    async (id: string, openDate = toDateInputValue()) => {
      const nextItems = items.map((item) =>
        item.id === id ? enrichItem({ ...item, openDate, updatedAt: new Date().toISOString() }) : item,
      );
      await commitItems(nextItems);
      await createLog(id, "open", undefined, nextItems.find((item) => item.id === id)?.quantity);
    },
    [commitItems, createLog, items],
  );

  const restockItem = useCallback(
    async (id: string, quantity: number, note?: string) => {
      if (quantity <= 0) return;
      const nextItems = items.map((item) =>
        item.id === id
          ? enrichItem({
              ...item,
              quantity: item.quantity + quantity,
              initialQuantity: item.initialQuantity + quantity,
              status: "normal",
              finishDate: undefined,
              discardDate: undefined,
              updatedAt: new Date().toISOString(),
            })
          : item,
      );
      await commitItems(nextItems);
      await createLog(id, "restock", quantity, nextItems.find((item) => item.id === id)?.quantity, note);
    },
    [commitItems, createLog, items],
  );

  const addShoppingItem = useCallback(
    async (draft: ShoppingDraft) => {
      const now = new Date().toISOString();
      const shoppingItem: ShoppingItem = {
        ...draft,
        id: createId(),
        isPurchased: draft.isPurchased ?? false,
        createdAt: now,
        updatedAt: now,
      };
      const nextShoppingItems = [shoppingItem, ...shoppingItems];
      await commitShoppingItems(nextShoppingItems);
      return shoppingItem.id;
    },
    [commitShoppingItems, shoppingItems],
  );

  const addItemToShoppingList = useCallback(
    async (itemId: string) => {
      const item = items.find((candidate) => candidate.id === itemId);
      if (!item) return;
      await addShoppingItem({
        name: item.name,
        quantity: item.initialQuantity || 1,
        unit: item.unit,
        estimatedPrice: item.totalPrice,
        note: item.locationId ? `原位置：${getLocationName(item.locationId)}` : undefined,
      });
    },
    [addShoppingItem, getLocationName, items],
  );

  const toggleShoppingPurchased = useCallback(
    async (id: string) => {
      const nextShoppingItems = shoppingItems.map((item) =>
        item.id === id
          ? { ...item, isPurchased: !item.isPurchased, updatedAt: new Date().toISOString() }
          : item,
      );
      await commitShoppingItems(nextShoppingItems);
    },
    [commitShoppingItems, shoppingItems],
  );

  const deleteShoppingItem = useCallback(
    async (id: string) => {
      const nextShoppingItems = shoppingItems.filter((item) => item.id !== id);
      await commitShoppingItems(nextShoppingItems);
    },
    [commitShoppingItems, shoppingItems],
  );

  const replaceInventoryData = useCallback(async (data: InventorySyncData) => {
    const nextItems = data.items.map((item) => enrichItem(normalizeItemImages(item)));
    const nextCategories = data.categories.length ? data.categories : defaultCategories;
    const nextLocations = data.locations.length ? data.locations : defaultLocations;

    await Promise.all([
      itemRepository.replaceAll(nextItems),
      usageLogRepository.replaceAll(data.logs),
      categoryRepository.replaceAll(nextCategories),
      locationRepository.replaceAll(nextLocations),
      shoppingRepository.replaceAll(data.shoppingItems),
    ]);

    setItems(nextItems);
    setLogs(data.logs);
    setCategories(nextCategories);
    setLocations(nextLocations);
    setShoppingItems(data.shoppingItems);
  }, []);

  const testWebDavConnection = useCallback(
    async (config: WebDavConfig) => {
      if (webDavSyncState.isSyncing) throw new Error("已有同步任务正在进行。");
      setWebDavSyncState((current) => ({
        ...current,
        isSyncing: true,
        isError: false,
        errorDetails: undefined,
        message: "正在测试 WebDAV 连接...",
      }));

      try {
        await createWebDavSync(config, capacitorWebDavTransport).testConnection();
        setWebDavSyncState((current) => ({
          ...current,
          isSyncing: false,
          isError: false,
          errorDetails: undefined,
          message: "WebDAV 连接成功。",
        }));
      } catch (error) {
        const errorDetails = getSyncErrorDetails(error);
        setWebDavSyncState((current) => ({
          ...current,
          isSyncing: false,
          isError: true,
          message: errorDetails.summary,
          errorDetails,
        }));
        throw error;
      }
    },
    [webDavSyncState.isSyncing],
  );

  const synchronizeWebDav = useCallback(
    async (config: WebDavConfig, mode: WebDavSyncMode = "bidirectional") => {
      if (webDavSyncState.isSyncing) throw new Error("已有同步任务正在进行。");
      setWebDavSyncState((current) => ({
        ...current,
        isSyncing: true,
        isError: false,
        errorDetails: undefined,
        message: syncProgressMessage[mode],
      }));

      const data: InventorySyncData = {
        items,
        logs,
        categories,
        locations,
        shoppingItems,
      };

      try {
        const result = await createWebDavSync(config, capacitorWebDavTransport).synchronize({
          data,
          localUpdatedAt: getLocalDataUpdatedAt(data),
          mode,
        });

        if (result.action === "downloaded") {
          await replaceInventoryData(result.document.data);
        }

        saveSyncMetadata({
          localUpdatedAt: result.document.updatedAt,
          lastSyncedAt: result.syncedAt,
          lastAction: result.action,
        });
        setWebDavSyncState({
          isSyncing: false,
          isError: false,
          errorDetails: undefined,
          message: syncResultMessage[result.action],
          lastSyncedAt: result.syncedAt,
        });
        return result;
      } catch (error) {
        const errorDetails = getSyncErrorDetails(error);
        setWebDavSyncState((current) => ({
          ...current,
          isSyncing: false,
          isError: true,
          message: errorDetails.summary,
          errorDetails,
        }));
        throw error;
      }
    },
    [
      categories,
      items,
      locations,
      logs,
      replaceInventoryData,
      shoppingItems,
      webDavSyncState.isSyncing,
    ],
  );

  const value = useMemo<InventoryStore>(
    () => ({
      isLoaded,
      items,
      logs,
      categories,
      locations,
      shoppingItems,
      getCategoryName,
      getLocationName,
      createItem,
      updateItem,
      deleteItem,
      consumeItem,
      finishItem,
      discardItem,
      markOpened,
      restockItem,
      addShoppingItem,
      addItemToShoppingList,
      toggleShoppingPurchased,
      deleteShoppingItem,
      webDavSyncState,
      testWebDavConnection,
      synchronizeWebDav,
    }),
    [
      isLoaded,
      items,
      logs,
      categories,
      locations,
      shoppingItems,
      getCategoryName,
      getLocationName,
      createItem,
      updateItem,
      deleteItem,
      consumeItem,
      finishItem,
      discardItem,
      markOpened,
      restockItem,
      addShoppingItem,
      addItemToShoppingList,
      toggleShoppingPurchased,
      deleteShoppingItem,
      webDavSyncState,
      testWebDavConnection,
      synchronizeWebDav,
    ],
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventoryStore(): InventoryStore {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error("useInventoryStore must be used inside InventoryProvider");
  }
  return context;
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const syncProgressMessage: Record<WebDavSyncMode, string> = {
  bidirectional: "正在比较本机和 WebDAV 数据...",
  upload: "正在上传本机数据...",
  download: "正在下载 WebDAV 数据...",
};

const syncResultMessage: Record<WebDavSyncResult["action"], string> = {
  uploaded: "同步完成：已将本机数据上传到 WebDAV。",
  downloaded: "同步完成：已使用较新的 WebDAV 数据更新本机。",
  unchanged: "同步完成：本机与 WebDAV 数据已经一致。",
};

function getSyncErrorDetails(error: unknown): WebDavErrorDetails {
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return {
      summary: "无法保存 WebDAV 数据。",
      reason: "本机存储空间不足。",
      suggestion: "清理浏览器或应用存储空间后重试。",
    };
  }
  return getWebDavErrorDetails(error);
}
