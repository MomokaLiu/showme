import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { calculateActualDailyCost } from "../services/dailyCostCalculator";
import { refreshDailyCostsIfNeeded } from "../services/dailyCostRefresh";
import { dailyCostRefreshStorage } from "../services/dailyCostRefreshStorage";
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
import { reminderService } from "../services/reminderService";
import { createInventoryBackup, type InventoryBackupReason } from "../services/inventoryBackupService";
import { recordLocalProductEvent } from "../services/localProductMetrics";
import { incrementItemFindCount } from "../services/itemFindTracking";
import { normalizeItemMode } from "../utils/itemMode";
import { getLocationPath, normalizeLocations } from "../utils/locations";

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
  getLocationPath: (id?: string) => string;
  createCategory: (name: string) => Promise<string>;
  updateCategory: (id: string, patch: Partial<Category>) => Promise<void>;
  archiveCategory: (id: string) => Promise<void>;
  moveCategory: (id: string, direction: -1 | 1) => Promise<void>;
  createLocation: (name: string, options?: { parentId?: string }) => Promise<string>;
  updateLocation: (id: string, patch: Partial<Location>) => Promise<void>;
  archiveLocation: (id: string) => Promise<void>;
  moveLocation: (id: string, direction: -1 | 1) => Promise<void>;
  createItem: (draft: ItemDraft) => Promise<string>;
  updateItem: (id: string, patch: Partial<Item>) => Promise<void>;
  recordItemFound: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  consumeItem: (id: string, quantity: number, note?: string) => Promise<void>;
  finishItem: (id: string, note?: string) => Promise<void>;
  discardItem: (id: string, note?: string) => Promise<void>;
  markOpened: (id: string, openDate?: string) => Promise<void>;
  restockItem: (id: string, quantity: number, note?: string) => Promise<void>;
  snoozeExpiryReminder: (id: string, days: number) => Promise<void>;
  addShoppingItem: (draft: ShoppingDraft) => Promise<string>;
  addItemToShoppingList: (itemId: string) => Promise<void>;
  toggleShoppingPurchased: (id: string) => Promise<void>;
  completeShoppingConversion: (shoppingItemId: string, itemId: string) => Promise<void>;
  deleteShoppingItem: (id: string) => Promise<void>;
  restoreInventoryData: (data: InventorySyncData, reason: InventoryBackupReason) => Promise<void>;
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
  const costRefreshInFlight = useRef<Promise<boolean> | null>(null);
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

      const nextCategories = storedCategories.length
        ? storedCategories.map((category) => ({ ...defaultCategories.find((entry) => entry.id === category.id), ...category }))
        : defaultCategories;
      const mergedLocations = storedLocations.length
        ? storedLocations.map((location) => ({ ...defaultLocations.find((entry) => entry.id === location.id), ...location }))
        : defaultLocations;
      const nextLocations = normalizeLocations(mergedLocations);
      const normalizedItems = storedItems.map((item) =>
        normalizeItemMode(enrichItem(normalizeItemImages(item)), storedLogs),
      );
      const shouldPersistNormalizedItems = needsNormalizedItemsWrite(storedItems, normalizedItems);
      const shouldPersistNormalizedLocations = needsNormalizedLocationsWrite(storedLocations, nextLocations);
      const costRefreshResult = await refreshDailyCostsIfNeeded({
        items: normalizedItems,
        repository: itemRepository,
        storage: dailyCostRefreshStorage,
      }).catch(() => ({ refreshed: false as const, items: normalizedItems }));

      if (cancelled) return;
      const nextItems = costRefreshResult.items;

      setCategories(nextCategories);
      setLocations(nextLocations);
      setItems(nextItems);
      setLogs(storedLogs);
      setShoppingItems(storedShopping);
      setIsLoaded(true);
      void reminderService.reconcile(nextItems).catch(() => undefined);

      if (!storedCategories.length) await categoryRepository.replaceAll(defaultCategories);
      if (!storedLocations.length) await locationRepository.replaceAll(defaultLocations);
      else if (shouldPersistNormalizedLocations) await locationRepository.replaceAll(nextLocations);
      if (storedItems.length && !costRefreshResult.refreshed && shouldPersistNormalizedItems) {
        await itemRepository.replaceAll(nextItems);
      }
      recordLocalProductEvent("app_opened");
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
    void reminderService.reconcile(enrichedItems).catch(() => undefined);
  }, []);

  const refreshActualDailyCosts = useCallback(async () => {
    if (costRefreshInFlight.current) return costRefreshInFlight.current;

    const refreshTask = (async () => {
      const result = await refreshDailyCostsIfNeeded({
        items,
        repository: itemRepository,
        storage: dailyCostRefreshStorage,
      });
      if (result.refreshed) setItems(result.items);
      return result.refreshed;
    })();

    costRefreshInFlight.current = refreshTask;
    try {
      return await refreshTask;
    } finally {
      if (costRefreshInFlight.current === refreshTask) {
        costRefreshInFlight.current = null;
      }
    }
  }, [items]);

  useEffect(() => {
    if (!isLoaded) return;

    const refreshWhenVisible = () => {
      if (document.visibilityState !== "visible") return;
      void refreshActualDailyCosts().catch(() => undefined);
    };

    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);
    window.addEventListener("pageshow", refreshWhenVisible);
    return () => {
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
      window.removeEventListener("pageshow", refreshWhenVisible);
    };
  }, [isLoaded, refreshActualDailyCosts]);

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

  const commitCategories = useCallback(async (nextCategories: Category[]) => {
    setCategories(nextCategories);
    await categoryRepository.replaceAll(nextCategories);
    markLocalDataChanged();
  }, []);

  const commitLocations = useCallback(async (nextLocations: Location[]) => {
    setLocations(nextLocations);
    await locationRepository.replaceAll(nextLocations);
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
    (id?: string) => getLocationPath(locations, id),
    [locations],
  );

  const getLocationPathName = useCallback((id?: string) => getLocationPath(locations, id), [locations]);

  const createCategory = useCallback(
    async (name: string) => {
      const normalizedName = name.trim();
      if (!normalizedName) throw new Error("分类名称不能为空。");
      const duplicate = categories.find((category) => category.name === normalizedName && !category.isArchived);
      if (duplicate) return duplicate.id;
      const id = createId();
      await commitCategories([
        ...categories,
        { id, name: normalizedName, sortOrder: categories.length },
      ]);
      return id;
    },
    [categories, commitCategories],
  );

  const updateCategory = useCallback(
    async (id: string, patch: Partial<Category>) => {
      await commitCategories(categories.map((category) => (category.id === id ? { ...category, ...patch } : category)));
    },
    [categories, commitCategories],
  );

  const archiveCategory = useCallback(
    async (id: string) => {
      if (id === "other") throw new Error("“其他”分类不能归档。");
      await updateCategory(id, { isArchived: true });
    },
    [updateCategory],
  );

  const moveCategory = useCallback(
    async (id: string, direction: -1 | 1) => {
      const ordered = [...categories].filter((category) => !category.isArchived).sort(compareSortOrder);
      const index = ordered.findIndex((category) => category.id === id);
      const target = ordered[index + direction];
      if (index < 0 || !target) return;
      const nextOrder = new Map(ordered.map((category, order) => [category.id, order]));
      nextOrder.set(id, index + direction);
      nextOrder.set(target.id, index);
      await commitCategories(categories.map((category) => ({ ...category, sortOrder: nextOrder.get(category.id) ?? category.sortOrder })));
    },
    [categories, commitCategories],
  );

  const createLocation = useCallback(
    async (name: string, options?: { parentId?: string }) => {
      const normalizedName = name.trim();
      if (!normalizedName) throw new Error("位置名称不能为空。");
      const parentId = options?.parentId || undefined;
      if (parentId && !locations.some((location) => location.id === parentId && !location.parentId && !location.isArchived)) {
        throw new Error("上级区域不存在或不可用。");
      }
      const duplicate = locations.find(
        (location) =>
          location.name === normalizedName &&
          location.parentId === parentId &&
          !location.isArchived,
      );
      if (duplicate) return duplicate.id;
      const id = createId();
      const siblings = locations.filter((location) => location.parentId === parentId);
      await commitLocations([
        ...locations,
        {
          id,
          name: normalizedName,
          kind: parentId ? "container" : "area",
          parentId,
          sortOrder: siblings.length,
        },
      ]);
      return id;
    },
    [commitLocations, locations],
  );

  const updateLocation = useCallback(
    async (id: string, patch: Partial<Location>) => {
      await commitLocations(locations.map((location) => (location.id === id ? { ...location, ...patch } : location)));
    },
    [commitLocations, locations],
  );

  const archiveLocation = useCallback(
    async (id: string) => {
      if (id === "other") throw new Error("“其他”位置不能归档。");
      const ids = new Set([id, ...locations.filter((location) => location.parentId === id).map((location) => location.id)]);
      await commitLocations(
        locations.map((location) => (ids.has(location.id) ? { ...location, isArchived: true } : location)),
      );
    },
    [commitLocations, locations],
  );

  const moveLocation = useCallback(
    async (id: string, direction: -1 | 1) => {
      const current = locations.find((location) => location.id === id);
      if (!current) return;
      const ordered = [...locations]
        .filter((location) => !location.isArchived && location.parentId === current.parentId)
        .sort(compareSortOrder);
      const index = ordered.findIndex((location) => location.id === id);
      const target = ordered[index + direction];
      if (index < 0 || !target) return;
      const nextOrder = new Map(ordered.map((location, order) => [location.id, order]));
      nextOrder.set(id, index + direction);
      nextOrder.set(target.id, index);
      await commitLocations(locations.map((location) => ({ ...location, sortOrder: nextOrder.get(location.id) ?? location.sortOrder })));
    },
    [commitLocations, locations],
  );

  const createItem = useCallback(
    async (draft: ItemDraft) => {
      const now = new Date().toISOString();
      const enrichedItem: Item = enrichItem({
        ...draft,
        actualDailyCost: calculateActualDailyCost(draft),
        id: createId(),
        status: draft.status ?? "normal",
        initialQuantity: draft.initialQuantity || draft.quantity,
        createdAt: now,
        updatedAt: now,
      });
      const item: Item = {
        ...enrichedItem,
        mode: draft.mode ?? "regular",
        expiryReminderEnabled: draft.expiryReminderEnabled ?? Boolean(enrichedItem.finalExpireDate),
        expiryReminderDays: draft.expiryReminderDays ?? 7,
      };

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
      recordLocalProductEvent("item_created");
      if (item.locationId) recordLocalProductEvent("item_created_with_location");
      return item.id;
    },
    [commitItems, commitLogs, items, logs],
  );

  const updateItem = useCallback(
    async (id: string, patch: Partial<Item>) => {
      const now = new Date().toISOString();
      const previousItem = items.find((item) => item.id === id);
      const nextItems = items.map((item) => {
        if (item.id !== id) return item;
        const updatedItem = { ...item, ...patch, updatedAt: now };
        return enrichItem({
          ...updatedItem,
          actualDailyCost: calculateActualDailyCost(updatedItem),
        });
      });
      await commitItems(nextItems);
      await createLog(id, "edit", undefined, nextItems.find((item) => item.id === id)?.quantity);
      if (Object.prototype.hasOwnProperty.call(patch, "locationId") && previousItem?.locationId !== patch.locationId) {
        recordLocalProductEvent("item_moved");
      }
    },
    [commitItems, createLog, items],
  );

  const recordItemFound = useCallback(
    async (id: string) => {
      const nextItems = incrementItemFindCount(items, id);
      if (nextItems === items) return;
      await commitItems(nextItems);
      recordLocalProductEvent("item_found");
    },
    [commitItems, items],
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

  const snoozeExpiryReminder = useCallback(
    async (id: string, days: number) => {
      if (![1, 3, 7].includes(days)) throw new Error("延后天数无效。");
      const snoozedUntil = new Date();
      snoozedUntil.setDate(snoozedUntil.getDate() + days);
      snoozedUntil.setHours(9, 0, 0, 0);
      const nextItems = items.map((item) =>
        item.id === id
          ? { ...item, expiryReminderEnabled: true, expiryReminderSnoozedUntil: snoozedUntil.toISOString(), updatedAt: new Date().toISOString() }
          : item,
      );
      await commitItems(nextItems);
      await createLog(id, "edit", undefined, nextItems.find((item) => item.id === id)?.quantity, `提醒延后 ${days} 天`);
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
        sourceItemId: item.id,
      });
    },
    [addShoppingItem, getLocationName, items],
  );

  const toggleShoppingPurchased = useCallback(
    async (id: string) => {
      const nextShoppingItems = shoppingItems.map((item) =>
        item.id === id ? (() => {
          const isPurchased = !item.isPurchased;
          const updatedAt = new Date().toISOString();
          return { ...item, isPurchased, purchasedAt: isPurchased ? updatedAt : undefined, updatedAt };
        })() : item,
      );
      await commitShoppingItems(nextShoppingItems);
    },
    [commitShoppingItems, shoppingItems],
  );

  const completeShoppingConversion = useCallback(
    async (shoppingItemId: string, itemId: string) => {
      const now = new Date().toISOString();
      await commitShoppingItems(
        shoppingItems.map((item) =>
          item.id === shoppingItemId
            ? { ...item, isPurchased: true, purchasedAt: now, convertedItemId: itemId, updatedAt: now }
            : item,
        ),
      );
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
    const nextItems = data.items.map((item) =>
      normalizeItemMode(enrichItem(normalizeItemImages(item)), data.logs),
    );
    const nextCategories = data.categories.length ? data.categories : defaultCategories;
    const nextLocations = normalizeLocations(data.locations.length ? data.locations : defaultLocations);

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
    markLocalDataChanged();
    void reminderService.reconcile(nextItems).catch(() => undefined);
  }, []);

  const restoreInventoryData = useCallback(
    async (data: InventorySyncData, reason: InventoryBackupReason) => {
      await createInventoryBackup({ items, logs, categories, locations, shoppingItems }, reason);
      await replaceInventoryData(data);
    },
    [categories, items, locations, logs, replaceInventoryData, shoppingItems],
  );

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
          await restoreInventoryData(result.document.data, "webdav-restore");
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
      restoreInventoryData,
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
      getLocationPath: getLocationPathName,
      createCategory,
      updateCategory,
      archiveCategory,
      moveCategory,
      createLocation,
      updateLocation,
      archiveLocation,
      moveLocation,
      createItem,
      updateItem,
      recordItemFound,
      deleteItem,
      consumeItem,
      finishItem,
      discardItem,
      markOpened,
      restockItem,
      snoozeExpiryReminder,
      addShoppingItem,
      addItemToShoppingList,
      toggleShoppingPurchased,
      completeShoppingConversion,
      deleteShoppingItem,
      restoreInventoryData,
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
      getLocationPathName,
      createCategory,
      updateCategory,
      archiveCategory,
      moveCategory,
      createLocation,
      updateLocation,
      archiveLocation,
      moveLocation,
      createItem,
      updateItem,
      recordItemFound,
      deleteItem,
      consumeItem,
      finishItem,
      discardItem,
      markOpened,
      restockItem,
      snoozeExpiryReminder,
      addShoppingItem,
      addItemToShoppingList,
      toggleShoppingPurchased,
      completeShoppingConversion,
      deleteShoppingItem,
      restoreInventoryData,
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

