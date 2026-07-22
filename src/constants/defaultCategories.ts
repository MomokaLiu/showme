import type { Category } from "../types/category";

export const defaultCategories: Category[] = [
  { id: "food", name: "食品", defaultReminderDays: 7 },
  { id: "fresh", name: "生鲜", defaultShelfLifeDays: 3, defaultReminderDays: 2 },
  { id: "drink", name: "饮品", defaultReminderDays: 7 },
  { id: "snack", name: "零食", defaultReminderDays: 14 },
  { id: "medicine", name: "药品", defaultReminderDays: 30 },
  { id: "skincare", name: "护肤", defaultReminderDays: 30 },
  { id: "cleaning", name: "清洁用品", defaultReminderDays: 30 },
  { id: "daily", name: "日用品", defaultReminderDays: 30 },
  { id: "digital", name: "数码产品" },
  { id: "document", name: "证件文件" },
  { id: "other", name: "其他" },
];
