import { useInventoryStore } from "./itemStore";

export function useCategoryStore() {
  const { categories, getCategoryName, createCategory, updateCategory, archiveCategory, moveCategory } = useInventoryStore();
  return { categories, getCategoryName, createCategory, updateCategory, archiveCategory, moveCategory };
}
