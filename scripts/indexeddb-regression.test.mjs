import assert from "node:assert/strict";
import test from "node:test";
import { indexedDB } from "fake-indexeddb";

const legacyItems = [
  { id: "legacy-1", name: "旧物品" },
  { id: "legacy-2", name: "旧物品 2" },
];
const values = new Map([["buwangwu.items", JSON.stringify(legacyItems)]]);

globalThis.indexedDB = indexedDB;
globalThis.window = {
  localStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  },
};

const { IndexedDbRepository } = await import("../src/repositories/indexedDbRepository.ts");

test("IndexedDB repository migrates legacy localStorage without deleting the rollback copy", async () => {
  const repository = new IndexedDbRepository("items");
  assert.deepEqual(await repository.getAll(), legacyItems);
  await repository.replaceAll([{ id: "new-1", name: "新物品" }]);
  assert.deepEqual(await repository.getAll(), [{ id: "new-1", name: "新物品" }]);
  assert.equal(values.get("buwangwu.items"), JSON.stringify(legacyItems));
});
