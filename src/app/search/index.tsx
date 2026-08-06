import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { clearSearchHistory, loadSearchHistory, rememberSearch } from "../../services/searchHistoryStorage";
import { useInventoryStore } from "../../store/itemStore";
import { navigate } from "../router";

export default function SearchPage({ initialQuery = "" }: { initialQuery?: string }) {
  const { items, logs, getLocationPath } = useInventoryStore();
  const [query, setQuery] = useState(initialQuery);
  const [history, setHistory] = useState(() => loadSearchHistory());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const rankedItems = useMemo(() => {
    const useCountByItem = new Map<string, number>();
    for (const log of logs) {
      if (log.actionType !== "consume" && log.actionType !== "open") continue;
      useCountByItem.set(log.itemId, (useCountByItem.get(log.itemId) ?? 0) + 1);
    }

    return items
      .filter((item) => !item.isPrivate && item.status !== "finished" && item.status !== "discarded")
      .sort((left, right) => {
        const countDifference = (useCountByItem.get(right.id) ?? 0) - (useCountByItem.get(left.id) ?? 0);
        return countDifference || right.updatedAt.localeCompare(left.updatedAt);
      })
      .slice(0, 6);
  }, [items, logs]);

  function search(value: string) {
    const normalizedQuery = value.trim().replace(/\s+/g, " ");
    if (!normalizedQuery) return;
    setHistory(rememberSearch(normalizedQuery));
    navigate(`/?q=${encodeURIComponent(normalizedQuery)}`);
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    search(query);
  }

  function clearHistory() {
    clearSearchHistory();
    setHistory([]);
  }

  return (
    <div className="page-stack search-page">
      <form className="search-page__form" onSubmit={submitSearch} role="search">
        <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索物品、品牌或位置"
          aria-label="搜索物品、品牌或位置"
        />
        {query ? <button className="search-page__clear" type="button" onClick={() => setQuery("")} aria-label="清除输入">×</button> : null}
        <button className="search-page__submit" type="submit" disabled={!query.trim()}>搜索</button>
      </form>

      <p className="search-page__hint">输入名称、品牌、标签或存放位置</p>

      <section className="search-suggestions" aria-labelledby="search-history-title">
        <div className="search-suggestions__heading">
          <h2 id="search-history-title">历史搜索</h2>
          {history.length ? <button type="button" onClick={clearHistory} aria-label="清空历史搜索">清空</button> : null}
        </div>
        {history.length ? (
          <div className="search-history-list">
            {history.map((entry) => <button type="button" key={entry} onClick={() => search(entry)}>{entry}</button>)}
          </div>
        ) : <p className="search-suggestions__empty">搜索过的内容会保存在这里</p>}
      </section>

      <section className="search-suggestions" aria-labelledby="search-ranking-title">
        <div className="search-suggestions__heading">
          <div>
            <h2 id="search-ranking-title">常找榜单</h2>
            <span>根据使用记录和最近更新生成</span>
          </div>
        </div>
        {rankedItems.length ? (
          <div className="search-ranking-list">
            {rankedItems.map((item, index) => (
              <button type="button" key={item.id} onClick={() => search(item.name)}>
                <b className={index < 3 ? "is-top" : ""}>{index + 1}</b>
                <span><strong>{item.name}</strong><small>{getLocationPath(item.locationId)}</small></span>
                <i aria-hidden="true">›</i>
              </button>
            ))}
          </div>
        ) : <p className="search-suggestions__empty">添加物品后，这里会自动生成榜单</p>}
      </section>
    </div>
  );
}
