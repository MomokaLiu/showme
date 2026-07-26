import type { Category } from "./category";
import type { Item } from "./item";
import type { Location } from "./location";
import type { ShoppingItem } from "./shopping";
import type { UsageLog } from "./usageLog";

export type WebDavConfig = {
  url: string;
  username: string;
  password: string;
};

export type InventorySyncData = {
  items: Item[];
  logs: UsageLog[];
  categories: Category[];
  locations: Location[];
  shoppingItems: ShoppingItem[];
};

export type InventorySyncDocument = {
  app: "buwangwu";
  schemaVersion: 1;
  updatedAt: string;
  data: InventorySyncData;
};

export type WebDavSyncMode = "bidirectional" | "upload" | "download";

export type WebDavSyncAction = "uploaded" | "downloaded" | "unchanged";

export type WebDavSyncResult = {
  action: WebDavSyncAction;
  document: InventorySyncDocument;
  syncedAt: string;
};

export type LocalSyncMetadata = {
  localUpdatedAt?: string;
  lastSyncedAt?: string;
  lastAction?: WebDavSyncAction;
};
