import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";

const quickItemForm = await readFile("src/components/QuickItemForm.tsx", "utf8");
const styles = await readFile("src/styles.css", "utf8");

test("new item uses a compact two-stage name and location flow", () => {
  assert.match(quickItemForm, /new-item-progress/);
  assert.match(quickItemForm, /new-item-location-options/);
  assert.match(quickItemForm, /new-item-basic-consumable/);
});

test("image selection and AI recognition are separate explicit actions", () => {
  assert.match(quickItemForm, /onChange=\{handleImageSelection\}/);
  assert.match(quickItemForm, /onClick=\{handleAiRecognition\}/);
  assert.match(quickItemForm, /multiple/);
  assert.match(quickItemForm, /ai-recognition-trigger/);
  assert.match(quickItemForm, /ai-recognition-loading/);
});

test("camera, album and AI controls have dedicated visual icons", () => {
  assert.match(quickItemForm, /new-item-source-icon/);
  assert.match(quickItemForm, /new-item-ai-icon/);
});

test("primary bottom navigation is a narrower floating dock", () => {
  assert.match(styles, /\.tab-bar--primary\s*\{[^}]*width:\s*calc\(100% - 32px\)[^}]*max-width:\s*448px[^}]*border-radius:/s);
});
