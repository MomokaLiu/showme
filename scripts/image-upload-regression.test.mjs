import assert from "node:assert/strict";
import { after, test } from "node:test";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { build } from "esbuild";

const bundledModulePath = join(tmpdir(), `showme-image-upload-${process.pid}.mjs`);

await build({
  entryPoints: ["src/utils/imageUpload.ts"],
  bundle: true,
  format: "esm",
  outfile: bundledModulePath,
  platform: "node",
});

const { getImageValidationError, getScaledImageDimensions } = await import(pathToFileURL(bundledModulePath).href);

after(() => rm(bundledModulePath, { force: true }));

test("image upload accepts image files within the size limit", () => {
  assert.equal(getImageValidationError({ type: "image/png", size: 2 * 1024 * 1024 }), undefined);
  assert.equal(getImageValidationError({ type: "", size: 2 * 1024 * 1024 }), undefined);
});

test("image upload rejects non-images and oversized files", () => {
  assert.equal(getImageValidationError({ type: "text/plain", size: 100 }), "请选择图片文件。");
  assert.equal(
    getImageValidationError({ type: "image/jpeg", size: 15 * 1024 * 1024 + 1 }),
    "图片不能超过 15 MB。",
  );
});

test("large images are scaled proportionally and small images are not enlarged", () => {
  assert.deepEqual(getScaledImageDimensions(4000, 3000, 1280), { width: 1280, height: 960 });
  assert.deepEqual(getScaledImageDimensions(640, 480, 1280), { width: 640, height: 480 });
});
