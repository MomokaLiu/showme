export type ShoppingItem = {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  estimatedPrice?: number;
  note?: string;
  isPurchased: boolean;
  sourceItemId?: string;
  purchasedAt?: string;
  convertedItemId?: string;
  createdAt: string;
  updatedAt: string;
};
