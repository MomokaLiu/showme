import { EmptyState } from "../../components/EmptyState";
import { ItemCard } from "../../components/ItemCard";
import { PrivacyGate } from "../../components/PrivacyGate";
import { lockPrivateSession } from "../../services/privacyService";
import { useInventoryStore } from "../../store/itemStore";
import { navigate } from "../router";

export default function PrivateInventoryPage() {
  const { items, getCategoryName, getLocationName } = useInventoryStore();
  const privateItems = items.filter((item) => item.isPrivate);

  const lockedPreview = privateItems.length ? (
    <div className="private-placeholder-list" aria-label="私密物品已隐藏">
      {privateItems.slice(0, 3).map((item) => (
        <div className="private-placeholder" key={item.id}>
          <span aria-hidden="true">████████</span>
          <strong>私密物品</strong>
        </div>
      ))}
    </div>
  ) : undefined;

  return (
    <PrivacyGate lockedPreview={lockedPreview}>
      <div className="page-stack">
        <section className="private-space-header">
          <div>
            <span>已解锁</span>
            <h2>私密库存</h2>
            <p>私密物品不会出现在“找东西”、普通列表和榜单中。</p>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              lockPrivateSession();
              navigate("/items");
            }}
          >
            立即锁定
          </button>
        </section>
        {privateItems.length ? (
          <div className="list-stack">
            {privateItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                categoryName={getCategoryName(item.categoryId)}
                locationName={getLocationName(item.locationId)}
                onClick={() => navigate(`/items/${item.id}`)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="私密库存还是空的"
            description="编辑任意物品并开启“设为私密物品”，它就会移动到这里。"
          />
        )}
      </div>
    </PrivacyGate>
  );
}
