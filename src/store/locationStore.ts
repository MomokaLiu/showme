import { useInventoryStore } from "./itemStore";

export function useLocationStore() {
  const { locations, getLocationName } = useInventoryStore();
  return { locations, getLocationName };
}
