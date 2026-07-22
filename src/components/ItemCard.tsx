import type { Item } from "../types/item";
import { calculateCurrentValue, calculateShelfLifeDailyCost, getRemainingDays, isLowStock } from "../utils/itemCalculations";
import { formatCurrency, formatRemainingDays } from "../utils/formatters";
import { CategoryBadge } from "./CategoryBadge";
import { StatusBadge } from "./StatusBadge";

type ItemCardProps = {
  item: Item;
  categoryName: string;
  locationName: string;
  onClick?: () => void;
  compact?: boolean;
};

export function ItemCard({ item, categoryName, locationName, onClick, compact }: ItemCardProps) {
  const remainingDays = getRemainingDays(item.finalExpireDate);
  const dailyCost = calculateShelfLifeDailyCost(item);

  return (
    <article className={`item-card ${compact ? "item-card--compact" : ""}`} onClick={onClick}>
      <div className="item-card__main">
        <div className="item-card__content">
          {item.imageUrl ? <img className="item-card__image" src={item.imageUrl} alt="" /> : null}
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
          <span>{formatCurrency(calculateCurrentValue(item))}</span>
          <span>{dailyCost ? `${formatCurrency(dailyCost)}/天` : "日均 -"}</span>
        </div>
      ) : null}
    </article>
  );
}
