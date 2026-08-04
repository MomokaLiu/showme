import type { ShoppingItem } from "../types/shopping";
import { IndexedDbRepository } from "./indexedDbRepository";

export const shoppingRepository = new IndexedDbRepository<ShoppingItem>("shoppingItems");
