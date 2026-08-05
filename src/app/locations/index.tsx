import { useMemo, useState, type FormEvent } from "react";
import { EmptyState } from "../../components/EmptyState";
import { useInventoryStore } from "../../store/itemStore";
import { getLocationDescendantIds, getLocationGroups, sortLocations } from "../../utils/locations";
import { navigate } from "../router";

export default function LocationsPage() {
  const { items, locations, createLocation, updateLocation, archiveLocation, moveLocation } = useInventoryStore();
  const [newName, setNewName] = useState("");
  const [parentId, setParentId] = useState("");
  const [editingId, setEditingId] = useState<string>();
  const [editingName, setEditingName] = useState("");
  const [message, setMessage] = useState("");
  const [managing, setManaging] = useState(false);
  const groups = getLocationGroups(locations);
  const archivedLocations = sortLocations(locations.filter((location) => location.isArchived));
  const publicItems = items.filter((item) => !item.isPrivate && item.status !== "finished" && item.status !== "discarded");

  const itemCountByLocation = useMemo(() => {
    const counts = new Map<string, number>();
    for (const location of locations) {
      const ids = new Set(getLocationDescendantIds(locations, location.id));
      counts.set(location.id, publicItems.filter((item) => item.locationId && ids.has(item.locationId)).length);
    }
    return counts;
  }, [locations, publicItems]);
  const usedGroups = groups.filter(({ area }) => (itemCountByLocation.get(area.id) ?? 0) > 0);
  const emptyGroups = groups.filter(({ area }) => (itemCountByLocation.get(area.id) ?? 0) === 0);
  const displayedGroups = managing ? groups : [...usedGroups, ...emptyGroups].slice(0, 4);
  const hiddenGroups = managing ? [] : groups.filter(({ area }) => !displayedGroups.some(({ area: visibleArea }) => visibleArea.id === area.id));

  async function submitNewLocation(event: FormEvent) {
    event.preventDefault();
    if (!newName.trim()) return;
    try {
      const id = await createLocation(newName, { parentId: parentId || undefined });
      setNewName("");
      setMessage(parentId ? "具体位置已添加，可以直接往这里记物品。" : "区域已添加，可以继续添加柜子或收纳盒。");
      navigate(`/locations/${encodeURIComponent(id)}`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "添加位置失败。");
    }
  }

  async function saveRename(id: string) {
    const name = editingName.trim();
    if (!name) return;
    await updateLocation(id, { name });
    setEditingId(undefined);
    setEditingName("");
  }

  return (
    <div className="page-stack locations-page locations-v2">
      <section className="location-guide-card">
        <div><span>两级位置</span><h2>先选区域，再记到具体位置</h2><p>例如“卧室 › 衣柜第二层”，找东西时更明确。</p></div>
        <button className="secondary-button" type="button" onClick={() => setManaging((value) => !value)}>{managing ? "完成" : "管理"}</button>
      </section>

      {managing ? <form className="location-create-panel" onSubmit={submitNewLocation}>
        <label><span>添加到</span><select value={parentId} onChange={(event) => setParentId(event.target.value)}><option value="">新建顶级区域</option>{groups.map(({ area }) => <option key={area.id} value={area.id}>{area.name}下的具体位置</option>)}</select></label>
        <label><span>名称</span><input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder={parentId ? "例如：衣柜第二层" : "例如：书房"} /></label>
        <button className="primary-button" type="submit" disabled={!newName.trim()}>添加位置</button>
      </form> : null}
      {message ? <p className="form-message" role="status">{message}</p> : null}

      {groups.length ? <div className="location-group-list">
        {displayedGroups.map(({ area, containers }, areaIndex) => (
          <section className="location-group-card" key={area.id}>
            <div className="location-group-card__head">
              {editingId === area.id ? <RenameEditor value={editingName} onChange={setEditingName} onSave={() => saveRename(area.id)} onCancel={() => setEditingId(undefined)} /> : <button type="button" onClick={() => navigate(`/locations/${encodeURIComponent(area.id)}`)}><span><strong>{area.name}</strong><small>{itemCountByLocation.get(area.id) ?? 0} 件物品 · {containers.length} 个具体位置</small></span><b>›</b></button>}
              {managing && editingId !== area.id ? <div className="location-row__actions"><button type="button" onClick={() => { setEditingId(area.id); setEditingName(area.name); }}>重命名</button><button type="button" disabled={areaIndex === 0} onClick={() => moveLocation(area.id, -1)}>上移</button><button type="button" disabled={areaIndex === displayedGroups.length - 1} onClick={() => moveLocation(area.id, 1)}>下移</button>{area.id !== "other" ? <button type="button" onClick={() => archiveLocation(area.id)}>归档</button> : null}</div> : null}
            </div>
            {containers.length ? <div className="location-container-list">{containers.map((container, index) => (
              <div key={container.id}>
                {editingId === container.id ? <RenameEditor value={editingName} onChange={setEditingName} onSave={() => saveRename(container.id)} onCancel={() => setEditingId(undefined)} /> : <button type="button" onClick={() => navigate(`/locations/${encodeURIComponent(container.id)}`)}><span>{container.name}<small>{itemCountByLocation.get(container.id) ?? 0} 件</small></span><b>›</b></button>}
                {managing && editingId !== container.id ? <div className="location-row__actions"><button type="button" onClick={() => { setEditingId(container.id); setEditingName(container.name); }}>重命名</button><button type="button" disabled={index === 0} onClick={() => moveLocation(container.id, -1)}>上移</button><button type="button" disabled={index === containers.length - 1} onClick={() => moveLocation(container.id, 1)}>下移</button><button type="button" onClick={() => archiveLocation(container.id)}>归档</button></div> : null}
              </div>
            ))}</div> : <div className="location-container-empty"><span>还没有具体位置</span>{managing ? <button type="button" onClick={() => { setParentId(area.id); setNewName(""); }}>添加一个</button> : null}</div>}
          </section>
        ))}
        {hiddenGroups.length ? <details className="unused-location-list"><summary>更多暂无物品的区域 <span>{hiddenGroups.length}</span></summary><div>{hiddenGroups.map(({ area }) => <button key={area.id} type="button" onClick={() => navigate(`/locations/${encodeURIComponent(area.id)}`)}>{area.name}<span>›</span></button>)}</div></details> : null}
      </div> : <EmptyState title="还没有位置" description="先创建一个房间或区域，再补充柜子、抽屉或收纳盒。" action={<button className="primary-button" type="button" onClick={() => setManaging(true)}>创建第一个区域</button>} />}

      {managing && archivedLocations.length ? <details className="archived-list"><summary>已归档位置（{archivedLocations.length}）</summary>{archivedLocations.map((location) => <button key={location.id} type="button" onClick={() => updateLocation(location.id, { isArchived: false })}>{location.name}<span>恢复</span></button>)}</details> : null}
    </div>
  );
}

function RenameEditor({ value, onChange, onSave, onCancel }: { value: string; onChange: (value: string) => void; onSave: () => void; onCancel: () => void }) {
  return <div className="location-rename"><input value={value} onChange={(event) => onChange(event.target.value)} aria-label="位置新名称" /><button type="button" onClick={onSave}>保存</button><button type="button" onClick={onCancel}>取消</button></div>;
}
