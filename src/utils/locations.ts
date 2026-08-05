import type { Location } from "../types/location";

export function normalizeLocations(locations: Location[]): Location[] {
  const ids = new Set(locations.map((location) => location.id));
  return locations.map((location) => {
    const parentId = location.parentId && ids.has(location.parentId) && location.parentId !== location.id
      ? location.parentId
      : undefined;
    return {
      ...location,
      parentId,
      kind: parentId ? "container" : "area",
    };
  });
}

export function sortLocations(locations: Location[]): Location[] {
  return [...locations].sort(
    (left, right) =>
      (left.sortOrder ?? 999) - (right.sortOrder ?? 999) || left.name.localeCompare(right.name),
  );
}

export function getLocationPath(locations: Location[], id?: string): string {
  if (!id) return "未设置";
  const location = locations.find((candidate) => candidate.id === id);
  if (!location) return "未设置";
  const parent = location.parentId
    ? locations.find((candidate) => candidate.id === location.parentId)
    : undefined;
  return parent ? `${parent.name} › ${location.name}` : location.name;
}

export function getLocationDescendantIds(locations: Location[], id: string): string[] {
  return [id, ...locations.filter((location) => location.parentId === id).map((location) => location.id)];
}

export function getLocationGroups(locations: Location[]) {
  const active = sortLocations(locations.filter((location) => !location.isArchived));
  const areas = active.filter((location) => !location.parentId);
  return areas.map((area) => ({
    area,
    containers: active.filter((location) => location.parentId === area.id),
  }));
}
