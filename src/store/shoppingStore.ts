import { useInventoryStore } from "./itemStore";

export function useShoppingStore() {
  const {
    shoppingItems,
    addShoppingItem,
    addItemToShoppingList,
    toggleShoppingPurchased,
    deleteShoppingItem,
  } = useInventoryStore();

  return {
    shoppingItems,
    addShoppingItem,
    addItemToShoppingList,
    toggleShoppingPurchased,
    deleteShoppingItem,
  };
}
