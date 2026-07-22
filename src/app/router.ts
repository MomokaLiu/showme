export type Route =
  | { name: "dashboard"; title: string }
  | { name: "items"; title: string }
  | { name: "item"; title: string; id: string }
  | { name: "new"; title: string }
  | { name: "edit"; title: string; id: string }
  | { name: "expiring"; title: string }
  | { name: "shopping"; title: string }
  | { name: "stats"; title: string }
  | { name: "settings"; title: string };

export function navigate(path: string) {
  window.location.hash = path;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function parseRoute(path: string): Route {
  if (path === "/items/new") return { name: "new", title: "添加物品" };

  const editMatch = path.match(/^\/items\/edit\/([^/]+)$/);
  if (editMatch) return { name: "edit", title: "编辑物品", id: editMatch[1] };

  const itemMatch = path.match(/^\/items\/([^/]+)$/);
  if (itemMatch) return { name: "item", title: "物品详情", id: itemMatch[1] };

  if (path === "/items") return { name: "items", title: "库存" };
  if (path === "/expiring") return { name: "expiring", title: "临期提醒" };
  if (path === "/shopping") return { name: "shopping", title: "购物清单" };
  if (path === "/stats") return { name: "stats", title: "统计" };
  if (path === "/settings") return { name: "settings", title: "设置" };
  return { name: "dashboard", title: "首页" };
}
