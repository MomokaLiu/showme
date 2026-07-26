import assert from "node:assert/strict";
import { after, test } from "node:test";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { build } from "esbuild";

const bundledModulePath = join(tmpdir(), `showme-webdav-sync-${process.pid}.mjs`);
const bundledTransportModulePath = join(tmpdir(), `showme-webdav-transport-${process.pid}.mjs`);

await build({
  entryPoints: ["src/services/webDavSync.ts"],
  bundle: true,
  format: "esm",
  outfile: bundledModulePath,
  platform: "node",
});

await build({
  entryPoints: ["src/services/capacitorWebDavTransport.ts"],
  bundle: true,
  format: "esm",
  outfile: bundledTransportModulePath,
  platform: "node",
});

const { createWebDavSync, getWebDavErrorDetails, resolveWebDavDataUrl } = await import(
  pathToFileURL(bundledModulePath).href
);
const { resolveWebDavRequestUrl } = await import(pathToFileURL(bundledTransportModulePath).href);

after(() =>
  Promise.all([
    rm(bundledModulePath, { force: true }),
    rm(bundledTransportModulePath, { force: true }),
  ]),
);

const config = {
  url: "https://dav.example.com/backups/",
  username: "alice",
  password: "secret",
};

const emptyData = {
  items: [],
  logs: [],
  categories: [],
  locations: [],
  shoppingItems: [],
};

function createTransport(responder) {
  const requests = [];
  return {
    requests,
    transport: {
      async request(request) {
        requests.push(request);
        return responder(request, requests);
      },
    },
  };
}

test("a WebDAV directory resolves to the app data file while an explicit JSON URL is preserved", () => {
  assert.equal(
    resolveWebDavDataUrl("https://dav.example.com/backups/"),
    "https://dav.example.com/backups/buwangwu-data.json",
  );
  assert.equal(
    resolveWebDavDataUrl("https://dav.example.com/backups/custom.json"),
    "https://dav.example.com/backups/custom.json",
  );
  assert.throws(() => resolveWebDavDataUrl("http://dav.example.com/backups/"), /请使用 https/);
});

test("the Jianguoyun root URL uses the existing remember sync directory", () => {
  assert.equal(
    resolveWebDavDataUrl("https://dav.jianguoyun.com/dav/"),
    "https://dav.jianguoyun.com/dav/remember/buwangwu-data.json",
  );
  assert.equal(
    resolveWebDavDataUrl("https://dav.jianguoyun.com/dav/remember/"),
    "https://dav.jianguoyun.com/dav/remember/buwangwu-data.json",
  );
});

test("connection testing probes the actual data file with an Android-compatible GET request", async () => {
  const fake = createTransport(() => ({ status: 404, data: "" }));
  const sync = createWebDavSync(config, fake.transport);

  await sync.testConnection();

  assert.equal(fake.requests.length, 1);
  assert.equal(fake.requests[0].method, "GET");
  assert.equal(fake.requests[0].url, "https://dav.example.com/backups/buwangwu-data.json");
  assert.match(fake.requests[0].headers.Authorization, /^Basic /);
});

test("browser requests to Jianguoyun use the same-origin WebDAV proxy", () => {
  assert.equal(
    resolveWebDavRequestUrl(
      "https://dav.jianguoyun.com/dav/buwangwu-data.json",
      false,
      "http://127.0.0.1:5173",
    ),
    "http://127.0.0.1:5173/__webdav/jianguoyun/dav/buwangwu-data.json",
  );
});

test("native Android requests continue connecting to Jianguoyun directly", () => {
  assert.equal(
    resolveWebDavRequestUrl(
      "https://dav.jianguoyun.com/dav/buwangwu-data.json",
      true,
      "http://localhost",
    ),
    "https://dav.jianguoyun.com/dav/buwangwu-data.json",
  );
});

test("the browser proxy supports the private LAN address used by phone testing", () => {
  assert.equal(
    resolveWebDavRequestUrl(
      "https://dav.jianguoyun.com/dav/remember/buwangwu-data.json",
      false,
      "http://192.168.199.155:5173",
    ),
    "http://192.168.199.155:5173/__webdav/jianguoyun/dav/remember/buwangwu-data.json",
  );
});

test("the browser proxy still refuses to send WebDAV credentials over public HTTP", () => {
  assert.throws(
    () =>
      resolveWebDavRequestUrl(
        "https://dav.jianguoyun.com/dav/buwangwu-data.json",
        false,
        "http://public.example.com",
      ),
    /不安全的公网 HTTP/,
  );
});

test("network failures keep a useful reason for the settings page", async () => {
  const fake = createTransport(() => {
    throw new TypeError("Failed to fetch");
  });
  const sync = createWebDavSync(config, fake.transport);

  await assert.rejects(
    () =>
      sync.synchronize({
        data: emptyData,
        localUpdatedAt: "2026-07-24T10:00:00.000Z",
      }),
    /原因：浏览器未能完成请求.*跨域/,
  );
});

