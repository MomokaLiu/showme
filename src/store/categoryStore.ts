import { useInventoryStore } from "./itemStore";

export function useCategoryStore() {
  const { categories, getCategoryName } = useInventoryStore();
  return { categories, getCategoryName };
}
