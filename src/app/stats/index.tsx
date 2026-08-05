import { GaugeCard } from "../../components/GaugeCard";
import { StatCard } from "../../components/StatCard";
import { EmptyState } from "../../components/EmptyState";
import { useInventoryStore } from "../../store/itemStore";
import { formatCurrency } from "../../utils/formatters";
import {
  calculateInventoryValue,
  calculateMonthlyNewItemCount,
  calculateMonthlyPurchaseAmount,
  calculateMonthlyWasteAmount,
  getExpiredItems,
  getExpiringItems,
  getFinishedItemCount,
  getMostExpiryProneCategory,
} from "../../utils/statistics";
import { navigate } from "../router";

export default function StatsPage() {
  const { items, logs, categories } = useInventoryStore();
  const publicItems = items.filter((item) => !item.isPrivate);
  const publicItemIds = new Set(publicItems.map((item) => item.id));
  const publicLogs = logs.filter((log) => publicItemIds.has(log.itemId));
  const activeItems = publicItems.filter((item) => item.status !== "finished" && item.status !== "discarded");
  const expiryTrackedItems = activeItems.filter((item) => Boolean(item.finalExpireDate));
  const pricedItems = activeItems.filter((item) => item.totalPrice !== undefined && item.totalPrice !== null);
  const expiringCount = getExpiringItems(publicItems, 7).length;
  const expiredCount = getExpiredItems(publicItems).length;
  const monthlyPurchaseAmount = calculateMonthlyPurchaseAmount(publicItems);
  const monthlyWasteAmount = calculateMonthlyWasteAmount(publicItems, publicLogs);
  const expiryRisk = expiryTrackedItems.length ? ((expiringCount + expiredCount) / expiryTrackedItems.length) * 100 : undefined;
  const inventoryHealth = expiryTrackedItems.length
    ? Math.max(0, 100 - (expiredCount * 30 + expiringCount * 14) / expiryTrackedItems.length)
    : undefined;
  const wasteRate = monthlyPurchaseAmount > 0 ? (monthlyWasteAmount / monthlyPurchaseAmount) * 100 : undefined;

  if (!publicItems.length) {
    return <div className="page-stack"><EmptyState title="还没有足够的数据" description="先记录几件物品；洞察只会在有真实数据时出现。" action={<button className="primary-button" type="button" onClick={() => navigate("/items/new")}>添加物品</button>} /></div>;
  }

  return (
    <div className="page-stack">
      <section className="dashboard-panel">
        <div className="section-title">
          <h2>生活库存仪表盘</h2>
          <span>{activeItems.length} 件在库</span>
        </div>
        <div className="gauge-grid">
          {inventoryHealth !== undefined ? <GaugeCard
            label="库存健康"
            value={inventoryHealth}
            tone={inventoryHealth >= 80 ? "green" : inventoryHealth >= 55 ? "orange" : "red"}
            helper="结合临期和过期物品估算"
          /> : <div className="metric-data-needed"><strong>库存健康</strong><span>添加带到期日期的消耗品后计算</span></div>}
          {expiryRisk !== undefined ? <GaugeCard
            label="过期压力"
            value={expiryRisk}
            tone={expiryRisk <= 20 ? "green" : expiryRisk <= 45 ? "orange" : "red"}
            helper={`${expiringCount} 件临期，${expiredCount} 件已过期`}
          /> : <div className="metric-data-needed"><strong>过期压力</strong><span>暂无带到期日期的物品</span></div>}
          {wasteRate !== undefined ? <GaugeCard
            label="浪费率"
            value={wasteRate}
            tone={wasteRate <= 8 ? "green" : wasteRate <= 20 ? "orange" : "red"}
            helper={`本月浪费 ${formatCurrency(monthlyWasteAmount)}`}
          /> : <div className="metric-data-needed"><strong>浪费率</strong><span>有本月购买金额后再计算</span></div>}
        </div>
      </section>

      <section className="stat-grid stat-grid--single">
        <StatCard label={`当前库存总价值 · ${pricedItems.length}/${activeItems.length} 件已填价格`} value={pricedItems.length ? formatCurrency(calculateInventoryValue(publicItems)) : "数据不足"} tone="green" />
        <StatCard label="本月新增物品" value={calculateMonthlyNewItemCount(publicItems)} tone="blue" />
        <StatCard label="本月购买总金额" value={formatCurrency(monthlyPurchaseAmount)} tone="blue" />
        <StatCard label="本月浪费金额" value={formatCurrency(monthlyWasteAmount)} tone="red" />
        <StatCard label="已用完物品" value={getFinishedItemCount(publicItems)} tone="gray" />
        <StatCard label="最容易过期的分类" value={getMostExpiryProneCategory(publicItems, categories)} tone="orange" />
        <StatCard label="临期物品数量" value={expiringCount} tone="orange" />
        <StatCard label="已过期物品数量" value={expiredCount} tone="red" />
      </section>
    </div>
  );
}
