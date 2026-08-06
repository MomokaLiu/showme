import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "../../components/EmptyState";
import { ImageLightbox } from "../../components/ImageLightbox";
import { PrivacyGate } from "../../components/PrivacyGate";
import { StatusBadge } from "../../components/StatusBadge";
import { isPrivateSessionUnlocked } from "../../services/privacyService";
import { useInventoryStore } from "../../store/itemStore";
import {
  calculateCurrentValue,
  calculateShelfLifeDailyCost,
  calculateUnitPrice,
  calculateWasteAmount,
  getRemainingDays,
} from "../../utils/itemCalculations";
import { actionText, formatCurrency, formatNumber, formatRemainingDays } from "../../utils/formatters";
import { getItemImageUrls } from "../../utils/itemImages";
import { getLocationGroups } from "../../utils/locations";
import { navigate, type ItemFoundSource } from "../router";

export default function ItemDetailPage({ itemId, foundVia }: { itemId: string; foundVia?: ItemFoundSource }) {
  const {
    items,
    logs,
    locations,
    getCategoryName,
    getLocationPath,
    updateItem,
    recordItemFound,
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
  const [moveOpen, setMoveOpen] = useState(false);
  const [message, setMessage] = useState("");
  const countedEntryRef = useRef<string>();
  const item = items.find((candidate) => candidate.id === itemId);
  const imageUrls = item ? getItemImageUrls(item) : [];
  const locationGroups = getLocationGroups(locations);
  const itemLogs = useMemo(
    () => logs.filter((log) => log.itemId === itemId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [itemId, logs],
  );

  useEffect(() => {
    if (!item || !foundVia) return;
    const entryKey = `${itemId}:${foundVia}`;
    if (countedEntryRef.current === entryKey) return;
    countedEntryRef.current = entryKey;
    void recordItemFound(itemId);
  }, [foundVia, item, itemId, recordItemFound]);

  if (!item) return <EmptyState title="物品不存在" action={<button onClick={() => navigate("/")}>返回找东西</button>} />;
  if (item.isPrivate && !isPrivateSessionUnlocked()) return <PrivacyGate><ItemDetailPage itemId={itemId} /></PrivacyGate>;

  const isConsumable = item.mode === "consumable";
  const remainingDays = getRemainingDays(item.finalExpireDate);
  const unitPrice = calculateUnitPrice(item.totalPrice, item.initialQuantity);
  const shelfLifeDailyCost = calculateShelfLifeDailyCost(item);
  const discardLog = itemLogs.find((log) => log.actionType === "discard");
  const wasteAmount = discardLog ? calculateWasteAmount(item, Math.abs(discardLog.quantityChange ?? 0)) : undefined;

  async function handleDelete() {
    await deleteItem(itemId);
    navigate(item?.isPrivate ? "/items/private" : "/");
  }

  async function moveItem(locationId: string) {
    await updateItem(itemId, { locationId: locationId || undefined });
    setMoveOpen(false);
    setMessage(locationId ? `已移动到${getLocationPath(locationId)}。` : "已设为待归位。");
  }

  return (
    <div className="page-stack item-detail-v2">
      <section className="detail-hero">
        {imageUrls.length ? <div className="detail-gallery">
          <button type="button" className="detail-gallery__primary" onClick={() => setPreviewIndex(0)}><img src={imageUrls[0]} alt={`${item.name}的图片`} /><span>点击查看大图</span></button>
          {imageUrls.length > 1 ? <div className="detail-gallery__thumbnails" aria-label={`共 ${imageUrls.length} 张图片`}>{imageUrls.map((imageUrl, index) => <button type="button" key={`${imageUrl}-${index}`} className={index === 0 ? "is-primary" : ""} onClick={() => setPreviewIndex(index)} aria-label={`查看第 ${index + 1} 张图片`}><img src={imageUrl} alt="" /></button>)}</div> : null}
        </div> : null}
        <div className="detail-hero__content"><div><span>{getCategoryName(item.categoryId)}</span><h2>{item.name}</h2></div>{isConsumable ? <StatusBadge status={item.status} /> : <span className="regular-mode-badge">普通物品</span>}</div>
      </section>

      <section className="item-location-focus">
        <span>放在</span>
        <strong>{getLocationPath(item.locationId)}</strong>
        <button type="button" onClick={() => setMoveOpen((open) => !open)}>移动位置</button>
        {moveOpen ? <select value={item.locationId ?? ""} onChange={(event) => void moveItem(event.target.value)} aria-label="移动物品到"><option value="">待归位</option>{locationGroups.map(({ area, containers }) => <optgroup key={area.id} label={area.name}><option value={area.id}>{area.name}</option>{containers.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</optgroup>)}</select> : null}
      </section>
      {message ? <p className="form-message" role="status">{message}</p> : null}

      {isConsumable ? <section className="detail-grid">
        <DetailRow label="当前数量" value={`${formatNumber(item.quantity)}${item.unit}`} />
        <DetailRow label="过期日期" value={item.finalExpireDate ?? "未设置"} />
        <DetailRow label="剩余有效期" value={formatRemainingDays(remainingDays)} />
        <DetailRow label="总价" value={formatCurrency(item.totalPrice)} />
        <DetailRow label="单价" value={formatCurrency(unitPrice)} />
        <DetailRow label="库存价值" value={formatCurrency(calculateCurrentValue(item))} />
        <DetailRow label="有效期日均成本" value={shelfLifeDailyCost ? `${formatCurrency(shelfLifeDailyCost)}/天` : "-"} />
        {item.actualDailyCost !== null && item.actualDailyCost !== undefined ? <DetailRow label="实际日用成本" value={`${formatCurrency(item.actualDailyCost)}/天`} /> : null}
        {wasteAmount !== undefined ? <DetailRow label="浪费金额" value={formatCurrency(wasteAmount)} /> : null}
      </section> : null}

      {item.brand || item.model || item.purchaseDate || item.purchaseChannel || item.totalPrice !== undefined || item.tags?.length || item.openDate || item.note ? <details className="item-more-details"><summary>更多资料</summary><div className="detail-grid">
        {item.brand ? <DetailRow label="品牌" value={item.brand} /> : null}
        {item.model ? <DetailRow label="型号" value={item.model} /> : null}
        {item.purchaseDate ? <DetailRow label="购入日期" value={item.purchaseDate} /> : null}
        {item.purchaseChannel ? <DetailRow label="购买渠道" value={item.purchaseChannel} /> : null}
        {!isConsumable && item.totalPrice !== undefined ? <DetailRow label="购买价格" value={formatCurrency(item.totalPrice)} /> : null}
        {item.tags?.length ? <DetailRow label="标签" value={item.tags.join("、")} wide /> : null}
        {item.openDate ? <DetailRow label="开封日期" value={item.openDate} /> : null}
        {item.note ? <DetailRow label="备注" value={item.note} wide /> : null}
      </div></details> : null}

      <section className="action-panel">
        <h3>{isConsumable ? "消耗管理" : "物品操作"}</h3>
        {isConsumable ? <>
          <label className="field"><span>操作备注</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="可选" /></label>
          <div className="field-grid"><label className="field"><span>消耗数量</span><input type="number" min="0" step="0.1" value={consumeQuantity} onChange={(event) => setConsumeQuantity(Number(event.target.value))} /></label><button type="button" className="secondary-button" onClick={() => consumeItem(item.id, consumeQuantity, note)}>消耗</button></div>
          <div className="field-grid"><label className="field"><span>补充数量</span><input type="number" min="0" step="0.1" value={restockQuantity} onChange={(event) => setRestockQuantity(Number(event.target.value))} /></label><button type="button" className="secondary-button" onClick={() => restockItem(item.id, restockQuantity, note)}>补充</button></div>
          <div className="button-grid"><button type="button" onClick={() => finishItem(item.id, note)}>标记用完</button><button type="button" onClick={() => discardItem(item.id, note || "丢弃")}>标记丢弃</button><button type="button" onClick={() => discardItem(item.id, note || "过期处理")}>过期处理</button><button type="button" onClick={() => markOpened(item.id)}>标记开封</button><button type="button" onClick={() => addItemToShoppingList(item.id)}>加入补货清单</button><button type="button" onClick={() => navigate(`/items/edit/${item.id}`)}>编辑资料</button></div>
        </> : <button type="button" className="primary-button" onClick={() => navigate(`/items/edit/${item.id}`)}>编辑资料</button>}

        {isDeleteConfirmOpen ? <div className="delete-confirm" role="alert"><span>删除后无法恢复，同时会移除这件物品的使用记录。</span><div><button type="button" className="danger-button" onClick={handleDelete}>确认删除</button><button type="button" onClick={() => setIsDeleteConfirmOpen(false)}>取消</button></div></div> : <button type="button" className="danger-button" onClick={() => setIsDeleteConfirmOpen(true)}>删除物品</button>}
      </section>

      {isConsumable ? <section className="section-block"><div className="section-title"><h2>使用记录</h2></div>{itemLogs.length ? <div className="log-list">{itemLogs.map((log) => <div key={log.id} className="log-row"><div><strong>{actionText[log.actionType]}</strong>{log.note ? <span>{log.note}</span> : null}</div><small>{log.quantityChange ? `${formatNumber(log.quantityChange)}${item.unit} · ` : ""}{new Date(log.createdAt).toLocaleString("zh-CN")}</small></div>)}</div> : <EmptyState title="暂无使用记录" />}</section> : null}

      {previewIndex !== null ? <ImageLightbox images={imageUrls} initialIndex={previewIndex} itemName={item.name} onClose={() => setPreviewIndex(null)} /> : null}
    </div>
  );
}

function DetailRow({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={wide ? "detail-row detail-row--wide" : "detail-row"}><span>{label}</span><strong>{value}</strong></div>;
}
