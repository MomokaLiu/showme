import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

const listeners = new Map();
const self = {
  location: { origin: "http://127.0.0.1:4173" },
  clients: { claim() {} },
  skipWaiting() {},
  addEventListener(type, listener) {
    listeners.set(type, listener);
  },
};

const source = await readFile("public/sw.js", "utf8");
vm.runInNewContext(source, {
  self,
  URL,
  caches: {
    open() {
      throw new Error("cache access is not expected in this test");
    },
    keys() {
      return Promise.resolve([]);
    },
    match() {
      throw new Error("cache access is not expected in this test");
    },
  },
  fetch() {
    throw new Error("the service worker must leave WebDAV requests to the browser");
  },
  Response,
});

test("the service worker never intercepts or caches WebDAV proxy requests", () => {
  let intercepted = false;
  listeners.get("fetch")({
    request: {
      method: "GET",
      mode: "cors",
      url: "http://127.0.0.1:4173/__webdav/jianguoyun/dav/buwangwu-data.json",
    },
    respondWith() {
      intercepted = true;
    },
  });

  assert.equal(intercepted, false);
});
