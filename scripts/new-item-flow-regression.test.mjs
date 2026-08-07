import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";

const quickItemForm = await readFile("src/components/QuickItemForm.tsx", "utf8");
const fullItemForm = await readFile("src/components/ItemForm.tsx", "utf8");
const newItemPage = await readFile("src/app/items/new.tsx", "utf8");
const appShell = await readFile("src/App.tsx", "utf8");
const itemCard = await readFile("src/components/ItemCard.tsx", "utf8");
const findPage = await readFile("src/app/index.tsx", "utf8");
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

test("progress steps stack labels and locations scroll as compact capsules", () => {
  assert.match(styles, /\.new-item-progress\s*>\s*button\s*\{[^}]*flex-direction:\s*column/s);
  assert.match(styles, /\.new-item-location-options\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(quickItemForm, /new-item-location-summary/);
});

test("success state is compact and has no repeated-add action", () => {
  assert.match(newItemPage, /quick-create-success__card/);
  assert.doesNotMatch(newItemPage, /继续在这个位置添加|再记一件/);
});

test("full editing prioritizes core fields and folds optional groups", () => {
  assert.match(fullItemForm, /item-edit-form/);
  assert.match(fullItemForm, /item-edit-core/);
  assert.match(fullItemForm, /item-edit-details/);
});

test("primary navigation hides while a text keyboard is active", () => {
  assert.match(appShell, /useSoftKeyboardOpen\(\)/);
  assert.match(appShell, /route\.name !== "search" && !isSoftKeyboardOpen/);
  assert.match(styles, /\.phone-shell--keyboard-open \.app-main\s*\{/);
});

test("inventory cards expose a long-press edit and delete menu", () => {
  assert.match(itemCard, /onLongPress/);
  assert.match(itemCard, /setTimeout\(\(\) => \{/);
  assert.match(findPage, /item-hold-menu__choices/);
  assert.match(findPage, />编辑<\/button>/);
  assert.match(findPage, />删除<\/button>/);
});

test("location step uses two scrolling rows without a secondary selector", () => {
  assert.doesNotMatch(quickItemForm, /new-item-more-location/);
  const locationLayouts = [...styles.matchAll(/\.new-item-location-options\s*\{([^}]*)\}/gs)];
  const activeLocationLayout = locationLayouts.at(-1)?.[1] ?? "";
  assert.match(activeLocationLayout, /display:\s*flex/);
  assert.match(activeLocationLayout, /flex-flow:\s*column wrap/);
  assert.match(activeLocationLayout, /height:\s*94px/);
});

test("completion prioritizes enrichment and opens dedicated search as the secondary action", () => {
  assert.match(newItemPage, />完善资料<\/button>/);
  assert.match(newItemPage, /navigate\("\/search"\)/);
  assert.ok(newItemPage.indexOf("完善资料") < newItemPage.indexOf("去找东西"));
});

test("rich editing removes image URLs and centers purchase details", () => {
  assert.match(fullItemForm, /item-edit-purchase/);
  assert.match(fullItemForm, /item-edit-choice/);
  assert.match(fullItemForm, /item-edit-image-picker/);
  assert.doesNotMatch(fullItemForm, /networkImageUrl|handleAddNetworkImage|通过图片网址添加/);
});

test("location pills cannot collapse to icon-only controls", () => {
  const locationButtonRules = [...styles.matchAll(/\.new-item-location-options button\s*\{([^}]*)\}/gs)];
  const activeLocationButtonRule = locationButtonRules.at(-1)?.[1] ?? "";
  assert.match(activeLocationButtonRule, /flex:\s*0 0 40px/);
  assert.match(activeLocationButtonRule, /min-width:\s*max-content/);

  const locationLabelRules = [...styles.matchAll(/\.new-item-location-options button > strong\s*\{([^}]*)\}/gs)];
  const activeLocationLabelRule = locationLabelRules.at(-1)?.[1] ?? "";
  assert.match(activeLocationLabelRule, /overflow:\s*visible/);
});

test("selecting a location keeps the capsule order stable until the item is saved", () => {
  const locationOptionSetup = quickItemForm.match(/const locationOptions = \[[\s\S]*?\]\.filter/)?.[0] ?? "";
  assert.doesNotMatch(locationOptionSetup, /selectedLocation/);

  const selectLocationBody = quickItemForm.match(/function selectLocation\([^)]*\) \{([\s\S]*?)\n  \}/)?.[1] ?? "";
  assert.doesNotMatch(selectLocationBody, /rememberLocationId/);
  assert.match(quickItemForm, /await onSubmit\(submittedForm\);\s*if \(submittedForm\.locationId\) rememberLocationId\(submittedForm\.locationId\);/);
});

test("single checkbox rows share one lightweight treatment", () => {
  assert.match(quickItemForm, /new-item-basic-consumable single-check-option/);
  assert.ok((fullItemForm.match(/single-check-option/g) ?? []).length >= 3);
  assert.match(styles, /\.single-check-option\s*\{[^}]*background:\s*transparent/s);
});

test("edit disclosures use a downward svg chevron", () => {
  assert.match(fullItemForm, /function DisclosureChevron/);
  assert.match(fullItemForm, /d="m5 7\.5 5 5 5-5"/);
  assert.doesNotMatch(fullItemForm, /aria-hidden="true">›<\/b>/);
});
