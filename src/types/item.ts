export type ItemStatus =
  | "normal"
  | "near_expiry"
  | "expired"
  | "finished"
  | "discarded"
  | "transferred"
  | "long_term";

export type ItemMode = "regular" | "consumable";

export type Item = {
  id: string;
  name: string;
  mode?: ItemMode;
  categoryId: string;
  quantity: number;
  initialQuantity: number;
  unit: string;
  purchaseDate?: string;
  expireDate?: string;
  shelfLifeDays?: number;
  openDate?: string;
  afterOpenDays?: number;
  finalExpireDate?: string;
  expiryReminderEnabled?: boolean;
  expiryReminderDays?: number;
  expiryReminderSnoozedUntil?: string;
  totalPrice?: number;
  unitPrice?: number;
  actualDailyCost?: number | null;
  locationId?: string;
  brand?: string;
  model?: string;
  purchaseChannel?: string;
  isPrivate?: boolean;
  imageUrls?: string[];
  /** @deprecated Kept only so existing single-image inventory can be migrated. */
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
