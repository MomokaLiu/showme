import type { Location } from "../types/location";
import { LocalStorageRepository } from "./localStorageRepository";

export const locationRepository = new LocalStorageRepository<Location>("buwangwu.locations");
