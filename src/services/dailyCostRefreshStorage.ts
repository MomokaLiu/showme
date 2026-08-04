const LAST_COST_REFRESH_TIME_KEY = "buwangwu.lastCostRefreshTime";

export type DailyCostRefreshStorage = {
  getLastRefreshTime: () => string | undefined;
  setLastRefreshTime: (value: string) => void;
};

export const dailyCostRefreshStorage: DailyCostRefreshStorage = {
  getLastRefreshTime() {
    if (typeof window === "undefined") return undefined;
    return window.localStorage.getItem(LAST_COST_REFRESH_TIME_KEY) ?? undefined;
  },
  setLastRefreshTime(value) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LAST_COST_REFRESH_TIME_KEY, value);
  },
};
