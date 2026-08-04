import { useState, type FormEvent } from "react";
import { useCategoryStore } from "../store/categoryStore";

export function CategorySettingsCard() {
  const { categories, createCategory, updateCategory, archiveCategory, moveCategory } = useCategoryStore();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string>();
  const [editingName, setEditingName] = useState("");
  const ordered = [...categories].sort((left, right) => (left.sortOrder ?? 999) - (right.sortOrder ?? 999) || left.name.localeCompare(right.name));
  const active = ordered.filter((category) => !category.isArchived);
  const archived = ordered.filter((category) => category.isArchived);

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    await createCategory(name);
    setName("");
  }

  async function save(id: string) {
    if (!editingName.trim()) return;
    await updateCategory(id, { name: editingName.trim() });
    setEditingId(undefined);
  }

  return (
    <div className="category-settings-card">
      <form onSubmit={add}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="新增分类" aria-label="新分类名称" />
        <button type="submit" disabled={!name.trim()}>添加</button>
      </form>
      <div className="category-settings-list">
        {active.map((category, index) => (
          <div key={category.id}>
            {editingId === category.id ? (
              <input value={editingName} onChange={(event) => setEditingName(event.target.value)} aria-label={`重命名${category.name}`} />
            ) : <span>{category.name}</span>}
            <div>
              {editingId === category.id ? (
                <><button type="button" onClick={() => save(category.id)}>保存</button><button type="button" onClick={() => setEditingId(undefined)}>取消</button></>
              ) : (
                <><button type="button" disabled={index === 0} onClick={() => moveCategory(category.id, -1)}>↑</button><button type="button" disabled={index === active.length - 1} onClick={() => moveCategory(category.id, 1)}>↓</button><button type="button" onClick={() => { setEditingId(category.id); setEditingName(category.name); }}>重命名</button>{category.id !== "other" ? <button type="button" onClick={() => archiveCategory(category.id)}>归档</button> : null}</>
              )}
            </div>
          </div>
        ))}
      </div>
      {archived.length ? (
        <details>
          <summary>已归档分类（{archived.length}）</summary>
          {archived.map((category) => <button key={category.id} type="button" onClick={() => updateCategory(category.id, { isArchived: false })}>{category.name} · 恢复</button>)}
        </details>
      ) : null}
    </div>
  );
}
