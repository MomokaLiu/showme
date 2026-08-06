import type { Category } from "../types/category";
import type { RecognitionResult } from "./barcodeService";
import {
  isAiRecognitionConfigured,
  loadAiRecognitionConfig,
  type AiRecognitionConfig,
} from "./aiRecognitionStorage";

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

export async function recognizeItemImage(
  imageUri: string | string[],
  categories: Category[],
  config: AiRecognitionConfig = loadAiRecognitionConfig(),
): Promise<RecognitionResult> {
  if (!isAiRecognitionConfigured(config)) {
    throw new Error("请先在设置中配置 AI 识别服务。图片已保留，你仍可手动填写。");
  }

  const imageUris = (Array.isArray(imageUri) ? imageUri : [imageUri]).filter(Boolean).slice(0, 5);
  if (!imageUris.length) throw new Error("请先选择至少一张图片。");

  const response = await fetch(resolveChatCompletionsUrl(config.endpoint), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "你是库存录入助手。只根据图片中可见的信息给出保守建议，不确定的字段省略，不得编造购买渠道、价格或日期。仅输出 JSON。",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                `识别商品并输出 name、brand、model、categoryId、purchaseChannel、tags、totalPrice。` +
                `categoryId 只能从以下列表选择：${categories.map((item) => `${item.id}=${item.name}`).join("，")}。` +
                "tags 为简短字符串数组；totalPrice 仅在图片有明确价格时输出数字。",
            },
            ...imageUris.map((url) => ({ type: "image_url" as const, image_url: { url } })),
          ],
        },
      ],
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as ChatCompletionResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message || `AI 识别请求失败（${response.status}）`);
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI 没有返回可用结果，请重试或手动填写。");
  return normalizeRecognitionResult(parseJsonContent(content), categories);
}

export function parseJsonContent(content: string): unknown {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

export function resolveChatCompletionsUrl(endpoint: string): string {
  const normalized = endpoint.trim().replace(/\/+$/, "");
  if (normalized.endsWith("/chat/completions")) return normalized;
  if (normalized.endsWith("/openai")) return `${normalized}/chat/completions`;
  if (normalized.endsWith("/v1")) return `${normalized}/chat/completions`;
  if (normalized.endsWith("/v1beta")) return `${normalized}/openai/chat/completions`;
  return `${normalized}/v1/chat/completions`;
}

export async function testAiRecognitionConnection(
  config: AiRecognitionConfig = loadAiRecognitionConfig(),
): Promise<{ success: true; model: string } | { success: false; error: string }> {
  if (!isAiRecognitionConfigured(config)) {
    return { success: false, error: "请先配置完整的接口地址、模型名称和 API 密钥。" };
  }

  try {
    const tinyTestImage =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    await recognizeItemImage(tinyTestImage, [{ id: "test", name: "测试分类" }], config);
    return { success: true, model: config.model };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { success: false, error: message };
  }
}


function normalizeRecognitionResult(value: unknown, categories: Category[]): RecognitionResult {
  if (!value || typeof value !== "object") return {};
  const source = value as Record<string, unknown>;
  const categoryId =
    typeof source.categoryId === "string" && categories.some((category) => category.id === source.categoryId)
      ? source.categoryId
      : undefined;
  const totalPrice =
    typeof source.totalPrice === "number" && Number.isFinite(source.totalPrice) && source.totalPrice >= 0
      ? source.totalPrice
      : undefined;
  return {
    name: cleanText(source.name),
    brand: cleanText(source.brand),
    model: cleanText(source.model),
    categoryId,
    purchaseChannel: cleanText(source.purchaseChannel),
    tags: Array.isArray(source.tags)
      ? source.tags.flatMap((tag) => (typeof tag === "string" && tag.trim() ? [tag.trim()] : [])).slice(0, 8)
      : undefined,
    totalPrice,
  };
}

function cleanText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
