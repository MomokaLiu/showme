import { useState, type FormEvent } from "react";
import { EmptyState } from "../../components/EmptyState";
import { useShoppingStore } from "../../store/shoppingStore";
import { formatCurrency, formatNumber } from "../../utils/formatters";
import type { ShoppingItem } from "../../types/shopping";
import { navigate } from "../router";

export default function ShoppingPage({ embedded = false }: { embedded?: boolean }) {
  const { shoppingItems, addShoppingItem, toggleShoppingPurchased, deleteShoppingItem } = useShoppingStore();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState<number | undefined>(1);
  const [unit, setUnit] = useState("件");
  const [estimatedPrice, setEstimatedPrice] = useState<number | undefined>();
  const [note, setNote] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    await addShoppingItem({
      name: name.trim(),
      quantity,
      unit,
      estimatedPrice,
      note: note.trim() || undefined,
    });
    setName("");
    setQuantity(1);
    setEstimatedPrice(undefined);
    setNote("");
  }

  const activeItems = shoppingItems.filter((item) => !item.isPurchased);
  const purchasedItems = shoppingItems.filter((item) => item.isPurchased);

  function convertToInventory(item: ShoppingItem) {
    window.sessionStorage.setItem("buwangwu.shoppingConversion", JSON.stringify(item));
    navigate("/items/new");
  }

  return (
    <div className={embedded ? "embedded-page-stack" : "page-stack"}>
      <form className="shopping-form" onSubmit={handleSubmit}>
        <div className="shopping-primary-row">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="要买什么" aria-label="购物项名称" />
          <button type="submit" className="primary-button" disabled={!name.trim()}>
            添加
          </button>
        </div>
        <details className="shopping-extras">
          <summary>补充数量、价格或备注（可选）</summary>
          <div className="field-grid">
            <input
              type="number"
              min="0"
              step="0.1"
              value={quantity ?? ""}
              onChange={(event) => setQuantity(event.target.value === "" ? undefined : Number(event.target.value))}
              placeholder="数量"
            />
            <input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="单位" />
          </div>
          <div className="field-grid">
            <input
              type="number"
              min="0"
              step="0.01"
              value={estimatedPrice ?? ""}
              onChange={(event) => setEstimatedPrice(event.target.value === "" ? undefined : Number(event.target.value))}
              placeholder="预估价格"
            />
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="备注" />
          </div>
        </details>
      </form>

      <ShoppingSection
        title="待购买"
        items={activeItems}
        emptyTitle="购物清单是空的"
        onToggle={toggleShoppingPurchased}
        onDelete={deleteShoppingItem}
        onConvert={convertToInventory}
      />
      {purchasedItems.length ? <ShoppingSection
        title="已购买"
        items={purchasedItems}
        emptyTitle="暂无已购买项目"
        onToggle={toggleShoppingPurchased}
        onDelete={deleteShoppingItem}
      /> : null}
    </div>
  );
}

type ShoppingSectionProps = {
  title: string;
  emptyTitle: string;
  items: ReturnType<typeof useShoppingStore>["shoppingItems"];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onConvert?: (item: ShoppingItem) => void;
};

function ShoppingSection({ title, emptyTitle, items, onToggle, onDelete, onConvert }: ShoppingSectionProps) {
  return (
    <section className="section-block">
      <div className="section-title">
        <h2>{title}</h2>
        <span>{items.length}</span>
      </div>
      {items.length ? (
        <div className="shopping-list">
          {items.map((item) => (
            <article className={item.isPurchased ? "shopping-item shopping-item--done" : "shopping-item"} key={item.id}>
              <label>
                <input type="checkbox" checked={item.isPurchased} onChange={() => onToggle(item.id)} />
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {item.quantity ? `${formatNumber(item.quantity)}${item.unit ?? ""}` : "数量未定"}
                    {item.estimatedPrice ? ` · ${formatCurrency(item.estimatedPrice)}` : ""}
                    {item.note ? ` · ${item.note}` : ""}
                  </small>
                </span>
              </label>
              <div className="shopping-item__actions">
                {onConvert && !item.isPurchased ? (
                  <button className="shopping-convert-button" type="button" onClick={() => onConvert(item)}>买到并入库</button>
                ) : null}
                <button type="button" onClick={() => onDelete(item.id)}>删除</button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title={emptyTitle} />
      )}
    </section>
  );
}
