import type { Item, ItemStatus } from "../types/item";
import { addDays, daysBetween, diffInCalendarDays, minDateString, toDateInputValue } from "./dateUtils";

export const DEFAULT_REMINDER_DAYS = 7;

export function calculateFinalExpireDate(item: Item): string | undefined {
  const packageExpireDate =
    item.expireDate ||
    (item.purchaseDate && item.shelfLifeDays !== undefined
      ? addDays(item.purchaseDate, item.shelfLifeDays)
      : undefined);
  const openedExpireDate =
    item.openDate && item.afterOpenDays !== undefined
      ? addDays(item.openDate, item.afterOpenDays)
      : undefined;

  return minDateString(packageExpireDate, openedExpireDate);
}

export function getRemainingDays(expireDate?: string): number | undefined {
  return diffInCalendarDays(expireDate);
}

export function getItemStatus(item: Item, reminderDays = DEFAULT_REMINDER_DAYS): ItemStatus {
  if (item.status === "finished" || item.status === "discarded" || item.status === "transferred") {
    return item.status;
  }

  const finalExpireDate = calculateFinalExpireDate(item) || item.finalExpireDate;
  const remainingDays = getRemainingDays(finalExpireDate);

  if (remainingDays === undefined) {
    return item.status === "long_term" ? "long_term" : "normal";
  }

  if (remainingDays < 0) return "expired";
  if (remainingDays <= reminderDays) return "near_expiry";
  return "normal";
}

export function calculateUnitPrice(
  totalPrice?: number,
  initialQuantity?: number,
): number | undefined {
  if (totalPrice === undefined || initialQuantity === undefined || initialQuantity <= 0) {
    return undefined;
  }
  return totalPrice / initialQuantity;
}

export function calculateCurrentValue(item: Item): number {
  if (item.status === "finished" || item.status === "discarded") return 0;
  const unitPrice = item.unitPrice ?? calculateUnitPrice(item.totalPrice, item.initialQuantity);
  if (!unitPrice) return 0;
  return Math.max(0, item.quantity) * unitPrice;
}

export function calculateShelfLifeDailyCost(item: Item): number | undefined {
  if (!item.totalPrice || item.totalPrice <= 0) return undefined;
  const finalExpireDate = calculateFinalExpireDate(item) || item.finalExpireDate;
  const effectiveDays =
    daysBetween(item.purchaseDate, finalExpireDate) ??
    (item.shelfLifeDays && item.shelfLifeDays > 0 ? item.shelfLifeDays : undefined);
  if (!effectiveDays) return undefined;
  return item.totalPrice / effectiveDays;
}

export function calculateActualDailyCost(item: Item, asOfDate = toDateInputValue()): number | undefined {
  if (!item.totalPrice || item.totalPrice <= 0) return undefined;

  let actualEndDate: string | undefined;
  if (item.status === "finished") {
    actualEndDate = item.finishDate;
  } else {
    if (item.status === "discarded" || item.status === "transferred") return undefined;
    const finalExpireDate = calculateFinalExpireDate(item) || item.finalExpireDate;
    if (finalExpireDate) return undefined;
    actualEndDate = asOfDate;
  }

  const actualDays = daysBetween(item.purchaseDate, actualEndDate);
  if (!actualDays) return undefined;
  return item.totalPrice / actualDays;
}

export function calculateWasteAmount(item: Item, discardedQuantity: number): number {
  const unitPrice = item.unitPrice ?? calculateUnitPrice(item.totalPrice, item.initialQuantity);
  if (!unitPrice || discardedQuantity <= 0) return 0;
  return discardedQuantity * unitPrice;
}

export function isLowStock(item: Item): boolean {
  if (item.status === "finished" || item.status === "discarded" || item.quantity <= 0) return false;
  if (item.initialQuantity <= 1) return item.quantity <= 0.2;
  return item.quantity <= 1 || item.quantity / item.initialQuantity <= 0.2;
}

export function enrichItem(item: Item, reminderDays = DEFAULT_REMINDER_DAYS): Item {
  const finalExpireDate = calculateFinalExpireDate(item);
  const unitPrice = calculateUnitPrice(item.totalPrice, item.initialQuantity);
  const nextItem = {
    ...item,
    finalExpireDate,
    unitPrice,
  };
  return {
    ...nextItem,
    status: getItemStatus(nextItem, reminderDays),
  };
}
