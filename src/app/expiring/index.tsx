import { EmptyState } from "../../components/EmptyState";
import { ItemCard } from "../../components/ItemCard";
import { useInventoryStore } from "../../store/itemStore";
import type { Item } from "../../types/item";
import { getRemainingDays } from "../../utils/itemCalculations";
import { navigate } from "../router";

export default function ExpiringPage() {
  const { items, getCategoryName, getLocationName, finishItem, discardItem } = useInventoryStore();
  const activeItems = items.filter((item) => item.status !== "finished" && item.status !== "discarded");
  const groups = [
    { title: "已过期", items: byDays(activeItems, undefined, -1) },
    { title: "今天到期", items: byDays(activeItems, 0, 0) },
    { title: "3 天内到期", items: byDays(activeItems, 1, 3) },
    { title: "7 天内到期", items: byDays(activeItems, 4, 7) },
    { title: "30 天内到期", items: byDays(activeItems, 8, 30) },
  ];
  const hasItems = groups.some((group) => group.items.length > 0);

  return (
    <div className="page-stack">
      {hasItems ? (
        groups.map((group) =>
          group.items.length ? (
            <section className="section-block" key={group.title}>
              <div className="section-title">
                <h2>{group.title}</h2>
                <span>{group.items.length}</span>
              </div>
              <div className="list-stack">
                {group.items.map((item) => (
                  <div className="expiring-card" key={item.id}>
                    <ItemCard
                      item={item}
                      categoryName={getCategoryName(item.categoryId)}
                      locationName={getLocationName(item.locationId)}
                      compact
                      onClick={() => navigate(`/items/${item.id}`)}
                    />
                    <div className="inline-actions">
                      <button type="button" onClick={() => finishItem(item.id)}>
                        用完
                      </button>
                      <button type="button" onClick={() => discardItem(item.id, "临期处理")}>
                        丢弃
                      </button>
                      <button type="button" onClick={() => window.alert("已保留延后提醒入口")}>
                        延后
                      </button>
                      <button type="button" onClick={() => navigate(`/items/${item.id}`)}>
                        详情
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null,
        )
      ) : (
        <EmptyState title="没有临期物品" description="库存到达提醒窗口后会显示在这里。" />
      )}
    </div>
  );
}

function byDays(items: Item[], min: number | undefined, max: number): Item[] {
  return items
    .filter((item) => {
      const remainingDays = getRemainingDays(item.finalExpireDate);
      if (remainingDays === undefined) return false;
      if (min === undefined) return remainingDays <= max;
      return remainingDays >= min && remainingDays <= max;
    })
    .sort((a, b) => (a.finalExpireDate ?? "").localeCompare(b.finalExpireDate ?? ""));
}
