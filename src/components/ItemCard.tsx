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
  const isConsumable = item.mode === "consumable";

  return (
    <article
      className={`item-card ${compact ? "item-card--compact" : ""} ${isGrid ? "item-card--grid" : ""}`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        onClick();
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {isGrid ? (
        coverImageUrl
          ? <img className="item-card__grid-image" src={coverImageUrl} alt="" />
          : <ImagePlaceholder className="item-card__grid-image" />
      ) : null}
      <div className="item-card__main">
        <div className="item-card__content">
          {!isGrid ? (
            coverImageUrl
              ? <img className="item-card__image" src={coverImageUrl} alt="" />
              : <ImagePlaceholder className="item-card__image" />
          ) : null}
          <div>
            <div className="item-card__title-row">
              <h3>{item.name}</h3>
              {isConsumable ? <StatusBadge status={item.status} /> : null}
            </div>
            <div className="item-card__meta">
              <CategoryBadge label={categoryName} />
              <span className="item-card__location">{locationName}</span>
              {isConsumable && isLowStock(item) ? <span className="low-stock">低库存</span> : null}
            </div>
          </div>
        </div>
        {isConsumable && remainingDays !== undefined ? <strong className="remaining-days">{formatRemainingDays(remainingDays)}</strong> : null}
      </div>
      {!compact && isConsumable ? (
        <div className="item-card__footer">
          {isConsumable ? <span>
            {item.quantity}
            {item.unit}
          </span> : null}
          {item.totalPrice !== undefined && item.totalPrice !== null ? (
            <span>购买价 {formatCurrency(item.totalPrice)}</span>
          ) : null}
          {isConsumable && hasActualDailyCost ? (
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

function ImagePlaceholder({ className }: { className: string }) {
  return (
    <div className={`${className} item-card__image-placeholder`} role="img" aria-label="暂无图片">
      <svg aria-hidden="true" viewBox="0 0 32 32">
        <rect x="3.5" y="5.5" width="25" height="21" rx="4" />
        <circle cx="11" cy="12" r="2.5" />
        <path d="m6.5 23 6.8-6.8 4.2 4.2 3.2-3.2 4.8 5.8" />
      </svg>
      <span>暂无图片</span>
    </div>
  );
}