test("authentication failures expose a reason and a recovery suggestion", async () => {
  const fake = createTransport(() => ({ status: 401, data: "" }));
  const sync = createWebDavSync(config, fake.transport);

  let capturedError;
  try {
    await sync.testConnection();
  } catch (error) {
    capturedError = error;
  }

  const details = getWebDavErrorDetails(capturedError);
  assert.equal(details.summary, "WebDAV 认证失败。");
  assert.match(details.reason, /HTTP 401/);
  assert.match(details.suggestion, /应用专用密码/);
});

test("Jianguoyun authentication failures require the account email and third-party app password", async () => {
  const fake = createTransport(() => ({ status: 401, data: "" }));
  const sync = createWebDavSync(
    {
      url: "https://dav.jianguoyun.com/dav/",
      username: "nickname",
      password: "login-password",
    },
    fake.transport,
  );

  let capturedError;
  try {
    await sync.testConnection();
  } catch (error) {
    capturedError = error;
  }

  const details = getWebDavErrorDetails(capturedError);
  assert.match(details.suggestion, /账号邮箱/);
  assert.match(details.suggestion, /第三方应用密码/);
});

test("native network errors preserve the underlying device reason", async () => {
  const fake = createTransport(() => {
    throw { message: "java.net.UnknownHostException: dav.example.com" };
  });
  const sync = createWebDavSync(config, fake.transport);

  let capturedError;
  try {
    await sync.testConnection();
  } catch (error) {
    capturedError = error;
  }

  const details = getWebDavErrorDetails(capturedError);
  assert.equal(details.summary, "无法连接 WebDAV。");
  assert.match(details.reason, /UnknownHostException/);
});

test("bidirectional sync uploads local data when the remote file does not exist", async () => {
  const fake = createTransport((request) =>
    request.method === "GET" ? { status: 404 } : { status: 201 },
  );
  const sync = createWebDavSync(config, fake.transport, () => "2026-07-24T10:00:00.000Z");

  const result = await sync.synchronize({
    data: emptyData,
    localUpdatedAt: "2026-07-24T09:00:00.000Z",
  });

  assert.equal(result.action, "uploaded");
  assert.deepEqual(
    fake.requests.map((request) => request.method),
    ["GET", "PUT"],
  );
  const uploadedDocument = JSON.parse(fake.requests[1].data);
  assert.equal(uploadedDocument.updatedAt, "2026-07-24T10:00:00.000Z");
  assert.deepEqual(uploadedDocument.data, emptyData);
});

test("bidirectional sync downloads a newer remote snapshot", async () => {
  const remoteDocument = {
    app: "buwangwu",
    schemaVersion: 1,
    updatedAt: "2026-07-24T11:00:00.000Z",
    data: { ...emptyData, items: [{ id: "remote-item" }] },
  };
  const fake = createTransport(() => ({ status: 200, data: JSON.stringify(remoteDocument) }));
  const sync = createWebDavSync(config, fake.transport, () => "2026-07-24T12:00:00.000Z");

  const result = await sync.synchronize({
    data: emptyData,
    localUpdatedAt: "2026-07-24T10:00:00.000Z",
  });

  assert.equal(result.action, "downloaded");
  assert.equal(result.document.data.items[0].id, "remote-item");
  assert.equal(fake.requests.length, 1);
});

test("bidirectional sync uploads a newer local snapshot", async () => {
  const remoteDocument = {
    app: "buwangwu",
    schemaVersion: 1,
    updatedAt: "2026-07-24T09:00:00.000Z",
    data: emptyData,
  };
  const fake = createTransport((request) =>
    request.method === "GET"
      ? { status: 200, data: remoteDocument }
      : { status: 204 },
  );
  const sync = createWebDavSync(config, fake.transport);

  const result = await sync.synchronize({
    data: emptyData,
    localUpdatedAt: "2026-07-24T10:00:00.000Z",
  });

  assert.equal(result.action, "uploaded");
  assert.equal(JSON.parse(fake.requests[1].data).updatedAt, "2026-07-24T10:00:00.000Z");
});

test("download mode rejects a missing remote snapshot without changing local data", async () => {
  const fake = createTransport(() => ({ status: 404 }));
  const sync = createWebDavSync(config, fake.transport);

  await assert.rejects(
    () =>
      sync.synchronize({
        data: emptyData,
        localUpdatedAt: "2026-07-24T10:00:00.000Z",
        mode: "download",
      }),
    /还没有同步数据/,
  );
});

test("invalid remote files are rejected", async () => {
  const fake = createTransport(() => ({ status: 200, data: '{"not":"buwangwu"}' }));
  const sync = createWebDavSync(config, fake.transport);

  await assert.rejects(
    () =>
      sync.synchronize({
        data: emptyData,
        localUpdatedAt: "2026-07-24T10:00:00.000Z",
      }),
    /格式或版本不受支持/,
  );
});
