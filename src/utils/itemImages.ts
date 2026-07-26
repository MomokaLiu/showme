import type { Item } from "../types/item";

export const MAX_ITEM_IMAGES = 5;

type ItemImages = Pick<Item, "imageUrl" | "imageUrls">;

export function normalizeItemImageUrls(imageUrls: readonly string[]): string[] {
  return imageUrls
    .map((imageUrl) => imageUrl.trim())
    .filter(Boolean)
    .slice(0, MAX_ITEM_IMAGES);
}

export function getItemImageUrls(item: ItemImages): string[] {
  if (Array.isArray(item.imageUrls)) return normalizeItemImageUrls(item.imageUrls);
  return item.imageUrl ? normalizeItemImageUrls([item.imageUrl]) : [];
}

export function normalizeItemImages<ItemType extends ItemImages>(item: ItemType): ItemType {
  return {
    ...item,
    imageUrl: undefined,
    imageUrls: getItemImageUrls(item),
  };
}
