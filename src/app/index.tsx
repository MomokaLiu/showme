import { EmptyState } from "../components/EmptyState";
import { ItemCard } from "../components/ItemCard";
import { StatCard } from "../components/StatCard";
import { navigate } from "./router";
import { useInventoryStore } from "../store/itemStore";
import { formatCurrency } from "../utils/formatters";
import {
  calculateInventoryValue,
  calculateMonthlyWasteAmount,
  getExpiredItems,
  getExpiringItems,
  getTodayActionItems,
} from "../utils/statistics";

export default function DashboardPage() {
  const { items, logs, getCategoryName, getLocationName } = useInventoryStore();
  const activeItems = items.filter((item) => item.status !== "finished" && item.status !== "discarded");
  const expiredItems = getExpiredItems(items);
  const expiringItems = getExpiringItems(items, 7);
  const todayItems = getTodayActionItems(items);
  const inventoryValue = calculateInventoryValue(items);
  const monthlyWaste = calculateMonthlyWasteAmount(items, logs);

  return (
    <div className="page-stack">
      <button
        type="button"
        className="dashboard-hero"
        onClick={() => navigate("/items")}
        aria-label={`查看全部库存，共 ${activeItems.length} 件`}
      >
        <div>
          <span>今日库存</span>
          <strong>{activeItems.length}</strong>
        </div>
        <span className="dashboard-hero__hint">
          查看全部库存
          <b aria-hidden="true">→</b>
        </span>
      </button>

      <section className="stat-grid">
        <StatCard label="临期" value={expiringItems.length} tone="orange" />
        <StatCard label="已过期" value={expiredItems.length} tone="red" />
        <StatCard label="库存价值" value={formatCurrency(inventoryValue)} tone="green" />
        <StatCard label="本月浪费" value={formatCurrency(monthlyWaste)} tone="gray" />
      </section>

      <section className="quick-grid">
        <button type="button" onClick={() => navigate("/items")}>
          全部库存
        </button>
        <button type="button" onClick={() => navigate("/expiring")}>
          临期物品
        </button>
        <button type="button" onClick={() => navigate("/shopping")}>
          购物清单
        </button>
        <button type="button" onClick={() => navigate("/stats")}>
          统计数据
        </button>
      </section>

      <section className="section-block">
        <div className="section-title">
          <h2>今日建议处理</h2>
          <button type="button" className="text-button" onClick={() => navigate("/expiring")}>
            查看全部
          </button>
        </div>
        {todayItems.length ? (
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
        ) : (
          <EmptyState title="今天没有紧急物品" description="新的库存提醒会在这里出现。" />
        )}
      </section>
    </div>
  );
}
