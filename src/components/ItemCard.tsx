import type { Item } from "../types/item";
import { getItemImageUrls } from "../utils/itemImages";
import { getRemainingDays, isLowStock } from "../utils/itemCalculations";
import { formatCurrency, formatRemainingDays } from "../utils/formatters";
import { CategoryBadge } from "./CategoryBadge";
import { StatusBadge } from "./StatusBadge";

type ItemCardProps = {
  item: Item;
  categoryName: string;
  locationName: string;
  onClick?: () => void;
  compact?: boolean;
  viewMode?: "list" | "grid";
};

export function ItemCard({
  item,
  categoryName,
  locationName,
  onClick,
  compact,
  viewMode = "list",
}: ItemCardProps) {
  const remainingDays = getRemainingDays(item.finalExpireDate);
  const coverImageUrl = getItemImageUrls(item)[0];
  const isGrid = viewMode === "grid";
  const hasActualDailyCost = item.actualDailyCost !== null && item.actualDailyCost !== undefined;

  return (
    <article
      className={`item-card ${compact ? "item-card--compact" : ""} ${isGrid ? "item-card--grid" : ""}`}
      onClick={onClick}
    >
      {isGrid && coverImageUrl ? <img className="item-card__grid-image" src={coverImageUrl} alt="" /> : null}
      <div className="item-card__main">
        <div className="item-card__content">
          {!isGrid && coverImageUrl ? <img className="item-card__image" src={coverImageUrl} alt="" /> : null}
          <div>
            <div className="item-card__title-row">
              <h3>{item.name}</h3>
              <StatusBadge status={item.status} />
            </div>
            <div className="item-card__meta">
              <CategoryBadge label={categoryName} />
              <span>{locationName}</span>
              {isLowStock(item) ? <span className="low-stock">低库存</span> : null}
            </div>
          </div>
        </div>
        <strong className="remaining-days">{formatRemainingDays(remainingDays)}</strong>
      </div>
      {!compact ? (
        <div className="item-card__footer">
          <span>
            {item.quantity}
            {item.unit}
          </span>
          {item.totalPrice !== undefined && item.totalPrice !== null ? (
            <span>购买价 {formatCurrency(item.totalPrice)}</span>
          ) : null}
          {hasActualDailyCost ? (
            <strong className="item-card__actual-daily-cost">
              {isGrid ? "" : "实际日用 "}
              {formatCurrency(item.actualDailyCost ?? undefined)}/天
            </strong>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
