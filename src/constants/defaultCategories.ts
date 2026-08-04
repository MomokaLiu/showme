import type { Category } from "../types/category";

export const defaultCategories: Category[] = [
  { id: "food", name: "食品", defaultReminderDays: 7, sortOrder: 0 },
  { id: "fresh", name: "生鲜", defaultShelfLifeDays: 3, defaultReminderDays: 2, sortOrder: 1 },
  { id: "drink", name: "饮品", defaultReminderDays: 7, sortOrder: 2 },
  { id: "snack", name: "零食", defaultReminderDays: 14, sortOrder: 3 },
  { id: "medicine", name: "药品", defaultReminderDays: 30, sortOrder: 4 },
  { id: "skincare", name: "护肤", defaultReminderDays: 30, sortOrder: 5 },
  { id: "cleaning", name: "清洁用品", defaultReminderDays: 30, sortOrder: 6 },
  { id: "daily", name: "日用品", defaultReminderDays: 30, sortOrder: 7 },
  { id: "digital", name: "数码产品", sortOrder: 8 },
  { id: "document", name: "证件文件", sortOrder: 9 },
  { id: "other", name: "其他", sortOrder: 10 },
];
