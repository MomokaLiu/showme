import type { Repository } from "./localStorageRepository";

const DATABASE_NAME = "buwangwu";
const DATABASE_VERSION = 1;
const META_STORE = "meta";
const MIGRATION_KEY = "legacy-local-storage-v1";

export type InventoryStoreName =
  | "items"
  | "usageLogs"
  | "categories"
  | "locations"
  | "shoppingItems"
  | "backups";

const legacyKeys: Partial<Record<InventoryStoreName, string>> = {
  items: "buwangwu.items",
  usageLogs: "buwangwu.usageLogs",
  categories: "buwangwu.categories",
  locations: "buwangwu.locations",
  shoppingItems: "buwangwu.shopping",
};

let databasePromise: Promise<IDBDatabase> | undefined;
let migrationPromise: Promise<void> | undefined;

export class IndexedDbRepository<T extends { id: string }> implements Repository<T> {
  private readonly storeName: InventoryStoreName;

  constructor(storeName: InventoryStoreName) {
    this.storeName = storeName;
  }

  async getAll(): Promise<T[]> {
    const database = await getInventoryDatabase();
    return requestAsPromise<T[]>(database.transaction(this.storeName, "readonly").objectStore(this.storeName).getAll());
  }

  async getById(id: string): Promise<T | undefined> {
    const database = await getInventoryDatabase();
    return requestAsPromise<T | undefined>(
      database.transaction(this.storeName, "readonly").objectStore(this.storeName).get(id),
    );
  }

  async create(item: T): Promise<void> {
    const database = await getInventoryDatabase();
    const transaction = database.transaction(this.storeName, "readwrite");
    transaction.objectStore(this.storeName).put(item);
    await transactionAsPromise(transaction);
  }

  async update(id: string, patch: Partial<T>): Promise<void> {
    const current = await this.getById(id);
    if (!current) return;
    await this.create({ ...current, ...patch });
  }

  async delete(id: string): Promise<void> {
    const database = await getInventoryDatabase();
    const transaction = database.transaction(this.storeName, "readwrite");
    transaction.objectStore(this.storeName).delete(id);
    await transactionAsPromise(transaction);
  }

  async replaceAll(items: T[]): Promise<void> {
    const database = await getInventoryDatabase();
    const transaction = database.transaction(this.storeName, "readwrite");
    const store = transaction.objectStore(this.storeName);
    store.clear();
    for (const item of items) store.put(item);
    await transactionAsPromise(transaction);
  }
}

export async function getInventoryDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") throw new Error("当前环境不支持本机数据库。");
  databasePromise ??= openDatabase();
  const database = await databasePromise;
  migrationPromise ??= migrateLegacyLocalStorage(database);
  await migrationPromise;
  return database;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      for (const storeName of Object.keys(legacyKeys) as InventoryStoreName[]) {
        if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("backups")) database.createObjectStore("backups", { keyPath: "id" });
      if (!database.objectStoreNames.contains(META_STORE)) database.createObjectStore(META_STORE, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("无法打开本机数据库。"));
    request.onblocked = () => reject(new Error("本机数据库正在被其他页面占用，请关闭其他页面后重试。"));
  });
}

async function migrateLegacyLocalStorage(database: IDBDatabase): Promise<void> {
  const migrationState = await requestAsPromise<{ key: string; completedAt: string } | undefined>(
    database.transaction(META_STORE, "readonly").objectStore(META_STORE).get(MIGRATION_KEY),
  );
  if (migrationState) return;

  const storeNames = Object.keys(legacyKeys) as InventoryStoreName[];
  const transaction = database.transaction([...storeNames, META_STORE], "readwrite");

  for (const storeName of storeNames) {
    const store = transaction.objectStore(storeName);
    const count = await requestAsPromise<number>(store.count());
    if (count > 0) continue;

    const legacyKey = legacyKeys[storeName];
    const raw = legacyKey && typeof window !== "undefined" ? window.localStorage.getItem(legacyKey) : null;
    if (!raw) continue;
    let records: unknown;
    try {
      records = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!Array.isArray(records)) continue;
    for (const record of records) {
      if (record && typeof record === "object" && typeof (record as { id?: unknown }).id === "string") {
        store.put(record);
      }
    }
  }

  transaction.objectStore(META_STORE).put({ key: MIGRATION_KEY, completedAt: new Date().toISOString() });
  await transactionAsPromise(transaction);
}

function requestAsPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("本机数据库操作失败。"));
  });
}

function transactionAsPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("本机数据库事务已中止。"));
    transaction.onerror = () => reject(transaction.error ?? new Error("本机数据库事务失败。"));
  });
}
