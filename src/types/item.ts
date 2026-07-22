export type ItemStatus =
  | "normal"
  | "near_expiry"
  | "expired"
  | "finished"
  | "discarded"
  | "transferred"
  | "long_term";

export type Item = {
  id: string;
  name: string;
  categoryId: string;
  quantity: number;
  initialQuantity: number;
  unit: string;
  purchaseDate: string;
  expireDate?: string;
  shelfLifeDays?: number;
  openDate?: string;
  afterOpenDays?: number;
  finalExpireDate?: string;
  totalPrice?: number;
  unitPrice?: number;
  locationId?: string;
  brand?: string;
  purchaseChannel?: string;
  imageUrl?: string;
  tags?: string[];
  note?: string;
  status: ItemStatus;
  finishDate?: string;
  discardDate?: string;
  createdAt: string;
  updatedAt: string;
};

export type ItemDraft = Omit<
  Item,
  "id" | "status" | "finalExpireDate" | "unitPrice" | "createdAt" | "updatedAt"
> & {
  status?: ItemStatus;
};
