import assert from "node:assert/strict";
import { after, test } from "node:test";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { build } from "esbuild";

const outputs = [];

async function loadModule(entry, name) {
  const outfile = join(tmpdir(), `showme-${name}-${process.pid}.mjs`);
  outputs.push(outfile);
  await build({ entryPoints: [entry], bundle: true, format: "esm", outfile, platform: "node" });
  return import(pathToFileURL(outfile).href);
}

const imageRecognition = await loadModule("src/services/imageRecognitionService.ts", "image-recognition");

after(() => Promise.all(outputs.map((path) => rm(path, { force: true }))));

test("resolveChatCompletionsUrl correctly formats Google Gemini and standard OpenAI endpoints", () => {
  assert.equal(
    imageRecognition.resolveChatCompletionsUrl("https://generativelanguage.googleapis.com/v1beta/openai"),
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
  );
  assert.equal(
    imageRecognition.resolveChatCompletionsUrl("https://generativelanguage.googleapis.com/v1beta/openai/"),
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
  );
  assert.equal(
    imageRecognition.resolveChatCompletionsUrl("https://generativelanguage.googleapis.com/v1beta"),
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
  );
  assert.equal(
    imageRecognition.resolveChatCompletionsUrl("https://api.openai.com/v1"),
    "https://api.openai.com/v1/chat/completions"
  );
  assert.equal(
    imageRecognition.resolveChatCompletionsUrl("https://api.openai.com/v1/chat/completions"),
    "https://api.openai.com/v1/chat/completions"
  );
});

test("testAiRecognitionConnection rejects unconfigured AI config", async () => {
  const result = await imageRecognition.testAiRecognitionConnection({
    endpoint: "",
    apiKey: "",
    model: "",
  });
  assert.equal(result.success, false);
  assert.match(result.error, /请先配置/);
});

test("recognizeItemImage sends correct model gemini-3.6-flash and headers to Gemini API", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedOptions = null;

  globalThis.fetch = async (url, options) => {
    capturedUrl = String(url);
    capturedOptions = options;
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                name: "测试商品",
                brand: "Gemini Brand",
                model: "3.6 Flash",
              }),
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  try {
    const config = {
      endpoint: "https://generativelanguage.googleapis.com/v1beta/openai",
      apiKey: "test-gemini-key",
      model: "gemini-3.6-flash",
    };

    const categories = [{ id: "cat-1", name: "数码电子" }];
    const testImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

    const result = await imageRecognition.recognizeItemImage(testImage, categories, config);

    assert.equal(capturedUrl, "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    assert.equal(capturedOptions.headers["Authorization"], "Bearer test-gemini-key");
    const payload = JSON.parse(capturedOptions.body);
    assert.equal(payload.model, "gemini-3.6-flash");
    assert.equal(result.name, "测试商品");
    assert.equal(result.brand, "Gemini Brand");

    const testConnectionResult = await imageRecognition.testAiRecognitionConnection(config);
    assert.equal(testConnectionResult.success, true);
    assert.equal(testConnectionResult.model, "gemini-3.6-flash");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
