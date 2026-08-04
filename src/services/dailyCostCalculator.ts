import { diffInCalendarDays, toDateInputValue } from "../utils/dateUtils";

type DailyCostSource = {
  purchaseDate?: string | null;
  totalPrice?: number | null;
};

export function calculateActualDailyCost(
  item: DailyCostSource,
  asOfDate = toDateInputValue(),
): number | null {
  if (item.totalPrice === undefined || item.totalPrice === null || !item.purchaseDate) {
    return null;
  }

  const usageDays = diffInCalendarDays(asOfDate, item.purchaseDate);
  if (usageDays === undefined || usageDays <= 0) return null;
  return item.totalPrice / usageDays;
}
