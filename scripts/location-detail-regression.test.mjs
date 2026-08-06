import assert from "node:assert/strict";
import { after, test } from "node:test";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { build } from "esbuild";

const outfile = join(tmpdir(), `showme-location-router-${process.pid}.mjs`);
await build({
  entryPoints: ["src/app/router.ts"],
  bundle: true,
  format: "esm",
  outfile,
  platform: "node",
});
const router = await import(pathToFileURL(outfile).href);
const locationPage = await readFile("src/app/locations/[id].tsx", "utf8");
const styles = await readFile("src/styles.css", "utf8");

after(() => rm(outfile, { force: true }));

test("location detail returns directly to the find-home page", () => {
  assert.equal(
    router.getBackPath({ name: "location", id: "kitchen" }),
    "/",
  );
});

test("touch controls suppress the browser tap highlight", () => {
  assert.match(styles, /-webkit-tap-highlight-color:\s*transparent/);
});

test("location detail exposes child locations and uses the shared item grid", () => {
  assert.match(locationPage, /location-child-navigation/);
  assert.match(locationPage, /inventory-grid/);
  assert.match(locationPage, /location-hero-icon/);
  assert.doesNotMatch(locationPage, /className="list-stack"/);
});
