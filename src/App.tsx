import { useEffect, useMemo, useState } from "react";
import DashboardPage from "./app/index";
import CategoriesPage from "./app/categories";
import MyHomePage from "./app/home";
import ItemDetailPage from "./app/items/[id]";
import EditItemPage from "./app/items/edit/[id]";
import NewItemPage from "./app/items/new";
import PrivateInventoryPage from "./app/items/private";
import LocationDetailPage from "./app/locations/[id]";
import LocationsPage from "./app/locations";
import RankingsPage from "./app/rankings";
import SearchPage from "./app/search";
import SettingsPage from "./app/settings";
import StatsPage from "./app/stats";
import TasksPage from "./app/tasks";
import { getBackPath, navigate, parseRoute, type Route } from "./app/router";
import { useInventoryStore } from "./store/itemStore";

export function App() {
  const path = useHashPath();
  const route = useMemo(() => parseRoute(path), [path]);
  const { isLoaded } = useInventoryStore();
  const isSoftKeyboardOpen = useSoftKeyboardOpen();
  const shellClassName = [
    "phone-shell",
    route.name === "search" ? "phone-shell--search" : "",
    isSoftKeyboardOpen ? "phone-shell--keyboard-open" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={shellClassName}>
      {route.name === "find" ? (
        <header className="app-header app-header--home">
          <div className="app-header__home-brand">
            <h1>勿忘我</h1>
            <span>不用翻箱倒柜，直接找到</span>
          </div>
          <button className="icon-button app-header__settings" type="button" onClick={() => navigate("/settings?from=find")} aria-label="设置">
            <SettingsIcon />
          </button>
          <TeaCupIllustration />
        </header>
      ) : (
        <header className={route.name === "home" ? "app-header app-header--my-home" : "app-header"}>
          {getBackPath(route) ? (
            <button className="icon-button app-header__back" type="button" onClick={() => navigate(getBackPath(route) ?? "/")} aria-label="返回">
              ←
            </button>
          ) : <span className="app-header__placeholder" aria-hidden="true" />}
          <h1>{route.title}</h1>
          {route.name === "home" ? (
            <button className="icon-button app-header__settings" type="button" onClick={() => navigate("/settings?from=home")} aria-label="设置">
              <SettingsIcon />
            </button>
          ) : <span className="app-header__placeholder" aria-hidden="true" />}
        </header>
      )}
      <main className="app-main">{isLoaded ? renderRoute(route) : <div className="loading">正在整理库存...</div>}</main>
      {route.name !== "search" && !isSoftKeyboardOpen ? <nav className="tab-bar tab-bar--primary" aria-label="主导航">
        <TabButton
          active={
            route.name === "find" ||
            route.name === "item"
          }
          path="/"
          label="找东西"
          icon="search"
        />
        <TabButton active={route.name === "new"} path="/items/new" label="添加" icon="add" emphasis />
        <TabButton
          active={route.name === "home" || route.name === "categories" || route.name === "settings" || route.name === "stats" || route.name === "rankings" || route.name === "tasks" || route.name === "private-items" || route.name === "locations" || route.name === "location"}
          path="/home"
          label="我的家"
          icon="home"
        />
      </nav> : null}
    </div>
  );
}

function renderRoute(route: Route) {
  switch (route.name) {
    case "find":
      return <DashboardPage initialQuery={route.query} initialLocationId={route.locationId} />;
    case "search":
      return <SearchPage initialQuery={route.query} />;
    case "home":
      return <MyHomePage />;
    case "categories":
      return <CategoriesPage />;
    case "item":
      return <ItemDetailPage itemId={route.id} foundVia={route.foundVia} />;
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
  icon: "search" | "add" | "home";
  emphasis?: boolean;
}) {
  const classes = ["tab-button", active ? "tab-button--active" : "", emphasis ? "tab-button--emphasis" : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={classes} type="button" onClick={() => navigate(path)} aria-current={active ? "page" : undefined}>
      <TabIcon name={icon} />
      <span>{label}</span>
    </button>
  );
}

function TabIcon({ name }: { name: "search" | "add" | "home" }) {
  if (name === "search") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>;
  }
  if (name === "add") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m3 11 9-7 9 7" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></svg>;
}

function SettingsIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.5 1A8 8 0 0 0 14.7 6L14.3 3h-4.6l-.4 3a8 8 0 0 0-1.7 1.1l-2.5-1-2 3.4L5.1 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.5-1A8 8 0 0 0 9.3 18l.4 3h4.6l.4-3a8 8 0 0 0 1.7-1.1l2.5 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z" /></svg>;
}

function TeaCupIllustration() {
  return (
    <div className="app-header__tea-art" aria-hidden="true">
      <svg viewBox="0 0 150 92">
        <ellipse className="tea-art__shadow" cx="91" cy="78" rx="46" ry="7" />
        <path className="tea-art__steam tea-art__steam--one" d="M75 29c-8-9 7-11 0-21" />
        <path className="tea-art__steam tea-art__steam--two" d="M94 28c-7-8 7-10 1-19" />
        <path className="tea-art__cup" d="M53 34h67v20c0 16-13 25-33.5 25S53 70 53 54V34Z" />
        <path className="tea-art__tea" d="M57 39c11 5 48 5 59 0" />
        <path className="tea-art__handle" d="M120 42h8c16 0 14 23-3 23h-9" />
        <path className="tea-art__leaf-stem" d="M35 70c8-18 18-31 34-43" />
        <path className="tea-art__leaf" d="M36 61c-13-1-19-8-19-17 11-2 20 4 22 13" />
        <path className="tea-art__leaf" d="M48 46c-3-11 2-20 12-24 5 10 1 20-8 26" />
      </svg>
    </div>
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

const SOFT_KEYBOARD_INPUT_TYPES = new Set(["", "text", "search", "email", "tel", "url", "password", "number"]);

function isSoftKeyboardTarget(target: EventTarget | Element | null): target is HTMLElement {
  if (!(target instanceof HTMLElement) || target.hasAttribute("disabled")) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement) return true;
  return target instanceof HTMLInputElement && SOFT_KEYBOARD_INPUT_TYPES.has(target.type);
}

function useSoftKeyboardOpen() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    let restingHeight = viewport?.height ?? window.innerHeight;
    let blurTimer: number | undefined;
    const currentHeight = () => viewport?.height ?? window.innerHeight;

    const updateFromViewport = () => {
      const height = currentHeight();
      const hasEditableFocus = isSoftKeyboardTarget(document.activeElement);
      if (!hasEditableFocus) {
        restingHeight = Math.max(restingHeight, height);
        setIsOpen(false);
        return;
      }
      setIsOpen(restingHeight - height > 120);
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!isSoftKeyboardTarget(event.target)) return;
      restingHeight = Math.max(restingHeight, currentHeight());
      setIsOpen(true);
    };

    const handleFocusOut = () => {
      window.clearTimeout(blurTimer);
      blurTimer = window.setTimeout(() => {
        if (!isSoftKeyboardTarget(document.activeElement)) setIsOpen(false);
      }, 0);
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    viewport?.addEventListener("resize", updateFromViewport);
    window.addEventListener("resize", updateFromViewport);
    return () => {
      window.clearTimeout(blurTimer);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      viewport?.removeEventListener("resize", updateFromViewport);
      window.removeEventListener("resize", updateFromViewport);
    };
  }, []);

  return isOpen;
}
