import { ItemForm, type ItemFormData } from "../../components/ItemForm";
import { useInventoryStore } from "../../store/itemStore";
import { navigate } from "../router";

export default function NewItemPage() {
  const { createItem } = useInventoryStore();

  async function handleSubmit(data: ItemFormData) {
    const id = await createItem({
      ...data,
      initialQuantity: data.quantity,
    });
    navigate(`/items/${id}`);
  }

  return (
    <div className="page-stack">
      <ItemForm submitLabel="保存物品" onSubmit={handleSubmit} />
    </div>
  );
}
