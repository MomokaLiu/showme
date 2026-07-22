import type { Category } from "../types/category";
import { LocalStorageRepository } from "./localStorageRepository";

export const categoryRepository = new LocalStorageRepository<Category>("buwangwu.categories");
