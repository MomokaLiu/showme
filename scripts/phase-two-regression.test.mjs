import assert from "node:assert/strict";
import { after, test } from "node:test";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { build } from "esbuild";

const outputs = [];

async function loadModule(entry, name) {
  const outfile = join(tmpdir(), `showme-${name}-${process.pid}.mjs`);
  outputs.push(outfile);
  await build({ entryPoints: [entry], bundle: true, format: "esm", outfile, platform: "node" });
  return import(pathToFileURL(outfile).href);
}

const rankings = await loadModule("src/services/inventoryRankings.ts", "rankings");
const viewStorage = await loadModule("src/services/inventoryViewStorage.ts", "view-storage");
const imageRecognition = await loadModule("src/services/imageRecognitionService.ts", "image-recognition");
const privacy = await loadModule("src/services/privacyService.ts", "privacy");
const inventorySearch = await loadModule("src/services/inventorySearch.ts", "inventory-search");
const reminder = await loadModule("src/services/reminderService.ts", "reminder-service");
const searchHistory = await loadModule("src/services/searchHistoryStorage.ts", "search-history");

after(() => Promise.all(outputs.map((path) => rm(path, { force: true }))));

function createItem(id, overrides = {}) {
  return {
    id,
    name: `物品 ${id}`,
    categoryId: "other",
    quantity: 1,
    initialQuantity: 1,
    unit: "件",
    status: "normal",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("inventory view mode is remembered and unknown values fall back to list", () => {
  const values = new Map();
  const storage = {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };

  assert.equal(viewStorage.loadInventoryViewMode(storage), "list");
  viewStorage.saveInventoryViewMode("grid", storage);
  assert.equal(viewStorage.loadInventoryViewMode(storage), "grid");
  values.set("buwangwu.inventoryViewMode", "unexpected");
  assert.equal(viewStorage.loadInventoryViewMode(storage), "list");
});

test("search history keeps recent unique terms and can be cleared", () => {
  const values = new Map();
  const storage = {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };

  searchHistory.rememberSearch("  咖啡  ", storage);
  searchHistory.rememberSearch("收纳箱", storage);
  searchHistory.rememberSearch("咖啡", storage);
  assert.deepEqual(searchHistory.loadSearchHistory(storage), ["咖啡", "收纳箱"]);

  searchHistory.clearSearchHistory(storage);
  assert.deepEqual(searchHistory.loadSearchHistory(storage), []);
});

test("daily-cost ranking ignores empty costs and sorts descending", () => {
  const result = rankings.getHighestDailyCostRanking([
    createItem("empty", { actualDailyCost: null }),
    createItem("low", { actualDailyCost: 2.5 }),
    createItem("high", { actualDailyCost: 8 }),
  ]);

  assert.deepEqual(result.map((entry) => entry.item.id), ["high", "low"]);
});

test("idle ranking uses the most recent real use and requires 30 idle days", () => {
  const items = [
    createItem("idle", { purchaseDate: "2025-01-01" }),
    createItem("recent", { purchaseDate: "2025-01-01" }),
    createItem("new", { purchaseDate: "2026-07-10" }),
  ];
  const logs = [
    { id: "1", itemId: "idle", actionType: "consume", createdAt: "2026-05-01T08:00:00.000Z" },
    { id: "2", itemId: "recent", actionType: "consume", createdAt: "2026-07-20T08:00:00.000Z" },
  ];

  const result = rankings.getIdleRanking(items, logs, "2026-07-28");
  assert.deepEqual(result.map((entry) => entry.item.id), ["idle"]);
  assert.equal(result[0].value, 88);
});

test("AI JSON parser accepts fenced JSON but never saves anything", () => {
  const result = imageRecognition.parseJsonContent('```json\n{"name":"AirPods Pro","brand":"Apple"}\n```');
  assert.deepEqual(result, { name: "AirPods Pro", brand: "Apple" });
});

test("gesture patterns are hashed and verified without storing the original sequence", async () => {
  const values = new Map();
  const storage = {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };

  await privacy.configurePrivacyPattern("1236", storage);
  const stored = values.get("buwangwu.privacyPattern");
  assert.equal(stored.includes("1236"), false);
  assert.equal(await privacy.verifyPrivacyPattern("1236", storage), true);
  assert.equal(await privacy.verifyPrivacyPattern("1258", storage), false);
});

test("inventory search prioritizes exact names and filters missing locations", () => {
  const names = {
    getCategoryName: () => "数码产品",
    getLocationName: (id) => id === "desk" ? "书桌抽屉" : "未设置",
  };
  const items = [
    createItem("brand", { name: "耳机", brand: "AirPods", locationId: "desk" }),
    createItem("exact", { name: "AirPods", locationId: "desk" }),
    createItem("missing", { name: "AirPods 收纳盒" }),
  ];
  const result = inventorySearch.searchInventory(items, { text: "airpods" }, names);
  assert.deepEqual(result.map((item) => item.id), ["exact", "missing", "brand"]);
  assert.deepEqual(
    inventorySearch.searchInventory(items, { missingLocation: true }, names).map((item) => item.id),
    ["missing"],
  );
});

test("expiry reminder uses a snooze date before the normal lead time", () => {
  const item = createItem("reminder", {
    finalExpireDate: "2030-01-10",
    expiryReminderDays: 3,
  });
  assert.equal(reminder.getReminderDate(item).getHours(), 9);
  assert.equal(reminder.getReminderDate(item).getDate(), 7);

  const snoozed = "2030-01-09T09:00:00.000Z";
  const originalNow = Date.now;
  Date.now = () => new Date("2029-12-01T00:00:00.000Z").getTime();
  try {
    assert.equal(reminder.getReminderDate({ ...item, expiryReminderSnoozedUntil: snoozed }).toISOString(), snoozed);
  } finally {
    Date.now = originalNow;
  }
});
