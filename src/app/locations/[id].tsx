import { EmptyState } from "../../components/EmptyState";
import { ItemCard } from "../../components/ItemCard";
import { useInventoryStore } from "../../store/itemStore";
import { getLocationDescendantIds, getLocationPath, sortLocations } from "../../utils/locations";
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

  return (
    <div className="page-stack location-detail-page">
      <section className="location-detail-hero">
        <span>存放位置</span>
        <h2>{getLocationPath(locations, location.id)}</h2>
        <strong>{locationItems.length} 件物品</strong>
        <button type="button" onClick={() => navigate(`/items/new?location=${encodeURIComponent(location.id)}`)}>＋ 在这里连续添加</button>
      </section>

      {children.length ? <section className="section-block"><div className="section-title"><h2>具体位置</h2><span>{children.length}</span></div><div className="location-child-grid">{children.map((child) => { const count = items.filter((item) => item.locationId === child.id && !item.isPrivate).length; return <button key={child.id} type="button" onClick={() => navigate(`/locations/${encodeURIComponent(child.id)}`)}><strong>{child.name}</strong><span>{count} 件</span></button>; })}</div></section> : null}

      {locationItems.length ? <section className="section-block"><div className="section-title"><h2>{children.length ? "区域内物品" : "这里的物品"}</h2><span>{locationItems.length}</span></div><div className="list-stack">{locationItems.map((item) => <ItemCard key={item.id} item={item} categoryName={getCategoryName(item.categoryId)} locationName={getLocationPath(locations, item.locationId)} onClick={() => navigate(`/items/${item.id}`)} />)}</div></section> : <EmptyState title="这里还没有物品" description={`添加物品时选择“${getLocationPath(locations, location.id)}”，之后就能从这里找到。`} action={<button className="primary-button" onClick={() => navigate(`/items/new?location=${encodeURIComponent(location.id)}`)}>在这里添加物品</button>} />}
    </div>
  );
}
