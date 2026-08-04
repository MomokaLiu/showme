import { EmptyState } from "../../components/EmptyState";
import {
  getHighestDailyCostRanking,
  getIdleRanking,
  getLongestUsedRanking,
  getMostExpensiveRanking,
  type RankingEntry,
} from "../../services/inventoryRankings";
import { useInventoryStore } from "../../store/itemStore";
import { formatCurrency } from "../../utils/formatters";
import { navigate } from "../router";

export default function RankingsPage() {
  const { items, logs } = useInventoryStore();
  const publicItems = items.filter((item) => !item.isPrivate);

  return (
    <div className="page-stack">
      <section className="rankings-hero">
        <span>库存价值榜</span>
        <h2>从价格看到真正的使用价值</h2>
        <p>榜单只统计资料完整的普通库存；私密物品不会参与。</p>
      </section>
      <RankingSection
        title="最贵物品榜"
        description="按购买价格从高到低 · TOP 10"
        entries={getMostExpensiveRanking(publicItems)}
        formatValue={(value) => formatCurrency(value)}
      />
      <RankingSection
        title="单日成本最高榜"
        description="发现买了但还没充分使用的物品"
        entries={getHighestDailyCostRanking(publicItems)}
        formatValue={(value) => `${formatCurrency(value)}/天`}
      />
      <RankingSection
        title="使用价值最高榜"
        description="按累计拥有天数排序 · 最值得拥有"
        entries={getLongestUsedRanking(publicItems)}
        formatValue={(value) => `${value} 天`}
      />
      <RankingSection
        title="闲置榜"
        description="拥有且连续 30 天以上未使用"
        entries={getIdleRanking(publicItems, logs)}
        formatValue={(value) => `闲置 ${value} 天`}
      />
    </div>
  );
}

function RankingSection({
  title,
  description,
  entries,
  formatValue,
}: {
  title: string;
  description: string;
  entries: RankingEntry[];
  formatValue: (value: number) => string;
}) {
  return (
    <section className="section-block ranking-section">
      <div className="section-title">
        <div>
          <h2>{title}</h2>
          <span>{description}</span>
        </div>
      </div>
      {entries.length ? (
        <div className="ranking-list">
          {entries.map((entry, index) => (
            <button type="button" key={entry.item.id} onClick={() => navigate(`/items/${entry.item.id}`)}>
              <b className={`ranking-index ranking-index--${index + 1}`}>{index + 1}</b>
              <span>
                <strong>{entry.item.name}</strong>
                {entry.item.brand ? <small>{entry.item.brand}</small> : null}
              </span>
              <em>{formatValue(entry.value)}</em>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState title="还没有可参与排名的数据" description="补充价格、购买日期或使用记录后会自动出现。" />
      )}
    </section>
  );
}
