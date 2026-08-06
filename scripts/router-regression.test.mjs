import assert from "node:assert/strict";
import test from "node:test";

import { parseRoute } from "../src/app/router.ts";

test("the add route opens the new item page instead of treating new as an item id", () => {
  assert.deepEqual(parseRoute("/items/new"), {
    name: "new",
    title: "添加物品",
  });
});

test("item edit and detail routes keep their dynamic ids", () => {
  assert.deepEqual(parseRoute("/items/edit/item-123"), {
    name: "edit",
    title: "编辑物品",
    id: "item-123",
  });
  assert.deepEqual(parseRoute("/items/item-123"), {
    name: "item",
    title: "物品详情",
    id: "item-123",
  });
});

test("all static routes resolve to their dedicated pages", () => {
  const expectedRoutes = new Map([
    ["/", "find"],
    ["/items", "find"],
    ["/items/new", "new"],
    ["/items/private", "private-items"],
    ["/search", "search"],
    ["/rankings", "rankings"],
    ["/locations", "locations"],
    ["/tasks", "tasks"],
    ["/expiring", "tasks"],
    ["/shopping", "tasks"],
    ["/stats", "stats"],
    ["/insights", "stats"],
    ["/settings", "settings"],
  ]);

  for (const [path, expectedName] of expectedRoutes) {
    assert.equal(parseRoute(path).name, expectedName, `${path} resolved to the wrong page`);
  }
});

test("inventory search and location routes preserve their parameters", () => {
  assert.deepEqual(parseRoute("/items?q=AirPods&location=bedroom"), {
    name: "find",
    title: "勿忘我",
    query: "AirPods",
    locationId: "bedroom",
  });
  assert.deepEqual(parseRoute("/search?q=咖啡"), {
    name: "search",
    title: "搜索",
    query: "咖啡",
  });
  assert.deepEqual(parseRoute("/locations/storage_box"), {
    name: "location",
    title: "位置详情",
    id: "storage_box",
  });
});
