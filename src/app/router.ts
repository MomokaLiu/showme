export type TaskSection = "reminders" | "shopping";

export type Route =
  | { name: "find"; title: string; query?: string; locationId?: string }
  | { name: "item"; title: string; id: string }
  | { name: "new"; title: string }
  | { name: "edit"; title: string; id: string }
  | { name: "private-items"; title: string }
  | { name: "rankings"; title: string }
  | { name: "locations"; title: string }
  | { name: "location"; title: string; id: string }
  | { name: "tasks"; title: string; section: TaskSection }
  | { name: "stats"; title: string }
  | { name: "settings"; title: string };

export function navigate(path: string) {
  window.location.hash = path;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function parseRoute(pathWithQuery: string): Route {
  const [path, rawQuery = ""] = pathWithQuery.split("?", 2);
  const search = new URLSearchParams(rawQuery);

  if (path === "/items/new") return { name: "new", title: "添加物品" };
  if (path === "/items/private") return { name: "private-items", title: "私密库存" };
  if (path === "/rankings") return { name: "rankings", title: "库存榜单" };
  if (path === "/locations") return { name: "locations", title: "存放位置" };

  const locationMatch = path.match(/^\/locations\/([^/]+)$/);
  if (locationMatch) return { name: "location", title: "位置详情", id: decodeURIComponent(locationMatch[1]) };

  const editMatch = path.match(/^\/items\/edit\/([^/]+)$/);
  if (editMatch) return { name: "edit", title: "编辑物品", id: editMatch[1] };

  const itemMatch = path.match(/^\/items\/([^/]+)$/);
  if (itemMatch) return { name: "item", title: "物品详情", id: itemMatch[1] };

  if (path === "/" || path === "/items") {
    return {
      name: "find",
      title: "找东西",
      query: search.get("q") ?? undefined,
      locationId: search.get("location") ?? undefined,
    };
  }
  if (path === "/tasks" || path === "/expiring") {
    return { name: "tasks", title: "待办", section: "reminders" };
  }
  if (path === "/tasks/shopping" || path === "/shopping") {
    return { name: "tasks", title: "待办", section: "shopping" };
  }
  if (path === "/insights" || path === "/stats") return { name: "stats", title: "数据洞察" };
  if (path === "/settings") return { name: "settings", title: "设置" };
  return { name: "find", title: "找东西" };
}
