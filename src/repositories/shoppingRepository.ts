import type { ShoppingItem } from "../types/shopping";
import { LocalStorageRepository } from "./localStorageRepository";

export const shoppingRepository = new LocalStorageRepository<ShoppingItem>("buwangwu.shopping");
