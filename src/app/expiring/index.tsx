import { useEffect, useState } from "react";
import { EmptyState } from "../../components/EmptyState";
import { ItemCard } from "../../components/ItemCard";
import { useInventoryStore } from "../../store/itemStore";
import type { Item } from "../../types/item";
import { getRemainingDays } from "../../utils/itemCalculations";
import { navigate } from "../router";
import { reminderService } from "../../services/reminderService";

export default function ExpiringPage({ embedded = false }: { embedded?: boolean }) {
  const { items, getCategoryName, getLocationName, finishItem, discardItem, snoozeExpiryReminder } = useInventoryStore();
  const [permission, setPermission] = useState<"granted" | "denied" | "prompt" | "prompt-with-rationale" | "unsupported">("unsupported");
  const [permissionMessage, setPermissionMessage] = useState("");
  const activeItems = items.filter(
    (item) => !item.isPrivate && item.status !== "finished" && item.status !== "discarded",
  );
  const groups = [
    { title: "已过期", items: byDays(activeItems, undefined, -1) },
    { title: "今天到期", items: byDays(activeItems, 0, 0) },
    { title: "3 天内到期", items: byDays(activeItems, 1, 3) },
    { title: "7 天内到期", items: byDays(activeItems, 4, 7) },
    { title: "30 天内到期", items: byDays(activeItems, 8, 30) },
  ];
  const hasItems = groups.some((group) => group.items.length > 0);
  const hasReminderCandidates = activeItems.some((item) => Boolean(item.finalExpireDate));

  useEffect(() => {
    void reminderService.getPermissionStatus().then(setPermission).catch(() => setPermission("unsupported"));
  }, []);

  async function enableNotifications() {
    const nextPermission = await reminderService.requestPermission();
    setPermission(nextPermission);
    if (nextPermission === "granted") {
      await reminderService.reconcile(items);
      setPermissionMessage("系统通知已开启。");
    } else {
      setPermissionMessage("未获得通知权限；待办仍会保留在应用内。");
    }
  }

  return (
    <div className={embedded ? "embedded-page-stack" : "page-stack"}>
      {hasReminderCandidates && permission !== "granted" && permission !== "unsupported" ? (
        <section className="notification-permission-card">
          <div><strong>在手机系统中收到提醒</strong><span>仅在你确认后申请通知权限。</span></div>
          <button type="button" onClick={enableNotifications}>开启通知</button>
        </section>
      ) : null}
      {permissionMessage ? <p className="form-message" role="status">{permissionMessage}</p> : null}
      {hasItems ? (
        groups.map((group) =>
          group.items.length ? (
            <section className="section-block" key={group.title}>
              <div className="section-title">
                <h2>{group.title}</h2>
                <span>{group.items.length}</span>
              </div>
              <div className="list-stack">
                {group.items.map((item) => (
                  <div className="expiring-card" key={item.id}>
                    <ItemCard
                      item={item}
                      categoryName={getCategoryName(item.categoryId)}
                      locationName={getLocationName(item.locationId)}
                      compact
                      onClick={() => navigate(`/items/${item.id}`)}
                    />
                    <div className="inline-actions">
                      <button type="button" onClick={() => finishItem(item.id)}>
                        用完
                      </button>
                      <button type="button" onClick={() => discardItem(item.id, "临期处理")}>
                        丢弃
                      </button>
                      <details className="snooze-menu">
                        <summary>延后</summary>
                        <div>
                          {[1, 3, 7].map((days) => (
                            <button key={days} type="button" onClick={() => snoozeExpiryReminder(item.id, days)}>{days} 天</button>
                          ))}
                        </div>
                      </details>
                      <button type="button" onClick={() => navigate(`/items/${item.id}`)}>
                        详情
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null,
        )
      ) : (
        <EmptyState title="没有临期物品" description="库存到达提醒窗口后会显示在这里。" />
      )}
    </div>
  );
}

function byDays(items: Item[], min: number | undefined, max: number): Item[] {
  return items
    .filter((item) => {
      const remainingDays = getRemainingDays(item.finalExpireDate);
      if (remainingDays === undefined) return false;
      if (min === undefined) return remainingDays <= max;
      return remainingDays >= min && remainingDays <= max;
    })
    .sort((a, b) => (a.finalExpireDate ?? "").localeCompare(b.finalExpireDate ?? ""));
}
