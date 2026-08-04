import type { Location } from "../types/location";
import { IndexedDbRepository } from "./indexedDbRepository";

export const locationRepository = new IndexedDbRepository<Location>("locations");
