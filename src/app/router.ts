export type TaskSection = "reminders" | "shopping";
export type ItemFoundSource = "search" | "location";

export type Route =
  | { name: "find"; title: string; query?: string; locationId?: string }
  | { name: "search"; title: string; query?: string }
  | { name: "home"; title: string }
  | { name: "categories"; title: string }
  | { name: "item"; title: string; id: string; foundVia?: ItemFoundSource }
  | { name: "new"; title: string }
  | { name: "edit"; title: string; id: string }
  | { name: "private-items"; title: string }
  | { name: "rankings"; title: string }
  | { name: "locations"; title: string }
  | { name: "location"; title: string; id: string }
  | { name: "tasks"; title: string; section: TaskSection }
  | { name: "stats"; title: string }
  | { name: "settings"; title: string; returnTo?: "/" | "/home" };

export function navigate(path: string) {
  window.location.hash = path;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function getBackPath(route: Route): string | undefined {
  switch (route.name) {
    case "search": return "/";
    case "item": return "/";
    case "edit": return `/items/${route.id}`;
    case "private-items": return "/settings";
    case "categories": return "/home";
    case "rankings":
    case "stats": return "/home";
    case "tasks": return "/settings";
    case "locations": return "/home";
    case "location": return "/";
    case "settings": return route.returnTo ?? "/home";
    default: return undefined;
  }
}

export function parseRoute(pathWithQuery: string): Route {
  const [path, rawQuery = ""] = pathWithQuery.split("?", 2);
  const search = new URLSearchParams(rawQuery);

  if (path === "/items/new") return { name: "new", title: "添加物品" };
  if (path === "/items/private") return { name: "private-items", title: "私密库存" };
  if (path === "/home") return { name: "home", title: "我的家" };
  if (path === "/categories") return { name: "categories", title: "分类管理" };
  if (path === "/rankings") return { name: "rankings", title: "库存榜单" };
  if (path === "/locations") return { name: "locations", title: "存放位置" };
  if (path === "/search") return { name: "search", title: "搜索", query: search.get("q") ?? undefined };

  const locationMatch = path.match(/^\/locations\/([^/]+)$/);
  if (locationMatch) return { name: "location", title: "位置详情", id: decodeURIComponent(locationMatch[1]) };

  const editMatch = path.match(/^\/items\/edit\/([^/]+)$/);
  if (editMatch) return { name: "edit", title: "编辑物品", id: editMatch[1] };

  const itemMatch = path.match(/^\/items\/([^/]+)$/);
  if (itemMatch) {
    const foundVia = search.get("foundVia");
    const route: Route = {
      name: "item",
      title: "物品详情",
      id: itemMatch[1],
    };
    return foundVia === "search" || foundVia === "location" ? { ...route, foundVia } : route;
  }

  if (path === "/" || path === "/items") {
    return {
      name: "find",
      title: "勿忘我",
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
  if (path === "/settings") {
    const from = search.get("from");
    return {
      name: "settings",
      title: "设置",
      returnTo: from === "find" ? "/" : from === "home" ? "/home" : undefined,
    };
  }
  return { name: "find", title: "勿忘我" };
}
