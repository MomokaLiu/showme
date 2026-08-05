import { useInventoryStore } from "./itemStore";

export function useLocationStore() {
  const { locations, getLocationName, getLocationPath, createLocation, updateLocation, archiveLocation, moveLocation } = useInventoryStore();
  return { locations, getLocationName, getLocationPath, createLocation, updateLocation, archiveLocation, moveLocation };
}
