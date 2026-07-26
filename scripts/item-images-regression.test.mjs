import assert from "node:assert/strict";
import { after, test } from "node:test";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { build } from "esbuild";

const bundledModulePath = join(tmpdir(), `showme-item-images-${process.pid}.mjs`);

await build({
  entryPoints: ["src/utils/itemImages.ts"],
  bundle: true,
  format: "esm",
  outfile: bundledModulePath,
  platform: "node",
});

const { getItemImageUrls, MAX_ITEM_IMAGES, normalizeItemImageUrls, normalizeItemImages } =
  await import(pathToFileURL(bundledModulePath).href);

after(() => rm(bundledModulePath, { force: true }));

test("legacy single-image items remain visible after the multi-image upgrade", () => {
  assert.deepEqual(getItemImageUrls({ imageUrl: " legacy.jpg " }), ["legacy.jpg"]);
});

test("new image arrays take precedence and are capped at five images", () => {
  const imageUrls = Array.from({ length: MAX_ITEM_IMAGES + 2 }, (_, index) => `image-${index + 1}.jpg`);
  assert.deepEqual(normalizeItemImageUrls(imageUrls), imageUrls.slice(0, MAX_ITEM_IMAGES));
  assert.deepEqual(getItemImageUrls({ imageUrl: "legacy.jpg", imageUrls: [] }), []);
});

test("normalizing an item migrates the legacy field without losing its image", () => {
  assert.deepEqual(normalizeItemImages({ id: "item-1", imageUrl: "legacy.jpg" }), {
    id: "item-1",
    imageUrl: undefined,
    imageUrls: ["legacy.jpg"],
  });
});
