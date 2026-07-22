import { GaugeCard } from "../../components/GaugeCard";
import { StatCard } from "../../components/StatCard";
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

export default function StatsPage() {
  const { items, logs, categories } = useInventoryStore();
  const activeItems = items.filter((item) => item.status !== "finished" && item.status !== "discarded");
  const expiringCount = getExpiringItems(items, 7).length;
  const expiredCount = getExpiredItems(items).length;
  const monthlyPurchaseAmount = calculateMonthlyPurchaseAmount(items);
  const monthlyWasteAmount = calculateMonthlyWasteAmount(items, logs);
  const expiryRisk = activeItems.length ? ((expiringCount + expiredCount) / activeItems.length) * 100 : 0;
  const inventoryHealth = activeItems.length
    ? Math.max(0, 100 - (expiredCount * 30 + expiringCount * 14) / activeItems.length)
    : 100;
  const wasteRate = monthlyPurchaseAmount > 0 ? (monthlyWasteAmount / monthlyPurchaseAmount) * 100 : 0;

  return (
    <div className="page-stack">
      <section className="dashboard-panel">
        <div className="section-title">
          <h2>生活库存仪表盘</h2>
          <span>{activeItems.length} 件在库</span>
        </div>
        <div className="gauge-grid">
          <GaugeCard
            label="库存健康"
            value={inventoryHealth}
            tone={inventoryHealth >= 80 ? "green" : inventoryHealth >= 55 ? "orange" : "red"}
            helper="结合临期和过期物品估算"
          />
          <GaugeCard
            label="过期压力"
            value={expiryRisk}
            tone={expiryRisk <= 20 ? "green" : expiryRisk <= 45 ? "orange" : "red"}
            helper={`${expiringCount} 件临期，${expiredCount} 件已过期`}
          />
          <GaugeCard
            label="浪费率"
            value={wasteRate}
            tone={wasteRate <= 8 ? "green" : wasteRate <= 20 ? "orange" : "red"}
            helper={`本月浪费 ${formatCurrency(monthlyWasteAmount)}`}
          />
        </div>
      </section>

      <section className="stat-grid stat-grid--single">
        <StatCard label="当前库存总价值" value={formatCurrency(calculateInventoryValue(items))} tone="green" />
        <StatCard label="本月新增物品" value={calculateMonthlyNewItemCount(items)} tone="blue" />
        <StatCard label="本月购买总金额" value={formatCurrency(monthlyPurchaseAmount)} tone="blue" />
        <StatCard label="本月浪费金额" value={formatCurrency(monthlyWasteAmount)} tone="red" />
        <StatCard label="已用完物品" value={getFinishedItemCount(items)} tone="gray" />
        <StatCard label="最容易过期的分类" value={getMostExpiryProneCategory(items, categories)} tone="orange" />
        <StatCard label="临期物品数量" value={expiringCount} tone="orange" />
        <StatCard label="已过期物品数量" value={expiredCount} tone="red" />
      </section>
    </div>
  );
}
