import assert from "node:assert/strict";
import { after, test } from "node:test";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { build } from "esbuild";

const bundledModulePath = join(tmpdir(), `showme-item-calculations-${process.pid}.mjs`);

await build({
  entryPoints: ["src/utils/itemCalculations.ts"],
  bundle: true,
  format: "esm",
  outfile: bundledModulePath,
  platform: "node",
});

const { calculateActualDailyCost } = await import(pathToFileURL(bundledModulePath).href);

after(() => rm(bundledModulePath, { force: true }));

function createItem(overrides = {}) {
  return {
    id: "item-1",
    name: "长期用品",
    categoryId: "other",
    quantity: 1,
    initialQuantity: 1,
    unit: "件",
    purchaseDate: "2026-07-12",
    totalPrice: 100,
    status: "normal",
    createdAt: "2026-07-12T00:00:00.000Z",
    updatedAt: "2026-07-12T00:00:00.000Z",
    ...overrides,
  };
}

test("an active item with unlimited shelf life uses the current date for its actual daily cost", () => {
  const item = createItem();

  assert.equal(calculateActualDailyCost(item, "2026-07-22"), 10);
});

test("an active item with a finite shelf life does not show actual daily cost before it is finished", () => {
  const item = createItem({ shelfLifeDays: 30 });

  assert.equal(calculateActualDailyCost(item, "2026-07-22"), undefined);
});

test("an unlimited item purchased today counts as one day", () => {
  const item = createItem({ purchaseDate: "2026-07-22" });

  assert.equal(calculateActualDailyCost(item, "2026-07-22"), 100);
});

test("a finished item still uses its finish date", () => {
  const item = createItem({ status: "finished", finishDate: "2026-07-17" });

  assert.equal(calculateActualDailyCost(item, "2026-07-22"), 20);
});

test("items without a positive total price have no actual daily cost", () => {
  assert.equal(calculateActualDailyCost(createItem({ totalPrice: undefined }), "2026-07-22"), undefined);
  assert.equal(calculateActualDailyCost(createItem({ totalPrice: 0 }), "2026-07-22"), undefined);
});

test("discarded unlimited items do not keep accumulating cost after disposal", () => {
  const item = createItem({ status: "discarded", discardDate: "2026-07-17" });

  assert.equal(calculateActualDailyCost(item, "2026-07-22"), undefined);
});
