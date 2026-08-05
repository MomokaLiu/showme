export type Location = {
  id: string;
  name: string;
  kind?: "area" | "container";
  parentId?: string;
  isArchived?: boolean;
  sortOrder?: number;
};
