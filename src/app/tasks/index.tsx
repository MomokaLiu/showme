import { useEffect, useState } from "react";
import ExpiringPage from "../expiring";
import ShoppingPage from "../shopping";
import type { TaskSection } from "../router";

export default function TasksPage({ initialSection }: { initialSection: TaskSection }) {
  const [section, setSection] = useState<TaskSection>(initialSection);

  useEffect(() => setSection(initialSection), [initialSection]);

  return (
    <div className="page-stack tasks-page">
      <div className="segmented-control tasks-tabs" role="tablist" aria-label="待办类型">
        <button
          type="button"
          role="tab"
          aria-selected={section === "reminders"}
          className={section === "reminders" ? "is-active" : ""}
          onClick={() => setSection("reminders")}
        >
          物品提醒
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={section === "shopping"}
          className={section === "shopping" ? "is-active" : ""}
          onClick={() => setSection("shopping")}
        >
          购物清单
        </button>
      </div>
      {section === "reminders" ? <ExpiringPage embedded /> : <ShoppingPage embedded />}
    </div>
  );
}
