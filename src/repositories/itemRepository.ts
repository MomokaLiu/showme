import type { Item } from "../types/item";
import { LocalStorageRepository } from "./localStorageRepository";

export interface ItemRepository {
  getAll(): Promise<Item[]>;
  getById(id: string): Promise<Item | undefined>;
  create(item: Item): Promise<void>;
  update(id: string, patch: Partial<Item>): Promise<void>;
  delete(id: string): Promise<void>;
  replaceAll(items: Item[]): Promise<void>;
}

export const itemRepository: ItemRepository = new LocalStorageRepository<Item>("buwangwu.items");
