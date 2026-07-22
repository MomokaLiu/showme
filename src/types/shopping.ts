export type ShoppingItem = {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  estimatedPrice?: number;
  note?: string;
  isPurchased: boolean;
  createdAt: string;
  updatedAt: string;
};
