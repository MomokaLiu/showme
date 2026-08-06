import { EmptyState } from "../../components/EmptyState";
import { ItemCard } from "../../components/ItemCard";
import { useInventoryStore } from "../../store/itemStore";
import { getLocationDescendantIds, getLocationPath, sortLocations } from "../../utils/locations";
import { getLocationSymbol } from "../../utils/locationPresentation";
import { navigate } from "../router";

export default function LocationDetailPage({ locationId }: { locationId: string }) {
  const { items, locations, getCategoryName } = useInventoryStore();
  const location = locations.find((candidate) => candidate.id === locationId);
  if (!location) return <EmptyState title="位置不存在" action={<button onClick={() => navigate("/locations")}>返回位置列表</button>} />;

  const descendantIds = new Set(getLocationDescendantIds(locations, locationId));
  const children = sortLocations(locations.filter((candidate) => candidate.parentId === locationId && !candidate.isArchived));
  const locationItems = items
    .filter((item) => item.locationId && descendantIds.has(item.locationId) && !item.isPrivate && item.status !== "finished" && item.status !== "discarded")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const locationPath = getLocationPath(locations, location.id);

  return (
    <div className="page-stack location-detail-page">
      <section className="location-detail-hero">
        <span className="location-hero-icon" aria-hidden="true">{getLocationSymbol(location.id, location.name)}</span>
        <div className="location-detail-hero__copy">
          <small>{location.parentId ? "具体存放位置" : "一级存放位置"}</small>
          <h2>{locationPath}</h2>
          <strong>{locationItems.length} 件物品</strong>
        </div>
        <button type="button" onClick={() => navigate(`/items/new?location=${encodeURIComponent(location.id)}`)}>＋ 添加物品</button>
      </section>

      {children.length ? (
        <section className="section-block location-child-navigation">
          <div className="section-title location-detail-section-title">
            <div><h2>具体位置</h2><small>继续查看二级存放位置</small></div>
          </div>
          <div className="location-child-grid">
            {children.map((child) => {
              const childIds = new Set(getLocationDescendantIds(locations, child.id));
              const count = items.filter((item) => item.locationId && childIds.has(item.locationId) && !item.isPrivate && item.status !== "finished" && item.status !== "discarded").length;
              return (
                <button key={child.id} type="button" onClick={() => navigate(`/locations/${encodeURIComponent(child.id)}`)}>
                  <span className="location-child-grid__icon" aria-hidden="true">{getLocationSymbol(child.id, child.name)}</span>
                  <span className="location-child-grid__copy"><strong>{child.name}</strong><small>{count} 件物品</small></span>
                  <b aria-hidden="true">›</b>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {locationItems.length ? (
        <section className="section-block location-inventory-section">
          <div className="section-title location-detail-section-title"><h2>{children.length ? "区域内物品" : "这里的物品"}</h2></div>
          <div className="inventory-grid location-inventory-grid">
            {locationItems.map((item) => (
              <div className="find-result-card" key={item.id}>
                <ItemCard item={item} categoryName={getCategoryName(item.categoryId)} locationName={getLocationPath(locations, item.locationId)} viewMode="grid" onClick={() => navigate(`/items/${item.id}?foundVia=location`)} />
              </div>
            ))}
          </div>
        </section>
      ) : <EmptyState title="这里还没有物品" description={`添加物品时选择“${locationPath}”，之后就能从这里找到。`} action={<button className="primary-button" onClick={() => navigate(`/items/new?location=${encodeURIComponent(location.id)}`)}>在这里添加物品</button>} />}
    </div>
  );
}
