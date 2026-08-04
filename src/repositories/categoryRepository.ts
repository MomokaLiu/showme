import type { Category } from "../types/category";
import { IndexedDbRepository } from "./indexedDbRepository";

export const categoryRepository = new IndexedDbRepository<Category>("categories");
