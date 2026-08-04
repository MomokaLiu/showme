import { useInventoryStore } from "./itemStore";

export function useLocationStore() {
  const { locations, getLocationName, createLocation, updateLocation, archiveLocation, moveLocation } = useInventoryStore();
  return { locations, getLocationName, createLocation, updateLocation, archiveLocation, moveLocation };
}
