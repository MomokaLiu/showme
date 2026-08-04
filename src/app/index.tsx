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
        <h2>东西放哪了？</h2>
        <form className="home-search" onSubmit={submitSearch}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索名称、品牌、标签或位置"
            aria-label="搜索库存"
          />
          <button type="submit" aria-label="搜索">搜索</button>
        </form>
        <div className="home-primary-actions">
          <button className="primary-button" type="button" onClick={() => navigate("/items/new")}>＋ 记一件物品</button>
          <button className="text-button" type="button" onClick={() => navigate("/locations")}>按位置找 →</button>
        </div>
      </section>

      <section className="home-summary-line" aria-label="库存概览">
        <button type="button" onClick={() => navigate("/items")}>
          <strong>{activeItems.length}</strong> 件在库
        </button>
        {incompleteItems.length ? <button type="button" onClick={() => navigate("/items?location=")}>{incompleteItems.length} 件待补位置</button> : null}
        {reminderCount ? <button type="button" onClick={() => navigate("/tasks")}>{reminderCount} 项到期待办</button> : null}
        {shoppingCount ? <button type="button" onClick={() => navigate("/tasks/shopping")}>{shoppingCount} 项待购买</button> : null}
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
            title="这里会显示最近的物品"
            description="从上方记下第一件物品，只需名称和位置。"
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
    </div>
  );
}
