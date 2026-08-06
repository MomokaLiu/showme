import type { Item } from "../types/item";

export function incrementItemFindCount(items: Item[], itemId: string, foundAt = new Date().toISOString()): Item[] {
  if (!items.some((item) => item.id === itemId)) return items;
  return items.map((item) => item.id === itemId
    ? { ...item, findCount: (item.findCount ?? 0) + 1, lastFoundAt: foundAt }
    : item);
}