function compareSortOrder(left: { name: string; sortOrder?: number }, right: { name: string; sortOrder?: number }): number {
  return (left.sortOrder ?? 999) - (right.sortOrder ?? 999) || left.name.localeCompare(right.name);
}

function needsNormalizedItemsWrite(storedItems: Item[], normalizedItems: Item[]): boolean {
  return storedItems.some((storedItem, index) => {
    const normalizedItem = normalizedItems[index];
    if (!normalizedItem) return true;
    if (
      storedItem.status !== normalizedItem.status ||
      storedItem.mode !== normalizedItem.mode ||
      storedItem.finalExpireDate !== normalizedItem.finalExpireDate ||
      storedItem.unitPrice !== normalizedItem.unitPrice ||
      storedItem.imageUrl !== undefined
    ) {
      return true;
    }

    if (!Array.isArray(storedItem.imageUrls)) return true;
    if (storedItem.imageUrls.length !== normalizedItem.imageUrls?.length) return true;
    return storedItem.imageUrls.some((imageUrl, imageIndex) => imageUrl !== normalizedItem.imageUrls?.[imageIndex]);
  });
}

function needsNormalizedLocationsWrite(storedLocations: Location[], normalizedLocations: Location[]): boolean {
  if (storedLocations.length !== normalizedLocations.length) return true;
  return storedLocations.some((location, index) => {
    const normalized = normalizedLocations[index];
    return !normalized || location.kind !== normalized.kind || location.parentId !== normalized.parentId;
  });
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
