import type { Item } from "../types/item";

export interface ReminderService {
  scheduleExpiryReminder(item: Item): Promise<void>;
  cancelReminder(itemId: string): Promise<void>;
  rescheduleReminder(item: Item): Promise<void>;
}

export const reminderService: ReminderService = {
  async scheduleExpiryReminder() {},
  async cancelReminder() {},
  async rescheduleReminder() {},
};
