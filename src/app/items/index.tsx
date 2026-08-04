import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "../../components/EmptyState";
import { ItemCard } from "../../components/ItemCard";
import { loadInventoryViewMode, saveInventoryViewMode, type InventoryViewMode } from "../../services/inventoryViewStorage";
import { searchInventory, type InventorySearchSort } from "../../services/inventorySearch";
import { useInventoryStore } from "../../store/itemStore";
import type { ItemStatus } from "../../types/item";
import { navigate } from "../router";

type StatusFilter = "all" | Extract<ItemStatus, "normal" | "near_expiry" | "expired" | "finished" | "discarded">;

export default function InventoryPage({
  initialQuery = "",
  initialLocationId,
}: {
  initialQuery?: string;
  initialLocationId?: string;
}) {
  const { items, categories, locations, getCategoryName, getLocationName } = useInventoryStore();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [categoryId, setCategoryId] = useState("all");
  const [locationId, setLocationId] = useState(
    initialLocationId === "" ? "missing" : initialLocationId || "all",
  );
  const [sort, setSort] = useState<InventorySearchSort>(initialQuery ? "relevance" : "updated");
  const [viewMode, setViewMode] = useState<InventoryViewMode>(() => loadInventoryViewMode());
  const publicItems = items.filter((item) => !item.isPrivate);
  const activeCategories = categories.filter((category) => !category.isArchived).sort((left, right) => (left.sortOrder ?? 999) - (right.sortOrder ?? 999) || left.name.localeCompare(right.name));
  const activeLocations = locations.filter((location) => !location.isArchived).sort((left, right) => (left.sortOrder ?? 999) - (right.sortOrder ?? 999) || left.name.localeCompare(right.name));

  useEffect(() => {
    setQuery(initialQuery);
    setLocationId(initialLocationId === "" ? "missing" : initialLocationId || "all");
    setSort(initialQuery ? "relevance" : "updated");
  }, [initialLocationId, initialQuery]);

  const visibleItems = useMemo(
    () =>
      searchInventory(
        publicItems,
        {
          text: query,
          status: status === "all" ? undefined : status,
          categoryId: categoryId === "all" ? undefined : categoryId,
          locationId: locationId === "all" || locationId === "missing" ? undefined : locationId,
          missingLocation: locationId === "missing",
          sort,
        },
        { getCategoryName, getLocationName },
      ),
    [categoryId, getCategoryName, getLocationName, locationId, publicItems, query, sort, status],
  );

  function changeViewMode(mode: InventoryViewMode) {
    setViewMode(mode);
    saveInventoryViewMode(mode);
  }

  function clearSearch() {
    setQuery("");
    setStatus("all");
    setCategoryId("all");
    setLocationId("all");
    setSort("updated");
  }

  const hasFilters = Boolean(query) || status !== "all" || categoryId !== "all" || locationId !== "all";

  return (
    <div className="page-stack inventory-v2">
      <div className="inventory-top-actions">
        <button type="button" onClick={() => navigate("/locations")}>⌖ 按位置查找</button>
        <button type="button" onClick={() => navigate("/items/private")}>私密库存</button>
        <button type="button" onClick={() => navigate("/insights")}>数据洞察</button>
      </div>

      <div className="inventory-search-box">
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (event.target.value && sort !== "relevance") setSort("relevance");
          }}
          placeholder="搜索名称、品牌、标签或位置"
          aria-label="搜索库存"
        />
        {query ? <button type="button" onClick={() => setQuery("")} aria-label="清除搜索">×</button> : null}
      </div>

      <div className="inventory-filter-grid">
        <label>
          <span>状态</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
            <option value="all">全部状态</option>
            <option value="normal">正常</option>
            <option value="near_expiry">临期</option>
            <option value="expired">已过期</option>
            <option value="finished">已用完</option>
            <option value="discarded">已丢弃</option>
          </select>
        </label>
        <label>
          <span>位置</span>
          <select value={locationId} onChange={(event) => setLocationId(event.target.value)}>
            <option value="all">全部位置</option>
            <option value="missing">待补位置</option>
            {activeLocations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </label>
        <label>
          <span>分类</span>
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="all">全部分类</option>
            {activeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label>
          <span>排序</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as InventorySearchSort)}>
            {query ? <option value="relevance">最相关</option> : null}
            <option value="updated">最近更新</option>
            <option value="expire">即将过期</option>
            <option value="purchase">最近购买</option>
            <option value="price">价格最高</option>
            <option value="quantity">数量最少</option>
          </select>
        </label>
      </div>

      <div className="inventory-result-bar">
        <span>找到 {visibleItems.length} 件</span>
        <div className="view-mode-toggle" role="group" aria-label="库存显示模式">
          <button type="button" className={viewMode === "list" ? "is-active" : ""} aria-pressed={viewMode === "list"} onClick={() => changeViewMode("list")}>☰</button>
          <button type="button" className={viewMode === "grid" ? "is-active" : ""} aria-pressed={viewMode === "grid"} onClick={() => changeViewMode("grid")}>▦</button>
        </div>
      </div>

      {visibleItems.length ? (
        <div className={viewMode === "grid" ? "inventory-grid" : "list-stack"}>
          {visibleItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              categoryName={getCategoryName(item.categoryId)}
              locationName={getLocationName(item.locationId)}
              viewMode={viewMode}
              onClick={() => navigate(`/items/${item.id}`)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={hasFilters ? "没有符合条件的物品" : "这里还没有物品"}
          description={hasFilters ? "可以清除筛选，或直接添加正在寻找的物品。" : "先记下名称和位置，下次就能快速找到。"}
          action={
            <div className="empty-actions">
              {hasFilters ? <button type="button" onClick={clearSearch}>清除筛选</button> : null}
              <button className="primary-button" type="button" onClick={() => navigate(query ? `/items/new?name=${encodeURIComponent(query)}` : "/items/new")}>添加物品</button>
            </div>
          }
        />
      )}

      <button className="primary-button inventory-add-button" type="button" onClick={() => navigate("/items/new")}>＋ 添加物品</button>
    </div>
  );
}
