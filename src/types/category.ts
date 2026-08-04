export type Category = {
  id: string;
  name: string;
  icon?: string;
  defaultShelfLifeDays?: number;
  defaultReminderDays?: number;
  isArchived?: boolean;
  sortOrder?: number;
};
