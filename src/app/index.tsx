import { useState, type FormEvent } from "react";
import { EmptyState } from "../components/EmptyState";
import { ItemCard } from "../components/ItemCard";
import { useInventoryStore } from "../store/itemStore";
import { getExpiredItems, getExpiringItems, getTodayActionItems } from "../utils/statistics";
import { navigate } from "./router";

export default function DashboardPage() {
  const { items, shoppingItems, getCategoryName, getLocationName } = useInventoryStore();
  const [query, setQuery] = useState("");
  const publicItems = items.filter((item) => !item.isPrivate);
  const activeItems = publicItems.filter((item) => item.status !== "finished" && item.status !== "discarded");
  const incompleteItems = activeItems.filter((item) => !item.locationId);
  const todayItems = getTodayActionItems(publicItems).slice(0, 3);
  const recentItems = [...activeItems]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 4);
  const reminderCount = getExpiringItems(publicItems, 7).length + getExpiredItems(publicItems).length;
  const shoppingCount = shoppingItems.filter((item) => !item.isPurchased).length;

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const normalized = query.trim();
    navigate(normalized ? `/items?q=${encodeURIComponent(normalized)}` : "/items");
  }

  return (
    <div className="page-stack dashboard-v2">
      <section className="home-search-panel">
        <span>快速找到你的物品</span>
        <form className="home-search" onSubmit={submitSearch}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索名称、品牌、标签或位置"
            aria-label="搜索库存"
          />
          <button type="submit">搜索</button>
        </form>
        <div className="home-primary-actions">
          <button className="primary-button" type="button" onClick={() => navigate("/items/new")}>＋ 快速添加</button>
          <button className="secondary-button" type="button" onClick={() => navigate("/locations")}>按位置查找</button>
        </div>
      </section>

      <section className="home-focus-grid" aria-label="库存概览">
        <button type="button" onClick={() => navigate("/items")}>
          <strong>{activeItems.length}</strong>
          <span>在库物品</span>
        </button>
        <button type="button" onClick={() => navigate("/items?location=")}>
          <strong>{incompleteItems.length}</strong>
          <span>待补位置</span>
        </button>
        <button type="button" onClick={() => navigate("/tasks")}>
          <strong>{reminderCount}</strong>
          <span>到期待办</span>
        </button>
        <button type="button" onClick={() => navigate("/tasks/shopping")}>
          <strong>{shoppingCount}</strong>
          <span>待购买</span>
        </button>
      </section>

      {incompleteItems.length ? (
        <section className="home-attention-card">
          <div>
            <strong>{incompleteItems.length} 件物品还没有位置</strong>
            <span>补充位置后，下次能更快找到。</span>
          </div>
          <button type="button" onClick={() => navigate("/items?location=")}>去完善</button>
        </section>
      ) : null}

      <section className="section-block">
        <div className="section-title">
          <h2>最近更新</h2>
          <button type="button" className="text-button" onClick={() => navigate("/items")}>全部库存</button>
        </div>
        {recentItems.length ? (
          <div className="list-stack">
            {recentItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                categoryName={getCategoryName(item.categoryId)}
                locationName={getLocationName(item.locationId)}
                compact
                onClick={() => navigate(`/items/${item.id}`)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="先记下第一件物品"
            description="只需名称和位置，之后随时可以完善。"
            action={<button className="primary-button" onClick={() => navigate("/items/new")}>添加物品</button>}
          />
        )}
      </section>

      {todayItems.length ? (
        <section className="section-block">
          <div className="section-title">
            <h2>今天建议处理</h2>
            <button type="button" className="text-button" onClick={() => navigate("/tasks")}>查看待办</button>
          </div>
          <div className="list-stack">
            {todayItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                categoryName={getCategoryName(item.categoryId)}
                locationName={getLocationName(item.locationId)}
                compact
                onClick={() => navigate(`/items/${item.id}`)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <button className="home-insights-link" type="button" onClick={() => navigate("/insights")}>
        查看库存价值、使用成本和榜单 →
      </button>
    </div>
  );
}
