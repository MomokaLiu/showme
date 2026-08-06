import type { ReactNode } from "react";
import { useInventoryStore } from "../../store/itemStore";
import { navigate } from "../router";

export default function MyHomePage() {
  const { items, categories, locations } = useInventoryStore();
  const publicItems = items.filter((item) => !item.isPrivate);
  const activeItems = publicItems.filter((item) => item.status !== "finished" && item.status !== "discarded");
  const locatedItems = activeItems.filter((item) => Boolean(item.locationId));
  const activeCategories = categories.filter((category) => !category.isArchived);
  const activeLocations = locations.filter((location) => !location.isArchived);
  const unplacedCount = activeItems.length - locatedItems.length;

  return (
    <div className="page-stack my-home-page">
      <section className="my-home-hero">
        <div className="my-home-hero__copy">
          <span>我的家</span>
          <h2>家的物品，各有归处</h2>
          <p>{activeItems.length ? `${activeItems.length} 件物品在家中有迹可循` : "从记录第一件物品开始，让家慢慢变得清晰"}</p>
        </div>
        <HomeIllustration />
      </section>

      <button className="my-home-space-card" type="button" onClick={() => navigate("/locations")}>
        <span className="my-home-space-card__icon" aria-hidden="true"><LocationIcon /></span>
        <span className="my-home-space-card__copy">
          <small>家的空间</small>
          <strong>存放位置</strong>
          <em>{activeLocations.length} 个位置 · {locatedItems.length} 件已归位{unplacedCount ? ` · ${unplacedCount} 件待归位` : ""}</em>
        </span>
        <b aria-hidden="true">›</b>
      </button>

      <section className="my-home-section" aria-labelledby="home-organize-title">
        <div className="section-title my-home-section__heading">
          <div><h2 id="home-organize-title">整理与回顾</h2><span>让家的脉络更清楚</span></div>
        </div>
        <div className="my-home-action-grid">
          <HomeAction
            title="分类管理"
            description={`${activeCategories.length} 个使用中分类`}
            tone="sage"
            icon={<CategoryIcon />}
            onClick={() => navigate("/categories")}
          />
          <HomeAction
            title="数据洞察"
            description="看见消耗与库存健康"
            tone="mist"
            icon={<InsightIcon />}
            onClick={() => navigate("/insights")}
          />
          <HomeAction
            title="库存榜单"
            description="回顾价值、使用与闲置"
            tone="tea"
            icon={<RankingIcon />}
            onClick={() => navigate("/rankings")}
          />
        </div>
      </section>

      <section className="my-home-section my-home-overview" aria-labelledby="home-overview-title">
        <div className="section-title my-home-section__heading">
          <div><h2 id="home-overview-title">数据概览</h2><span>此刻的家庭库存</span></div>
        </div>
        <div className="my-home-overview-grid">
          <OverviewMetric label="当前在库" value={activeItems.length} unit="件" />
          <OverviewMetric label="已经归位" value={locatedItems.length} unit="件" />
          <OverviewMetric label="待归位" value={unplacedCount} unit="件" attention={unplacedCount > 0} />
          <OverviewMetric label="全部记录" value={publicItems.length} unit="件" />
          <OverviewMetric label="使用中分类" value={activeCategories.length} unit="个" />
          <OverviewMetric label="存放位置" value={activeLocations.length} unit="个" />
        </div>
      </section>
    </div>
  );
}

function HomeAction({
  title,
  description,
  tone,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  tone: "sage" | "mist" | "tea";
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className={`my-home-action my-home-action--${tone}`} type="button" onClick={onClick}>
      <span aria-hidden="true">{icon}</span>
      <strong>{title}</strong>
      <small>{description}</small>
      <b aria-hidden="true">›</b>
    </button>
  );
}

function OverviewMetric({ label, value, unit, attention = false }: { label: string; value: number; unit: string; attention?: boolean }) {
  return <div className={attention ? "my-home-metric is-attention" : "my-home-metric"}><span>{label}</span><strong>{value}<small>{unit}</small></strong></div>;
}

function HomeIllustration() {
  return (
    <svg className="my-home-illustration" aria-hidden="true" viewBox="0 0 150 126">
      <path className="my-home-illustration__back" d="M17 62 75 16l58 46v51H17Z" />
      <path className="my-home-illustration__roof" d="m9 65 66-53 66 53" />
      <path className="my-home-illustration__door" d="M64 78h24v35H64Z" />
      <path className="my-home-illustration__window" d="M33 69h19v19H33Zm65 0h19v19H98Z" />
      <path className="my-home-illustration__leaf" d="M119 43c-6-14-3-26 9-34 7 14 2 27-9 34Zm-86 5C19 47 10 39 9 26c15-1 25 8 24 22Z" />
    </svg>
  );
}

function LocationIcon() {
  return <svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z" /><path d="M8 5v14M16 5v14M4 11h16" /></svg>;
}

function CategoryIcon() {
  return <svg viewBox="0 0 24 24"><path d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v5H4zM14 15h6v5h-6z" /></svg>;
}

function InsightIcon() {
  return <svg viewBox="0 0 24 24"><path d="M5 19V9m7 10V4m7 15v-7" /><path d="M3 19h18" /></svg>;
}

function RankingIcon() {
  return <svg viewBox="0 0 24 24"><path d="M6 18v-5h4v5m0 0V8h4v10m0 0V4h4v14" /><path d="M4 20h16" /></svg>;
}
