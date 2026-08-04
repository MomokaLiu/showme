import { useEffect, useMemo, useState } from "react";
import DashboardPage from "./app/index";
import InventoryPage from "./app/items";
import ItemDetailPage from "./app/items/[id]";
import EditItemPage from "./app/items/edit/[id]";
import NewItemPage from "./app/items/new";
import PrivateInventoryPage from "./app/items/private";
import LocationDetailPage from "./app/locations/[id]";
import LocationsPage from "./app/locations";
import RankingsPage from "./app/rankings";
import SettingsPage from "./app/settings";
import StatsPage from "./app/stats";
import TasksPage from "./app/tasks";
import { navigate, parseRoute, type Route } from "./app/router";
import { useInventoryStore } from "./store/itemStore";

export function App() {
  const path = useHashPath();
  const route = useMemo(() => parseRoute(path), [path]);
  const { isLoaded } = useInventoryStore();

  return (
    <div className="phone-shell">
      <header className="app-header">
        <button className="icon-button app-header__brand" type="button" onClick={() => navigate("/")}>
          不忘物
        </button>
        <h1>{route.title}</h1>
        {route.name === "settings" ? (
          <span className="app-header__placeholder" aria-hidden="true" />
        ) : (
          <button className="icon-button" type="button" onClick={() => navigate("/settings")}>
            设置
          </button>
        )}
      </header>
      <main className="app-main">{isLoaded ? renderRoute(route) : <div className="loading">正在整理库存...</div>}</main>
      <nav className="tab-bar tab-bar--primary" aria-label="主导航">
        <TabButton active={route.name === "dashboard"} path="/" label="首页" icon="⌂" />
        <TabButton
          active={
            route.name === "items" ||
            route.name === "item" ||
            route.name === "private-items" ||
            route.name === "rankings" ||
            route.name === "locations" ||
            route.name === "location"
          }
          path="/items"
          label="库存"
          icon="▦"
        />
        <TabButton active={route.name === "new" || route.name === "edit"} path="/items/new" label="添加" icon="＋" emphasis />
        <TabButton active={route.name === "tasks"} path="/tasks" label="待办" icon="✓" />
        <TabButton active={route.name === "settings" || route.name === "stats"} path="/settings" label="设置" icon="⚙" />
      </nav>
    </div>
  );
}

function renderRoute(route: Route) {
  switch (route.name) {
    case "dashboard":
      return <DashboardPage />;
    case "items":
      return <InventoryPage initialQuery={route.query} initialLocationId={route.locationId} />;
    case "item":
      return <ItemDetailPage itemId={route.id} />;
    case "new":
      return <NewItemPage />;
    case "edit":
      return <EditItemPage itemId={route.id} />;
    case "private-items":
      return <PrivateInventoryPage />;
    case "rankings":
      return <RankingsPage />;
    case "locations":
      return <LocationsPage />;
    case "location":
      return <LocationDetailPage locationId={route.id} />;
    case "tasks":
      return <TasksPage initialSection={route.section} />;
    case "stats":
      return <StatsPage />;
    case "settings":
      return <SettingsPage />;
  }
}

function TabButton({
  active,
  path,
  label,
  icon,
  emphasis = false,
}: {
  active: boolean;
  path: string;
  label: string;
  icon: string;
  emphasis?: boolean;
}) {
  const classes = ["tab-button", active ? "tab-button--active" : "", emphasis ? "tab-button--emphasis" : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={classes} type="button" onClick={() => navigate(path)} aria-current={active ? "page" : undefined}>
      <b aria-hidden="true">{icon}</b>
      <span>{label}</span>
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
