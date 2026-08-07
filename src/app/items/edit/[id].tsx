import { EmptyState } from "../../../components/EmptyState";
import { ItemForm, type ItemFormData } from "../../../components/ItemForm";
import { PrivacyGate } from "../../../components/PrivacyGate";
import { isPrivateSessionUnlocked } from "../../../services/privacyService";
import { useInventoryStore } from "../../../store/itemStore";
import { navigate } from "../../router";

export default function EditItemPage({ itemId }: { itemId: string }) {
  const { items, updateItem } = useInventoryStore();
  const item = items.find((candidate) => candidate.id === itemId);

  if (!item) {
    return <EmptyState title="物品不存在" action={<button onClick={() => navigate("/")}>返回找东西</button>} />;
  }

  if (item.isPrivate && !isPrivateSessionUnlocked()) {
    return (
      <PrivacyGate>
        <EditItemPage itemId={itemId} />
      </PrivacyGate>
    );
  }

  async function handleSubmit(data: ItemFormData) {
    await updateItem(itemId, data);
    window.sessionStorage.removeItem("buwangwu.quickCreatedItemId");
    navigate(`/items/${itemId}`);
  }

  return (
    <div className="page-stack edit-item-page">
      <ItemForm initialItem={item} submitLabel="保存修改" onSubmit={handleSubmit} />
    </div>
  );
}
