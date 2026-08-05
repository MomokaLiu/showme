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

  const isQuickCreated = window.sessionStorage.getItem("buwangwu.quickCreatedItemId") === itemId;

  async function handleSubmit(data: ItemFormData) {
    await updateItem(itemId, data);
    window.sessionStorage.removeItem("buwangwu.quickCreatedItemId");
    navigate(`/items/${itemId}`);
  }

  return (
    <div className="page-stack">
      {isQuickCreated ? (
        <section className="step-two-banner">
          <strong>物品已创建</strong>
          <span>Step 2 · 继续完善信息，或直接返回稍后再填。</span>
        </section>
      ) : null}
      <ItemForm initialItem={item} submitLabel="保存修改" onSubmit={handleSubmit} />
    </div>
  );
}
