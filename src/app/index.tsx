import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { ItemCard } from "../components/ItemCard";
import { searchInventory, type InventorySearchSort } from "../services/inventorySearch";
import { useInventoryStore } from "../store/itemStore";
import type { ItemStatus } from "../types/item";
import { getLocationDescendantIds, getLocationGroups } from "../utils/locations";
import { getLocationSymbol } from "../utils/locationPresentation";
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
    deleteItem,
  } = useInventoryStore();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [categoryId, setCategoryId] = useState("all");
  const [locationId, setLocationId] = useState(initialLocationId === "" ? "missing" : initialLocationId || "all");
  const [sort, setSort] = useState<InventorySearchSort>(initialQuery ? "relevance" : "updated");
  const [sortOpen, setSortOpen] = useState(false);
  const [actionItemId, setActionItemId] = useState<string>();
  const [deleteConfirmItemId, setDeleteConfirmItemId] = useState<string>();

  useEffect(() => {
    setQuery(initialQuery);
    setLocationId(initialLocationId === "" ? "missing" : initialLocationId || "all");
    setSort(initialQuery ? "relevance" : "updated");
  }, [initialLocationId, initialQuery]);

  useEffect(() => {
    if (!sortOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSortOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [sortOpen]);

  const publicItems = items.filter((item) => !item.isPrivate);
  const activeItems = publicItems.filter((item) => item.status !== "finished" && item.status !== "discarded");
  const incompleteItems = activeItems.filter((item) => !item.locationId);
  const activeCategories = categories.filter((category) => !category.isArchived);
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

  function clearFilters() {
    setQuery("");
    setStatus("all");
    setCategoryId("all");
    setLocationId("all");
    setSort("updated");
  }

  function clearFacetFilters() {
    setStatus("all");
    setCategoryId("all");
    setLocationId("all");
  }

  const hasFilters = Boolean(query) || status !== "all" || categoryId !== "all" || locationId !== "all";
  const foundVia = query ? "search" : locationId !== "all" ? "location" : undefined;
  const actionItem = items.find((item) => item.id === actionItemId);

  function closeItemActions() {
    setActionItemId(undefined);
    setDeleteConfirmItemId(undefined);
  }

  async function confirmDeleteItem() {
    if (!deleteConfirmItemId) return;
    await deleteItem(deleteConfirmItemId);
    closeItemActions();
  }

  return (
    <div className="page-stack find-page">
      <section className="home-search-panel home-search-panel--compact" aria-label="搜索">
        <button
          className="home-search-entry"
          type="button"
          onClick={() => navigate(`/search${query ? `?q=${encodeURIComponent(query)}` : ""}`)}
          aria-label="进入搜索"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
          <span>{query || "搜索物品、品牌或位置"}</span>
          <b aria-hidden="true">›</b>
        </button>
      </section>

      {incompleteItems.length || reminderCount || shoppingCount ? (
        <section className="find-context-strip" aria-label="待处理事项">
          {incompleteItems.length ? <button type="button" onClick={() => setLocationId("missing")}>{incompleteItems.length} 件待归位</button> : null}
          {reminderCount ? <button type="button" onClick={() => navigate("/tasks")}>{reminderCount} 项到期提醒</button> : null}
          {shoppingCount ? <button type="button" onClick={() => navigate("/tasks/shopping")}>{shoppingCount} 项待购买</button> : null}
        </section>
      ) : null}

      <section className="find-location-section">
        <div className="section-title find-location-heading">
          <div><h2>按位置找</h2><span>常用位置</span></div>
        </div>
        <div className="find-location-scroll" aria-label="按位置浏览">
          {locationGroups.map(({ area }, index) => {
            const ids = new Set(getLocationDescendantIds(locations, area.id));
            const count = activeItems.filter((item) => item.locationId && ids.has(item.locationId)).length;
            return (
              <button className={`location-pill location-pill--${index % 6}`} key={area.id} type="button" onClick={() => navigate(`/locations/${encodeURIComponent(area.id)}`)}>
                <span aria-hidden="true">{getLocationSymbol(area.id, area.name)}</span>
                <strong>{area.name}</strong>
                <small>{count} 件</small>
              </button>
            );
          })}
          <button className="location-pill location-pill--manage" type="button" onClick={() => navigate("/locations")}>
            <span aria-hidden="true">⚙️</span><strong>管理位置</strong>
          </button>
        </div>
      </section>

      <section className="find-inventory-section">
        <div className="section-title find-inventory-heading">
          <div><h2>{query ? "查找结果" : "全部物品"}</h2><span>{visibleItems.length} 件</span></div>
        </div>

        <div className="inventory-filter-strip" aria-label="筛选与排序">
          <button className={sort !== "updated" ? "sort-icon-button is-active" : "sort-icon-button"} type="button" onClick={() => setSortOpen(true)} aria-label={`排序：${getSortLabel(sort)}`}>
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 6h11M8 12h8M8 18h5" /><path d="m3.5 5 2 2 2-2M5.5 7v11" /></svg>
          </button>
          <label className={categoryId !== "all" ? "inventory-filter-chip is-active" : "inventory-filter-chip"}>
            <span className="sr-only">分类筛选</span>
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="all">分类</option>{activeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className={status !== "all" ? "inventory-filter-chip is-active" : "inventory-filter-chip"}>
            <span className="sr-only">状态筛选</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
              <option value="all">状态</option><option value="normal">正常</option><option value="near_expiry">临期</option><option value="expired">已过期</option><option value="finished">已用完</option><option value="discarded">已丢弃</option>
            </select>
          </label>
          <label className={locationId !== "all" ? "inventory-filter-chip is-active" : "inventory-filter-chip"}>
            <span className="sr-only">位置筛选</span>
            <select value={locationId} onChange={(event) => setLocationId(event.target.value)}>
              <option value="all">位置</option><option value="missing">待归位</option>{locationGroups.map(({ area, containers }) => <optgroup key={area.id} label={area.name}><option value={area.id}>{area.name}（全部）</option>{containers.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</optgroup>)}
            </select>
          </label>
          {status !== "all" || categoryId !== "all" || locationId !== "all" ? <button className="inventory-filter-clear" type="button" onClick={clearFacetFilters}>清除</button> : null}
        </div>

        {visibleItems.length ? (
          <div className="inventory-grid">
            {visibleItems.map((item) => (
              <div className="find-result-card" key={item.id}>
                <ItemCard
                  item={item}
                  categoryName={getCategoryName(item.categoryId)}
                  locationName={getLocationPath(item.locationId)}
                  viewMode="grid"
                  onClick={() => navigate(`/items/${item.id}${foundVia ? `?foundVia=${foundVia}` : ""}`)}
                  onLongPress={() => {
                    setActionItemId(item.id);
                    setDeleteConfirmItemId(undefined);
                  }}
                />
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

      {actionItem ? (
        <div className="item-hold-menu-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) closeItemActions(); }}>
          <section className="item-hold-menu" role="dialog" aria-modal="true" aria-label={`${actionItem.name}快捷操作`}>
            <div className="item-hold-menu__copy"><small>已选中物品</small><strong>{actionItem.name}</strong></div>
            {deleteConfirmItemId ? (
              <div className="item-hold-menu__choices item-hold-menu__choices--confirm">
                <button className="is-danger" type="button" onClick={() => void confirmDeleteItem()}>确认删除</button>
                <button type="button" onClick={() => setDeleteConfirmItemId(undefined)}>取消</button>
              </div>
            ) : (
              <div className="item-hold-menu__choices">
                <button type="button" onClick={() => navigate(`/items/edit/${actionItem.id}`)}>编辑</button>
                <button className="is-danger" type="button" onClick={() => setDeleteConfirmItemId(actionItem.id)}>删除</button>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {sortOpen ? (
        <div className="sort-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSortOpen(false); }}>
          <section className="sort-sheet" role="dialog" aria-modal="true" aria-labelledby="sort-sheet-title">
            <div className="sort-sheet__header">
              <div><span>物品排序</span><h2 id="sort-sheet-title">选择排序方式</h2></div>
              <button type="button" onClick={() => setSortOpen(false)} aria-label="关闭排序">×</button>
            </div>
            <div className="sort-sheet__options" role="radiogroup" aria-label="排序方式">
              {getSortOptions(Boolean(query)).map((option) => (
                <button type="button" role="radio" aria-checked={sort === option.value} className={sort === option.value ? "is-selected" : ""} key={option.value} onClick={() => setSort(option.value)}>
                  <span><strong>{option.label}</strong><small>{option.description}</small></span><i aria-hidden="true" />
                </button>
              ))}
            </div>
            <div className="sort-sheet__actions">
              <button type="button" onClick={() => setSort(query ? "relevance" : "updated")}>重置</button>
              <button type="button" onClick={() => setSortOpen(false)}>完成</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function getSortLabel(sort: InventorySearchSort): string {
  return getSortOptions(true).find((option) => option.value === sort)?.label ?? "最近更新";
}

function getSortOptions(includeRelevance: boolean): Array<{ value: InventorySearchSort; label: string; description: string }> {
  return [
    ...(includeRelevance ? [{ value: "relevance" as const, label: "最相关", description: "优先显示最符合搜索词的物品" }] : []),
    { value: "updated", label: "最近更新", description: "最近修改的物品排在前面" },
    { value: "expire", label: "即将过期", description: "更接近到期日的物品排在前面" },
    { value: "purchase", label: "最近购买", description: "购买日期较新的物品排在前面" },
  ];
}
