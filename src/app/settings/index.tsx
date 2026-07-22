import { useInventoryStore } from "../../store/itemStore";

export default function SettingsPage() {
  const { categories, locations, items, shoppingItems } = useInventoryStore();
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  const androidTestUrl =
    host === "127.0.0.1" || host === "localhost"
      ? "运行 npm run android:url 获取手机可访问地址"
      : window.location.origin;

  return (
    <div className="page-stack">
      <section className="section-block">
        <div className="section-title">
          <h2>安卓真机测试</h2>
        </div>
        <div className="android-test-card">
          <strong>{androidTestUrl}</strong>
          <span>电脑运行 npm run dev:android 后，手机和电脑连同一 Wi-Fi，再用手机 Chrome 打开电脑局域网地址。</span>
          <span>可运行 npm run android:url 查看可用地址。</span>
        </div>
      </section>

      <section className="section-block">
        <div className="section-title">
          <h2>数据概览</h2>
        </div>
        <div className="detail-grid">
          <div className="detail-row">
            <span>库存记录</span>
            <strong>{items.length}</strong>
          </div>
          <div className="detail-row">
            <span>购物项</span>
            <strong>{shoppingItems.length}</strong>
          </div>
          <div className="detail-row">
            <span>分类</span>
            <strong>{categories.length}</strong>
          </div>
          <div className="detail-row">
            <span>位置</span>
            <strong>{locations.length}</strong>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-title">
          <h2>默认分类</h2>
        </div>
        <div className="tag-wrap">
          {categories.map((category) => (
            <span key={category.id}>{category.name}</span>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-title">
          <h2>默认位置</h2>
        </div>
        <div className="tag-wrap">
          {locations.map((location) => (
            <span key={location.id}>{location.name}</span>
          ))}
        </div>
      </section>
    </div>
  );
}
