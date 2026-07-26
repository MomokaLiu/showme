import { useEffect, useMemo, useState } from "react";
import DashboardPage from "./app/index";
import ExpiringPage from "./app/expiring";
import InventoryPage from "./app/items";
import ItemDetailPage from "./app/items/[id]";
import EditItemPage from "./app/items/edit/[id]";
import NewItemPage from "./app/items/new";
import SettingsPage from "./app/settings";
import ShoppingPage from "./app/shopping";
import StatsPage from "./app/stats";
import { navigate, parseRoute, type Route } from "./app/router";
import { useInventoryStore } from "./store/itemStore";

export function App() {
  const path = useHashPath();
  const route = useMemo(() => parseRoute(path), [path]);
  const { isLoaded } = useInventoryStore();

  return (
    <div className="phone-shell">
      <header className="app-header">
        <button className="icon-button" type="button" onClick={() => navigate("/")}>
          不忘物
        </button>
        <h1>{route.title}</h1>
        <button className="icon-button" type="button" onClick={() => navigate("/settings")}>
          设置
        </button>
      </header>
      <main className="app-main">{isLoaded ? renderRoute(route) : <div className="loading">正在整理库存...</div>}</main>
      <nav className="tab-bar" aria-label="主导航">
        <TabButton active={route.name === "dashboard"} path="/" label="首页" />
        <TabButton active={route.name === "items" || route.name === "item"} path="/items" label="库存" />
        <TabButton active={route.name === "expiring"} path="/expiring" label="临期" />
        <TabButton active={route.name === "shopping"} path="/shopping" label="清单" />
        <TabButton active={route.name === "stats"} path="/stats" label="统计" />
      </nav>
    </div>
  );
}

function renderRoute(route: Route) {
  switch (route.name) {
    case "dashboard":
      return <DashboardPage />;
    case "items":
      return <InventoryPage />;
    case "item":
      return <ItemDetailPage itemId={route.id} />;
    case "new":
      return <NewItemPage />;
    case "edit":
      return <EditItemPage itemId={route.id} />;
    case "expiring":
      return <ExpiringPage />;
    case "shopping":
      return <ShoppingPage />;
    case "stats":
      return <StatsPage />;
    case "settings":
      return <SettingsPage />;
  }
}

function TabButton({ active, path, label }: { active: boolean; path: string; label: string }) {
  return (
    <button className={active ? "tab-button tab-button--active" : "tab-button"} type="button" onClick={() => navigate(path)}>
      {label}
    </button>
  );
}

function useHashPath() {
  const [path, setPath] = useState(() => normalizeHashPath(window.location.hash));

  useEffect(() => {
    const listener = () => setPath(normalizeHashPath(window.location.hash));
    window.addEventListener("hashchange", listener);
    if (!window.location.hash) navigate("/");
    return () => window.removeEventListener("hashchange", listener);
  }, []);

  return path;
}

function normalizeHashPath(hash: string): string {
  return hash.replace(/^#/, "") || "/";
}
