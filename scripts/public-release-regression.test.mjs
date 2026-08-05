import assert from "node:assert/strict";
import { after, test } from "node:test";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { build } from "esbuild";

const outputs = [];

async function loadModule(entry, name) {
  const outfile = join(tmpdir(), `showme-public-${name}-${process.pid}.mjs`);
  outputs.push(outfile);
  await build({ entryPoints: [entry], bundle: true, format: "esm", outfile, platform: "node" });
  return import(pathToFileURL(outfile).href);
}

const locationUtils = await loadModule("src/utils/locations.ts", "locations");
const itemMode = await loadModule("src/utils/itemMode.ts", "item-mode");
const metrics = await loadModule("src/services/localProductMetrics.ts", "local-metrics");

after(() => Promise.all(outputs.map((path) => rm(path, { force: true }))));

test("two-level locations normalize legacy data and produce a complete path", () => {
  const normalized = locationUtils.normalizeLocations([
    { id: "room", name: "卧室" },
    { id: "drawer", name: "衣柜第二层", parentId: "room" },
    { id: "broken", name: "旧位置", parentId: "missing" },
  ]);

  assert.equal(normalized[0].kind, "area");
  assert.equal(normalized[1].kind, "container");
  assert.equal(normalized[2].parentId, undefined);
  assert.equal(locationUtils.getLocationPath(normalized, "drawer"), "卧室 › 衣柜第二层");
  assert.deepEqual(locationUtils.getLocationDescendantIds(normalized, "room"), ["room", "drawer"]);
});

test("legacy items become consumables only when lifecycle evidence exists", () => {
  assert.equal(itemMode.inferItemMode({ id: "cable", name: "充电线" }), "regular");
  assert.equal(itemMode.inferItemMode({ id: "milk", name: "牛奶", expireDate: "2026-08-10" }), "consumable");
  assert.equal(
    itemMode.inferItemMode(
      { id: "soap", name: "洗手液" },
      [{ id: "log", itemId: "soap", actionType: "consume", createdAt: "2026-08-05T00:00:00.000Z" }],
    ),
    "consumable",
  );
});

test("local product metrics store counts without any content fields", () => {
  const values = new Map();
  const storage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
  };
  metrics.recordLocalProductEvent("item_found", storage);
  metrics.recordLocalProductEvent("item_found", storage);
  const result = metrics.loadLocalProductMetrics(storage);
  assert.equal(result.item_found, 2);
  assert.deepEqual(Object.keys(result).sort(), ["item_found", "lastUpdatedAt"]);
});
