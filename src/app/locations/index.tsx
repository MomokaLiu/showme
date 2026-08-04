import { useMemo, useState, type FormEvent } from "react";
import { EmptyState } from "../../components/EmptyState";
import { useInventoryStore } from "../../store/itemStore";
import { navigate } from "../router";

export default function LocationsPage() {
  const { items, locations, createLocation, updateLocation, archiveLocation, moveLocation } = useInventoryStore();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string>();
  const [editingName, setEditingName] = useState("");
  const [message, setMessage] = useState("");
  const sortedLocations = useMemo(
    () => [...locations].sort((left, right) => (left.sortOrder ?? 999) - (right.sortOrder ?? 999) || left.name.localeCompare(right.name)),
    [locations],
  );
  const activeLocations = sortedLocations.filter((location) => !location.isArchived);
  const archivedLocations = sortedLocations.filter((location) => location.isArchived);

  async function submitNewLocation(event: FormEvent) {
    event.preventDefault();
    if (!newName.trim()) return;
    try {
      const id = await createLocation(newName);
      setNewName("");
      setMessage("位置已添加。");
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
    <div className="page-stack locations-page">
      <section className="location-intro">
        <span>按房间、柜子或收纳盒整理</span>
        <h2>从位置开始找，比翻完整库存更快</h2>
      </section>

      <form className="location-create-form" onSubmit={submitNewLocation}>
        <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="新增位置，例如：书房抽屉" aria-label="新位置名称" />
        <button className="primary-button" type="submit" disabled={!newName.trim()}>添加</button>
      </form>
      {message ? <p className="form-message" role="status">{message}</p> : null}

      {activeLocations.length ? (
        <div className="location-list">
          {activeLocations.map((location, index) => {
            const count = items.filter((item) => item.locationId === location.id && !item.isPrivate).length;
            const isEditing = editingId === location.id;
            return (
              <article className="location-row" key={location.id}>
                {isEditing ? (
                  <div className="location-rename">
                    <input value={editingName} onChange={(event) => setEditingName(event.target.value)} aria-label={`重命名${location.name}`} />
                    <button type="button" onClick={() => saveRename(location.id)}>保存</button>
                    <button type="button" onClick={() => setEditingId(undefined)}>取消</button>
                  </div>
                ) : (
                  <button className="location-row__main" type="button" onClick={() => navigate(`/locations/${encodeURIComponent(location.id)}`)}>
                    <span><strong>{location.name}</strong><small>{count} 件物品</small></span>
                    <b aria-hidden="true">→</b>
                  </button>
                )}
                {!isEditing ? (
                  <div className="location-row__actions">
                    <button type="button" disabled={index === 0} onClick={() => moveLocation(location.id, -1)}>↑</button>
                    <button type="button" disabled={index === activeLocations.length - 1} onClick={() => moveLocation(location.id, 1)}>↓</button>
                    <button type="button" onClick={() => { setEditingId(location.id); setEditingName(location.name); }}>重命名</button>
                    {location.id !== "other" ? <button type="button" onClick={() => archiveLocation(location.id)}>归档</button> : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : <EmptyState title="还没有可用位置" description="添加一个房间、柜子或收纳盒开始整理。" />}

      {archivedLocations.length ? (
        <details className="archived-list">
          <summary>已归档位置（{archivedLocations.length}）</summary>
          {archivedLocations.map((location) => (
            <button key={location.id} type="button" onClick={() => updateLocation(location.id, { isArchived: false })}>
              {location.name}<span>恢复</span>
            </button>
          ))}
        </details>
      ) : null}
    </div>
  );
}
