import { Capacitor } from "@capacitor/core";
import { LocalNotifications, type PermissionStatus } from "@capacitor/local-notifications";
import type { Item } from "../types/item";

const CHANNEL_ID = "expiry-reminders";
const DEFAULT_REMINDER_DAYS = 7;

export interface ReminderService {
  getPermissionStatus(): Promise<PermissionStatus["display"] | "unsupported">;
  requestPermission(): Promise<PermissionStatus["display"] | "unsupported">;
  scheduleExpiryReminder(item: Item): Promise<void>;
  cancelReminder(itemId: string): Promise<void>;
  rescheduleReminder(item: Item): Promise<void>;
  reconcile(items: Item[]): Promise<void>;
  initialize(): Promise<void>;
}

export const reminderService: ReminderService = {
  async getPermissionStatus() {
    if (!Capacitor.isNativePlatform()) return "unsupported";
    return (await LocalNotifications.checkPermissions()).display;
  },

  async requestPermission() {
    if (!Capacitor.isNativePlatform()) return "unsupported";
    const current = await LocalNotifications.checkPermissions();
    if (current.display === "granted") return current.display;
    return (await LocalNotifications.requestPermissions()).display;
  },

  async scheduleExpiryReminder(item) {
    if (!(await canSchedule(item))) return;
    const at = getReminderDate(item);
    if (!at || at.getTime() <= Date.now()) return;
    await ensureAndroidChannel();
    await LocalNotifications.schedule({
      notifications: [
        {
          id: getNotificationId(item.id),
          title: `${item.name}需要关注`,
          body: createReminderBody(item),
          schedule: { at, allowWhileIdle: false },
          channelId: CHANNEL_ID,
          autoCancel: true,
          extra: { kind: "expiry", itemId: item.id },
        },
      ],
    });
  },

  async cancelReminder(itemId) {
    if (!Capacitor.isNativePlatform()) return;
    await LocalNotifications.cancel({ notifications: [{ id: getNotificationId(itemId) }] });
  },

  async rescheduleReminder(item) {
    await this.cancelReminder(item.id);
    await this.scheduleExpiryReminder(item);
  },

  async reconcile(items) {
    if (!Capacitor.isNativePlatform()) return;
    const permission = await this.getPermissionStatus();
    if (permission !== "granted") return;
    const pending = await LocalNotifications.getPending();
    const managedIds = pending.notifications
      .filter((notification) => notification.extra?.kind === "expiry")
      .map((notification) => ({ id: notification.id }));
    if (managedIds.length) await LocalNotifications.cancel({ notifications: managedIds });
    for (const item of items) await this.scheduleExpiryReminder(item);
  },

  async initialize() {
    if (!Capacitor.isNativePlatform()) return;
    await ensureAndroidChannel();
    await LocalNotifications.addListener("localNotificationActionPerformed", ({ notification }) => {
      const itemId = notification.extra?.itemId;
      if (typeof itemId === "string") window.location.hash = `/items/${itemId}`;
    });
  },
};

export function getReminderDate(item: Item): Date | undefined {
  if (item.expiryReminderSnoozedUntil) {
    const snoozed = new Date(item.expiryReminderSnoozedUntil);
    if (Number.isFinite(snoozed.getTime()) && snoozed.getTime() > Date.now()) return snoozed;
  }
  if (!item.finalExpireDate) return undefined;
  const at = new Date(`${item.finalExpireDate}T09:00:00`);
  if (!Number.isFinite(at.getTime())) return undefined;
  at.setDate(at.getDate() - (item.expiryReminderDays ?? DEFAULT_REMINDER_DAYS));
  return at;
}

function createReminderBody(item: Item): string {
  if (!item.finalExpireDate) return "请打开勿忘我查看详情。";
  return `预计 ${item.finalExpireDate} 到期，点此查看存放位置和处理方式。`;
}

async function canSchedule(item: Item): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  if (item.expiryReminderEnabled === false || !item.finalExpireDate) return false;
  if (["finished", "discarded", "transferred"].includes(item.status)) return false;
  return (await LocalNotifications.checkPermissions()).display === "granted";
}

async function ensureAndroidChannel(): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;
  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: "物品到期提醒",
    description: "提醒即将到期或需要处理的物品",
    importance: 4,
    visibility: 1,
  });
}

function getNotificationId(itemId: string): number {
  let hash = 0;
  for (let index = 0; index < itemId.length; index += 1) hash = Math.imul(31, hash) + itemId.charCodeAt(index) | 0;
  return hash || 1;
}
