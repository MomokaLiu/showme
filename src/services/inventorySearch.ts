import type { Item, ItemStatus } from "../types/item";

export type InventorySearchSort = "relevance" | "updated" | "expire" | "purchase" | "price" | "quantity";

export type InventorySearchQuery = {
  text?: string;
  categoryId?: string;
  locationId?: string;
  missingLocation?: boolean;
  status?: ItemStatus;
  sort?: InventorySearchSort;
};

export type InventorySearchNames = {
  getCategoryName: (id?: string) => string;
  getLocationName: (id?: string) => string;
};

export function searchInventory(items: Item[], query: InventorySearchQuery, names: InventorySearchNames): Item[] {
  const text = normalizeSearchText(query.text);
  const matches = items.filter((item) => {
    if (query.categoryId && item.categoryId !== query.categoryId) return false;
    if (query.missingLocation && item.locationId) return false;
    if (query.locationId && item.locationId !== query.locationId) return false;
    if (query.status && item.status !== query.status) return false;
    return !text || createSearchFields(item, names).some((field) => field.includes(text));
  });

  const sort = query.sort ?? (text ? "relevance" : "updated");
  return matches.sort((left, right) => {
    if (sort === "relevance" && text) {
      const difference = getRelevanceScore(right, text, names) - getRelevanceScore(left, text, names);
      if (difference) return difference;
    }
    if (sort === "purchase") return (right.purchaseDate ?? "").localeCompare(left.purchaseDate ?? "");
    if (sort === "price") return (right.totalPrice ?? 0) - (left.totalPrice ?? 0);
    if (sort === "quantity") return left.quantity - right.quantity;
    if (sort === "expire") {
      if (!left.finalExpireDate) return 1;
      if (!right.finalExpireDate) return -1;
      return left.finalExpireDate.localeCompare(right.finalExpireDate);
    }
    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

export function normalizeSearchText(value?: string): string {
  return (value ?? "").trim().toLocaleLowerCase("zh-CN").replace(/\s+/g, " ");
}

function createSearchFields(item: Item, names: InventorySearchNames): string[] {
  return [
    item.name,
    item.brand,
    item.model,
    item.note,
    item.purchaseChannel,
    names.getCategoryName(item.categoryId),
    names.getLocationName(item.locationId),
    ...(item.tags ?? []),
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizeSearchText);
}

function getRelevanceScore(item: Item, text: string, names: InventorySearchNames): number {
  const name = normalizeSearchText(item.name);
  if (name === text) return 500;
  if (name.startsWith(text)) return 400;
  if (name.includes(text)) return 300;
  const fields = createSearchFields(item, names).slice(1);
  const fieldIndex = fields.findIndex((field) => field.includes(text));
  return fieldIndex < 0 ? 0 : 200 - fieldIndex;
}
