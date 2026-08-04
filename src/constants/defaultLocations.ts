import type { Location } from "../types/location";

export const defaultLocations: Location[] = [
  { id: "fridge", name: "冰箱冷藏", sortOrder: 0 },
  { id: "freezer", name: "冰箱冷冻", sortOrder: 1 },
  { id: "kitchen", name: "厨房柜子", sortOrder: 2 },
  { id: "bathroom", name: "卫生间", sortOrder: 3 },
  { id: "bedroom", name: "卧室", sortOrder: 4 },
  { id: "living_room", name: "客厅", sortOrder: 5 },
  { id: "storage_box", name: "收纳箱", sortOrder: 6 },
  { id: "other", name: "其他", sortOrder: 7 },
];
