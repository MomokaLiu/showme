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
import type { Category } from "../types/category";
import type { Item, ItemDraft } from "../types/item";
import type { Location } from "../types/location";
import type { ShoppingItem } from "../types/shopping";
import type { UsageActionType, UsageLog } from "../types/usageLog";
import { toDateInputValue } from "../utils/dateUtils";
import { enrichItem } from "../utils/itemCalculations";

type ShoppingDraft = Omit<ShoppingItem, "id" | "isPurchased" | "createdAt" | "updatedAt"> & {
  isPurchased?: boolean;
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
};

const InventoryContext = createContext<InventoryStore | undefined>(undefined);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [locations, setLocations] = useState<Location[]>(defaultLocations);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);

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
      const nextItems = storedItems.map((item) => enrichItem(item));

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
    const enrichedItems = nextItems.map((item) => enrichItem(item));
    setItems(enrichedItems);
    await itemRepository.replaceAll(enrichedItems);
  }, []);

  const commitLogs = useCallback(async (nextLogs: UsageLog[]) => {
    setLogs(nextLogs);
    await usageLogRepository.replaceAll(nextLogs);
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
      setShoppingItems(nextShoppingItems);
      await shoppingRepository.replaceAll(nextShoppingItems);
      return shoppingItem.id;
    },
    [shoppingItems],
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
      setShoppingItems(nextShoppingItems);
      await shoppingRepository.replaceAll(nextShoppingItems);
    },
    [shoppingItems],
  );

  const deleteShoppingItem = useCallback(
    async (id: string) => {
      const nextShoppingItems = shoppingItems.filter((item) => item.id !== id);
      setShoppingItems(nextShoppingItems);
      await shoppingRepository.replaceAll(nextShoppingItems);
    },
    [shoppingItems],
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
