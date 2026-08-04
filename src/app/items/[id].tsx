import { useMemo, useState } from "react";
import { EmptyState } from "../../components/EmptyState";
import { ImageLightbox } from "../../components/ImageLightbox";
import { PrivacyGate } from "../../components/PrivacyGate";
import { StatusBadge } from "../../components/StatusBadge";
import { useInventoryStore } from "../../store/itemStore";
import {
  calculateCurrentValue,
  calculateShelfLifeDailyCost,
  calculateUnitPrice,
  calculateWasteAmount,
  getRemainingDays,
} from "../../utils/itemCalculations";
import { getItemImageUrls } from "../../utils/itemImages";
import { actionText, formatCurrency, formatNumber, formatRemainingDays } from "../../utils/formatters";
import { navigate } from "../router";
import { isPrivateSessionUnlocked } from "../../services/privacyService";

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
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const item = items.find((candidate) => candidate.id === itemId);
  const imageUrls = item ? getItemImageUrls(item) : [];

  const itemLogs = useMemo(
    () => logs.filter((log) => log.itemId === itemId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [itemId, logs],
  );

  if (!item) {
    return <EmptyState title="物品不存在" action={<button onClick={() => navigate("/items")}>返回库存</button>} />;
  }

  if (item.isPrivate && !isPrivateSessionUnlocked()) {
    return (
      <PrivacyGate>
        <ItemDetailPage itemId={itemId} />
      </PrivacyGate>
    );
  }

  const remainingDays = getRemainingDays(item.finalExpireDate);
  const unitPrice = calculateUnitPrice(item.totalPrice, item.initialQuantity);
  const shelfLifeDailyCost = calculateShelfLifeDailyCost(item);
  const isPrivateItem = Boolean(item.isPrivate);
  const discardLog = itemLogs.find((log) => log.actionType === "discard");
  const wasteAmount = discardLog ? calculateWasteAmount(item, Math.abs(discardLog.quantityChange ?? 0)) : undefined;

  async function handleDelete() {
    await deleteItem(itemId);
    navigate(isPrivateItem ? "/items/private" : "/items");
  }

  return (
    <div className="page-stack">
      <section className="detail-hero">
        {imageUrls.length ? (
          <div className="detail-gallery">
            <button type="button" className="detail-gallery__primary" onClick={() => setPreviewIndex(0)}>
              <img src={imageUrls[0]} alt={`${item.name}的图片`} />
              <span>点击查看大图</span>
            </button>
            {imageUrls.length > 1 ? (
              <div className="detail-gallery__thumbnails" aria-label={`共 ${imageUrls.length} 张图片`}>
                {imageUrls.map((imageUrl, index) => (
                  <button
                    type="button"
                    key={`${imageUrl}-${index}`}
                    className={index === 0 ? "is-primary" : ""}
                    aria-label={`查看第 ${index + 1} 张图片`}
                    onClick={() => setPreviewIndex(index)}
                  >
                    <img src={imageUrl} alt="" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
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
        {item.purchaseDate ? <DetailRow label="购入日期" value={item.purchaseDate} /> : null}
        <DetailRow label="过期日期" value={item.finalExpireDate ?? "未设置"} />
        <DetailRow label="剩余有效期" value={formatRemainingDays(remainingDays)} />
        <DetailRow label="总价" value={formatCurrency(item.totalPrice)} />
        <DetailRow label="单价" value={formatCurrency(unitPrice)} />
        <DetailRow label="库存价值" value={formatCurrency(calculateCurrentValue(item))} />
        <DetailRow label="有效期日均成本" value={shelfLifeDailyCost ? `${formatCurrency(shelfLifeDailyCost)}/天` : "-"} />
        {item.actualDailyCost !== null && item.actualDailyCost !== undefined ? (
          <DetailRow label="实际日用成本" value={`${formatCurrency(item.actualDailyCost)}/天`} />
        ) : null}
        {wasteAmount !== undefined ? <DetailRow label="浪费金额" value={formatCurrency(wasteAmount)} /> : null}
        {item.brand ? <DetailRow label="品牌" value={item.brand} /> : null}
        {item.model ? <DetailRow label="型号" value={item.model} /> : null}
        {item.purchaseChannel ? <DetailRow label="购买渠道" value={item.purchaseChannel} /> : null}
        {item.tags?.length ? <DetailRow label="标签" value={item.tags.join("、")} wide /> : null}
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
        {isDeleteConfirmOpen ? (
          <div className="delete-confirm" role="alert">
            <span>删除后无法恢复，同时会移除这件物品的使用记录。</span>
            <div>
              <button type="button" className="danger-button" onClick={handleDelete}>
                确认删除
              </button>
              <button type="button" onClick={() => setIsDeleteConfirmOpen(false)}>
                取消
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="danger-button" onClick={() => setIsDeleteConfirmOpen(true)}>
            删除物品
          </button>
        )}
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

      {previewIndex !== null ? (
        <ImageLightbox
          images={imageUrls}
          initialIndex={previewIndex}
          itemName={item.name}
          onClose={() => setPreviewIndex(null)}
        />
      ) : null}
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
