import { CategorySettingsCard } from "../../components/CategorySettingsCard";
import { useInventoryStore } from "../../store/itemStore";

export default function CategoriesPage() {
  const { categories } = useInventoryStore();
  const activeCount = categories.filter((category) => !category.isArchived).length;

  return (
    <div className="page-stack category-management-page">
      <section className="category-management-intro">
        <span>家庭分类</span>
        <h2>用熟悉的方式整理物品</h2>
        <p>{activeCount} 个分类正在使用；调整后会立即应用到查找与筛选。</p>
      </section>
      <section className="section-block category-management-card">
        <CategorySettingsCard />
      </section>
    </div>
  );
}
