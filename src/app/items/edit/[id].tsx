import { EmptyState } from "../../../components/EmptyState";
import { ItemForm, type ItemFormData } from "../../../components/ItemForm";
import { useInventoryStore } from "../../../store/itemStore";
import { navigate } from "../../router";

export default function EditItemPage({ itemId }: { itemId: string }) {
  const { items, updateItem } = useInventoryStore();
  const item = items.find((candidate) => candidate.id === itemId);

  if (!item) {
    return <EmptyState title="物品不存在" action={<button onClick={() => navigate("/items")}>返回库存</button>} />;
  }

  async function handleSubmit(data: ItemFormData) {
    await updateItem(itemId, data);
    navigate(`/items/${itemId}`);
  }

  return (
    <div className="page-stack">
      <ItemForm initialItem={item} submitLabel="保存修改" onSubmit={handleSubmit} />
    </div>
  );
}
