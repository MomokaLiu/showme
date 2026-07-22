import { useMemo, useState } from "react";
import { EmptyState } from "../../components/EmptyState";
import { StatusBadge } from "../../components/StatusBadge";
import { useInventoryStore } from "../../store/itemStore";
import {
  calculateActualDailyCost,
  calculateCurrentValue,
  calculateShelfLifeDailyCost,
  calculateUnitPrice,
  calculateWasteAmount,
  getRemainingDays,
} from "../../utils/itemCalculations";
import { actionText, formatCurrency, formatNumber, formatRemainingDays } from "../../utils/formatters";
import { navigate } from "../router";

export default function ItemDetailPage({ itemId }: { itemId: string }) {
  const {
    items,
    logs,
    getCategoryName,
    getLocationName,
    consumeItem,
    finishItem,
    discardItem,
    markOpened,
    restockItem,
    addItemToShoppingList,
    deleteItem,
  } = useInventoryStore();
  const [consumeQuantity, setConsumeQuantity] = useState(1);
  const [restockQuantity, setRestockQuantity] = useState(1);
  const [note, setNote] = useState("");
  const item = items.find((candidate) => candidate.id === itemId);

  const itemLogs = useMemo(
    () => logs.filter((log) => log.itemId === itemId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [itemId, logs],
  );

  if (!item) {
    return <EmptyState title="物品不存在" action={<button onClick={() => navigate("/items")}>返回库存</button>} />;
  }

  const remainingDays = getRemainingDays(item.finalExpireDate);
  const unitPrice = calculateUnitPrice(item.totalPrice, item.initialQuantity);
  const shelfLifeDailyCost = calculateShelfLifeDailyCost(item);
  const actualDailyCost = calculateActualDailyCost(item);
  const discardLog = itemLogs.find((log) => log.actionType === "discard");
  const wasteAmount = discardLog ? calculateWasteAmount(item, Math.abs(discardLog.quantityChange ?? 0)) : undefined;

  async function handleDelete() {
    if (!window.confirm("确认删除这个物品？")) return;
    await deleteItem(itemId);
    navigate("/items");
  }

  return (
    <div className="page-stack">
      <section className="detail-hero">
        {item.imageUrl ? <img className="detail-hero__image" src={item.imageUrl} alt={`${item.name}的图片`} /> : null}
        <div className="detail-hero__content">
          <div>
            <span>{getCategoryName(item.categoryId)}</span>
            <h2>{item.name}</h2>
          </div>
          <StatusBadge status={item.status} />
        </div>
      </section>

      <section className="detail-grid">
        <DetailRow label="当前数量" value={`${formatNumber(item.quantity)}${item.unit}`} />
        <DetailRow label="存放位置" value={getLocationName(item.locationId)} />
        <DetailRow label="购入日期" value={item.purchaseDate} />
        <DetailRow label="过期日期" value={item.finalExpireDate ?? "未设置"} />
        <DetailRow label="剩余有效期" value={formatRemainingDays(remainingDays)} />
        <DetailRow label="总价" value={formatCurrency(item.totalPrice)} />
        <DetailRow label="单价" value={formatCurrency(unitPrice)} />
        <DetailRow label="库存价值" value={formatCurrency(calculateCurrentValue(item))} />
        <DetailRow label="有效期日均成本" value={shelfLifeDailyCost ? `${formatCurrency(shelfLifeDailyCost)}/天` : "-"} />
        <DetailRow label="实际日均成本" value={actualDailyCost ? `${formatCurrency(actualDailyCost)}/天` : "-"} />
        {wasteAmount !== undefined ? <DetailRow label="浪费金额" value={formatCurrency(wasteAmount)} /> : null}
        {item.brand ? <DetailRow label="品牌" value={item.brand} /> : null}
        {item.purchaseChannel ? <DetailRow label="购买渠道" value={item.purchaseChannel} /> : null}
        {item.openDate ? <DetailRow label="开封日期" value={item.openDate} /> : null}
        {item.note ? <DetailRow label="备注" value={item.note} wide /> : null}
      </section>

      <section className="action-panel">
        <h3>操作</h3>
        <label className="field">
          <span>操作备注</span>
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="可选" />
        </label>
        <div className="field-grid">
          <label className="field">
            <span>消耗数量</span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={consumeQuantity}
              onChange={(event) => setConsumeQuantity(Number(event.target.value))}
            />
          </label>
          <button type="button" className="secondary-button" onClick={() => consumeItem(item.id, consumeQuantity, note)}>
            消耗
          </button>
        </div>
        <div className="field-grid">
          <label className="field">
            <span>补充数量</span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={restockQuantity}
              onChange={(event) => setRestockQuantity(Number(event.target.value))}
            />
          </label>
          <button type="button" className="secondary-button" onClick={() => restockItem(item.id, restockQuantity, note)}>
            补充
          </button>
        </div>
        <div className="button-grid">
          <button type="button" onClick={() => finishItem(item.id, note)}>
            标记用完
          </button>
          <button type="button" onClick={() => discardItem(item.id, note || "丢弃")}>
            标记丢弃
          </button>
          <button type="button" onClick={() => discardItem(item.id, note || "过期处理")}>
            过期处理
          </button>
          <button type="button" onClick={() => markOpened(item.id)}>
            标记开封
          </button>
          <button type="button" onClick={() => addItemToShoppingList(item.id)}>
            加入清单
          </button>
          <button type="button" onClick={() => navigate(`/items/edit/${item.id}`)}>
            编辑物品
          </button>
        </div>
        <button type="button" className="danger-button" onClick={handleDelete}>
          删除物品
        </button>
      </section>

      <section className="section-block">
        <div className="section-title">
          <h2>使用记录</h2>
        </div>
        {itemLogs.length ? (
          <div className="log-list">
            {itemLogs.map((log) => (
              <div key={log.id} className="log-row">
                <div>
                  <strong>{actionText[log.actionType]}</strong>
                  {log.note ? <span>{log.note}</span> : null}
                </div>
                <small>
                  {log.quantityChange ? `${formatNumber(log.quantityChange)}${item.unit} · ` : ""}
                  {new Date(log.createdAt).toLocaleString("zh-CN")}
                </small>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="暂无使用记录" />
        )}
      </section>
    </div>
  );
}

function DetailRow({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "detail-row detail-row--wide" : "detail-row"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
