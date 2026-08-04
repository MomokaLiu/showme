import assert from "node:assert/strict";
import { after, test } from "node:test";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { build } from "esbuild";

const bundledModulePath = join(tmpdir(), `showme-daily-cost-refresh-${process.pid}.mjs`);

await build({
  entryPoints: ["src/services/dailyCostRefresh.ts"],
  bundle: true,
  format: "esm",
  outfile: bundledModulePath,
  platform: "node",
});

const { DAILY_COST_REFRESH_INTERVAL_MS, refreshDailyCostsIfNeeded } =
  await import(pathToFileURL(bundledModulePath).href);

after(() => rm(bundledModulePath, { force: true }));

function createItem(overrides = {}) {
  return {
    id: "item-1",
    name: "测试物品",
    categoryId: "other",
    quantity: 1,
    initialQuantity: 1,
    unit: "件",
    purchaseDate: "2025-01-01",
    totalPrice: 365,
    status: "normal",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createHarness(lastRefreshTime) {
  const writes = [];
  let savedRefreshTime = lastRefreshTime;
  return {
    writes,
    repository: {
      async replaceAll(items) {
        writes.push(items);
      },
    },
    storage: {
      getLastRefreshTime() {
        return savedRefreshTime;
      },
      setLastRefreshTime(value) {
        savedRefreshTime = value;
      },
    },
    getSavedRefreshTime() {
      return savedRefreshTime;
    },
  };
}

test("entering the app batch-updates actual daily costs and the refresh timestamp", async () => {
  const now = new Date(2026, 0, 1, 12);
  const harness = createHarness(undefined);

  const result = await refreshDailyCostsIfNeeded({
    items: [createItem()],
    repository: harness.repository,
    storage: harness.storage,
    now,
  });

  assert.equal(result.refreshed, true);
  assert.equal(result.items[0].actualDailyCost, 1);
  assert.equal(harness.writes.length, 1);
  assert.deepEqual(harness.writes[0], result.items);
  assert.equal(harness.getSavedRefreshTime(), now.toISOString());
});

test("invalid legacy items are batch-migrated with a null actual daily cost", async () => {
  const harness = createHarness(undefined);

  const result = await refreshDailyCostsIfNeeded({
    items: [createItem({ totalPrice: undefined })],
    repository: harness.repository,
    storage: harness.storage,
    now: new Date(2026, 0, 1, 12),
  });

  assert.equal(result.items[0].actualDailyCost, null);
  assert.equal(harness.writes.length, 1);
});

test("re-entering within 24 hours does not write inventory again", async () => {
  const lastRefresh = new Date(2026, 0, 1, 12);
  const now = new Date(lastRefresh.getTime() + DAILY_COST_REFRESH_INTERVAL_MS - 1);
  const harness = createHarness(lastRefresh.toISOString());
  const items = [createItem({ actualDailyCost: 1 })];

  const result = await refreshDailyCostsIfNeeded({
    items,
    repository: harness.repository,
    storage: harness.storage,
    now,
  });

  assert.equal(result.refreshed, false);
  assert.equal(result.items, items);
  assert.equal(harness.writes.length, 0);
  assert.equal(harness.getSavedRefreshTime(), lastRefresh.toISOString());
});

test("the next entry at the 24-hour boundary refreshes again", async () => {
  const lastRefresh = new Date(2026, 0, 1, 12);
  const harness = createHarness(lastRefresh.toISOString());

  const result = await refreshDailyCostsIfNeeded({
    items: [createItem()],
    repository: harness.repository,
    storage: harness.storage,
    now: new Date(lastRefresh.getTime() + DAILY_COST_REFRESH_INTERVAL_MS),
  });

  assert.equal(result.refreshed, true);
  assert.equal(harness.writes.length, 1);
});
