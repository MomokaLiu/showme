import { EmptyState } from "../../components/EmptyState";
import { ItemCard } from "../../components/ItemCard";
import { useInventoryStore } from "../../store/itemStore";
import { navigate } from "../router";

export default function LocationDetailPage({ locationId }: { locationId: string }) {
  const { items, locations, getCategoryName, getLocationName } = useInventoryStore();
  const location = locations.find((candidate) => candidate.id === locationId);
  if (!location) {
    return <EmptyState title="位置不存在" action={<button onClick={() => navigate("/locations")}>返回位置列表</button>} />;
  }

  const locationItems = items
    .filter((item) => item.locationId === locationId && !item.isPrivate)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return (
    <div className="page-stack location-detail-page">
      <section className="location-detail-hero">
        <span>存放位置</span>
        <h2>{location.name}</h2>
        <strong>{locationItems.length} 件物品</strong>
      </section>
      {locationItems.length ? (
        <div className="list-stack">
          {locationItems.map((item) => (
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
          description={`添加物品时选择“${location.name}”，之后就能从这里找到。`}
          action={<button className="primary-button" onClick={() => navigate("/items/new")}>添加物品</button>}
        />
      )}
    </div>
  );
}
