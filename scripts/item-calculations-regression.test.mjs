import assert from "node:assert/strict";
import { after, test } from "node:test";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { build } from "esbuild";

const bundledModulePath = join(tmpdir(), `showme-daily-cost-calculator-${process.pid}.mjs`);

await build({
  entryPoints: ["src/services/dailyCostCalculator.ts"],
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

test("a 1000 yuan item used for 365 days costs 2.74 yuan per day", () => {
  const item = createItem({ purchaseDate: "2025-01-01", totalPrice: 1000 });

  assert.equal(Number(calculateActualDailyCost(item, "2026-01-01").toFixed(2)), 2.74);
});

test("items without a purchase price have no actual daily cost", () => {
  assert.equal(calculateActualDailyCost(createItem({ totalPrice: undefined }), "2026-07-22"), null);
});

test("items purchased today have no actual daily cost", () => {
  const item = createItem({ purchaseDate: "2026-07-22" });

  assert.equal(calculateActualDailyCost(item, "2026-07-22"), null);
});

test("future or missing purchase dates have no actual daily cost", () => {
  assert.equal(calculateActualDailyCost(createItem({ purchaseDate: "2026-07-23" }), "2026-07-22"), null);
  assert.equal(calculateActualDailyCost(createItem({ purchaseDate: undefined }), "2026-07-22"), null);
});
