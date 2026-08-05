import { useEffect, useMemo, useState, type FormEvent } from "react";
import { EmptyState } from "../components/EmptyState";
import { ItemCard } from "../components/ItemCard";
import { loadInventoryViewMode, saveInventoryViewMode, type InventoryViewMode } from "../services/inventoryViewStorage";
import { searchInventory, type InventorySearchSort } from "../services/inventorySearch";
import { recordLocalProductEvent } from "../services/localProductMetrics";
import { useInventoryStore } from "../store/itemStore";
import type { ItemStatus } from "../types/item";
import { getLocationDescendantIds, getLocationGroups, sortLocations } from "../utils/locations";
import { getExpiredItems, getExpiringItems } from "../utils/statistics";
import { navigate } from "./router";

type StatusFilter = "all" | Extract<ItemStatus, "normal" | "near_expiry" | "expired" | "finished" | "discarded">;

export default function FindPage({
  initialQuery = "",
  initialLocationId,
}: {
  initialQuery?: string;
  initialLocationId?: string;
}) {
  const {
    items,
    categories,
    locations,
    shoppingItems,
    getCategoryName,
    getLocationPath,
    updateItem,
  } = useInventoryStore();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [categoryId, setCategoryId] = useState("all");
  const [locationId, setLocationId] = useState(initialLocationId === "" ? "missing" : initialLocationId || "all");
  const [sort, setSort] = useState<InventorySearchSort>(initialQuery ? "relevance" : "updated");
  const [filtersOpen, setFiltersOpen] = useState(initialLocationId !== undefined);
  const [viewMode, setViewMode] = useState<InventoryViewMode>(() => loadInventoryViewMode());
  const [movingItemId, setMovingItemId] = useState<string>();
  const [message, setMessage] = useState("");

  useEffect(() => {
    setQuery(initialQuery);
    setLocationId(initialLocationId === "" ? "missing" : initialLocationId || "all");
    setSort(initialQuery ? "relevance" : "updated");
  }, [initialLocationId, initialQuery]);

  const publicItems = items.filter((item) => !item.isPrivate);
  const activeItems = publicItems.filter((item) => item.status !== "finished" && item.status !== "discarded");
  const incompleteItems = activeItems.filter((item) => !item.locationId);
  const activeCategories = categories.filter((category) => !category.isArchived);
  const activeLocations = sortLocations(locations.filter((location) => !location.isArchived));
  const locationGroups = getLocationGroups(locations);
  const reminderCount = getExpiringItems(publicItems, 7).length + getExpiredItems(publicItems).length;
  const shoppingCount = shoppingItems.filter((item) => !item.isPurchased).length;

  const visibleItems = useMemo(() => {
    const locationIds = locationId !== "all" && locationId !== "missing"
      ? new Set(getLocationDescendantIds(locations, locationId))
      : undefined;
    return searchInventory(
      publicItems,
      {
        text: query,
        status: status === "all" ? undefined : status,
        categoryId: categoryId === "all" ? undefined : categoryId,
        missingLocation: locationId === "missing",
        sort,
      },
      { getCategoryName, getLocationName: getLocationPath },
    ).filter((item) => !locationIds || (item.locationId ? locationIds.has(item.locationId) : false));
  }, [categoryId, getCategoryName, getLocationPath, locationId, locations, publicItems, query, sort, status]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    if (query.trim() && visibleItems.length === 0) recordLocalProductEvent("search_no_result");
  }

  function clearFilters() {
    setQuery("");
    setStatus("all");
    setCategoryId("all");
    setLocationId("all");
    setSort("updated");
  }

  function changeViewMode(mode: InventoryViewMode) {
    setViewMode(mode);
    saveInventoryViewMode(mode);
  }

  function confirmFound() {
    recordLocalProductEvent("item_found");
    setMessage("太好了，已记下这次成功找到。");
  }

  async function moveItem(itemId: string, nextLocationId: string) {
    await updateItem(itemId, { locationId: nextLocationId || undefined });
    setMovingItemId(undefined);
    setMessage(nextLocationId ? `已移动到${getLocationPath(nextLocationId)}。` : "已设为待归位。");
  }

  const hasFilters = Boolean(query) || status !== "all" || categoryId !== "all" || locationId !== "all";
  const activeFilterCount = Number(status !== "all") + Number(categoryId !== "all") + Number(locationId !== "all");

  return (
    <div className="page-stack find-page">
      <section className="home-search-panel">
        <span>不翻箱倒柜，直接找到</span>
        <h2>东西放哪了？</h2>
        <form className="home-search" onSubmit={submitSearch}>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (event.target.value && sort !== "relevance") setSort("relevance");
            }}
            placeholder="搜索物品或位置"
            aria-label="搜索物品或位置"
          />
          <button type="submit">查找</button>
        </form>
        <div className="home-primary-actions">
          <button className="primary-button" type="button" onClick={() => navigate("/items/new")}>＋ 记一件物品</button>
          <button className="text-button" type="button" onClick={() => navigate("/locations")}>按位置找 →</button>
        </div>
      </section>

      {message ? <p className="find-feedback" role="status">{message}</p> : null}

      {incompleteItems.length || reminderCount || shoppingCount ? (
        <section className="find-context-strip" aria-label="待处理事项">
          {incompleteItems.length ? <button type="button" onClick={() => { setLocationId("missing"); setFiltersOpen(true); }}>{incompleteItems.length} 件待归位</button> : null}
          {reminderCount ? <button type="button" onClick={() => navigate("/tasks")}>{reminderCount} 项到期提醒</button> : null}
          {shoppingCount ? <button type="button" onClick={() => navigate("/tasks/shopping")}>{shoppingCount} 项待购买</button> : null}
        </section>
      ) : null}

      <section className="find-location-section">
        <div className="section-title">
          <div><h2>按位置找</h2><span>区域和具体位置</span></div>
          <button className="text-button" type="button" onClick={() => navigate("/locations")}>管理</button>
        </div>
        <div className="find-location-grid">
          {locationGroups.slice(0, 4).map(({ area }) => {
            const ids = new Set(getLocationDescendantIds(locations, area.id));
            const count = activeItems.filter((item) => item.locationId && ids.has(item.locationId)).length;
            return <button key={area.id} type="button" onClick={() => navigate(`/locations/${encodeURIComponent(area.id)}`)}><strong>{area.name}</strong><span>{count} 件</span></button>;
          })}
        </div>
      </section>

      <section className="find-inventory-section">
        <div className="section-title find-inventory-heading">
          <div><h2>{query ? "查找结果" : "全部物品"}</h2><span>{visibleItems.length} 件</span></div>
          <div className="view-mode-toggle" role="group" aria-label="物品显示模式">
            <button type="button" className={viewMode === "list" ? "is-active" : ""} aria-pressed={viewMode === "list"} onClick={() => changeViewMode("list")}>☰</button>
            <button type="button" className={viewMode === "grid" ? "is-active" : ""} aria-pressed={viewMode === "grid"} onClick={() => changeViewMode("grid")}>▦</button>
          </div>
        </div>

        <div className="inventory-toolbar">
          <button className={activeFilterCount ? "filter-trigger is-active" : "filter-trigger"} type="button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}>
            筛选{activeFilterCount ? ` · ${activeFilterCount}` : ""}
          </button>
          <label className="inventory-sort-control">
            <span className="sr-only">排序</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as InventorySearchSort)}>
              {query ? <option value="relevance">最相关</option> : null}
              <option value="updated">最近更新</option>
              <option value="expire">即将过期</option>
              <option value="purchase">最近购买</option>
            </select>
          </label>
        </div>

        {filtersOpen ? <div className="inventory-filter-grid">
          <label><span>状态</span><select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}><option value="all">全部状态</option><option value="normal">正常</option><option value="near_expiry">临期</option><option value="expired">已过期</option><option value="finished">已用完</option><option value="discarded">已丢弃</option></select></label>
          <label><span>位置</span><select value={locationId} onChange={(event) => setLocationId(event.target.value)}><option value="all">全部位置</option><option value="missing">待归位</option>{locationGroups.map(({ area, containers }) => <optgroup key={area.id} label={area.name}><option value={area.id}>{area.name}（全部）</option>{containers.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</optgroup>)}</select></label>
          <label><span>分类</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="all">全部分类</option>{activeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        </div> : null}

        {visibleItems.length ? (
          <div className={viewMode === "grid" ? "inventory-grid" : "list-stack"}>
            {visibleItems.map((item) => (
              <div className="find-result-card" key={item.id}>
                <ItemCard item={item} categoryName={getCategoryName(item.categoryId)} locationName={getLocationPath(item.locationId)} viewMode={viewMode} onClick={() => navigate(`/items/${item.id}`)} />
                {viewMode === "list" ? <div className="find-result-actions">
                  <button type="button" onClick={confirmFound}>找到了</button>
                  <button type="button" onClick={() => setMovingItemId((current) => current === item.id ? undefined : item.id)}>移动位置</button>
                </div> : null}
                {movingItemId === item.id ? <div className="find-quick-move"><label><span>移动到</span><select value={item.locationId ?? ""} onChange={(event) => void moveItem(item.id, event.target.value)}><option value="">待归位</option>{locationGroups.map(({ area, containers }) => <optgroup key={area.id} label={area.name}><option value={area.id}>{area.name}</option>{containers.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</optgroup>)}</select></label></div> : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title={hasFilters ? "没有找到符合条件的物品" : "先记下第一件物品"}
            description={hasFilters ? "换个关键词或清除筛选，也可以直接添加正在寻找的物品。" : "只需名称和位置，下次几秒就能找到。"}
            action={<div className="empty-actions">{hasFilters ? <button type="button" onClick={clearFilters}>清除筛选</button> : null}<button className="primary-button" type="button" onClick={() => navigate(`/items/new${query ? `?name=${encodeURIComponent(query)}` : ""}`)}>{query ? `添加“${query}”` : "记一件物品"}</button></div>}
          />
        )}
      </section>
    </div>
  );
}
