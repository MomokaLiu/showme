import { useMemo, useState } from "react";
import { EmptyState } from "../../components/EmptyState";
import { ItemCard } from "../../components/ItemCard";
import type { Item, ItemStatus } from "../../types/item";
import { navigate } from "../router";
import { useInventoryStore } from "../../store/itemStore";

type FilterKey = "all" | Extract<ItemStatus, "near_expiry" | "expired" | "finished" | "discarded">;
type SortKey = "expire" | "purchase" | "price" | "quantity";

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "全部" },
  { key: "near_expiry", label: "临期" },
  { key: "expired", label: "已过期" },
  { key: "finished", label: "已用完" },
  { key: "discarded", label: "已丢弃" },
];

export default function InventoryPage() {
  const { items, getCategoryName, getLocationName } = useInventoryStore();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("expire");

  const visibleItems = useMemo(() => {
    return items
      .filter((item) => (filter === "all" ? true : item.status === filter))
      .sort((a, b) => sortItems(a, b, sort));
  }, [filter, items, sort]);

  return (
    <div className="page-stack">
      <div className="segmented-control" role="tablist">
        {filters.map((entry) => (
          <button
            key={entry.key}
            className={entry.key === filter ? "is-active" : ""}
            type="button"
            onClick={() => setFilter(entry.key)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <label className="field field--inline">
        <span>排序</span>
        <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
          <option value="expire">即将过期优先</option>
          <option value="purchase">最近购买优先</option>
          <option value="price">价格最高优先</option>
          <option value="quantity">数量最少优先</option>
        </select>
      </label>

      {visibleItems.length ? (
        <div className="list-stack">
          {visibleItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              categoryName={getCategoryName(item.categoryId)}
              locationName={getLocationName(item.locationId)}
              onClick={() => navigate(`/items/${item.id}`)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="这里还没有物品"
          description="先添加一件物品，就能开始看库存、价值和有效期。"
        />
      )}

      <button className="primary-button inventory-add-button" type="button" onClick={() => navigate("/items/new")}>
        ＋ 添加物品
      </button>
    </div>
  );
}

function sortItems(a: Item, b: Item, sort: SortKey): number {
  if (sort === "purchase") return b.purchaseDate.localeCompare(a.purchaseDate);
  if (sort === "price") return (b.totalPrice ?? 0) - (a.totalPrice ?? 0);
  if (sort === "quantity") return a.quantity - b.quantity;
  if (!a.finalExpireDate) return 1;
  if (!b.finalExpireDate) return -1;
  return a.finalExpireDate.localeCompare(b.finalExpireDate);
}
