const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
});

export function toDateInputValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateOnly(value?: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

export function addDays(dateString: string, days: number): string {
  const date = parseDateOnly(dateString);
  if (!date) return dateString;
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

export function diffInCalendarDays(target?: string, base = toDateInputValue()): number | undefined {
  const targetDate = parseDateOnly(target);
  const baseDate = parseDateOnly(base);
  if (!targetDate || !baseDate) return undefined;
  const millisPerDay = 24 * 60 * 60 * 1000;
  return Math.round((targetDate.getTime() - baseDate.getTime()) / millisPerDay);
}

export function daysBetween(start?: string, end?: string): number | undefined {
  const diff = diffInCalendarDays(end, start);
  if (diff === undefined) return undefined;
  return Math.max(1, diff);
}

export function isSameMonth(dateString: string | undefined, month: string): boolean {
  return Boolean(dateString && dateString.startsWith(month));
}

export function getCurrentMonth(): string {
  return toDateInputValue().slice(0, 7);
}

export function formatShortDate(dateString?: string): string {
  const date = parseDateOnly(dateString);
  if (!date) return "未设置";
  return dateFormatter.format(date);
}

export function minDateString(...dates: Array<string | undefined>): string | undefined {
  const validDates = dates.filter(Boolean) as string[];
  if (validDates.length === 0) return undefined;
  return validDates.sort()[0];
}
