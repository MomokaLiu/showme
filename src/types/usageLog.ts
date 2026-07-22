export type UsageActionType =
  | "purchase"
  | "consume"
  | "finish"
  | "discard"
  | "open"
  | "edit"
  | "restock";

export type UsageLog = {
  id: string;
  itemId: string;
  actionType: UsageActionType;
  quantityChange?: number;
  remainingQuantity?: number;
  note?: string;
  createdAt: string;
};
