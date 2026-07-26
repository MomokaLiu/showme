import type {
  InventorySyncData,
  InventorySyncDocument,
  WebDavConfig,
  WebDavSyncMode,
  WebDavSyncResult,
} from "../types/sync";

export type WebDavRequest = {
  url: string;
  method: "GET" | "PUT";
  headers: Record<string, string>;
  data?: string;
};

export type WebDavResponse = {
  status: number;
  data?: unknown;
};

export type WebDavTransport = {
  request: (request: WebDavRequest) => Promise<WebDavResponse>;
};

export type WebDavErrorDetails = {
  summary: string;
  reason: string;
  suggestion: string;
};

type SyncInput = {
  data: InventorySyncData;
  localUpdatedAt: string;
  mode?: WebDavSyncMode;
};

const DATA_FILE_NAME = "buwangwu-data.json";

export function createWebDavSync(
  config: WebDavConfig,
  transport: WebDavTransport,
  now: () => string = () => new Date().toISOString(),
) {
  const dataUrl = resolveWebDavDataUrl(config.url);
  const authorization = createBasicAuthorization(config.username, config.password);
  const commonHeaders: Record<string, string> = {};
  if (authorization) commonHeaders.Authorization = authorization;

  return {
    async testConnection(): Promise<void> {
      let response: WebDavResponse;
      try {
        response = await transport.request({
          url: dataUrl,
          method: "GET",
          headers: {
            ...commonHeaders,
            Accept: "application/json",
          },
        });
      } catch (error) {
        throw translateNetworkError(error);
      }

      // A missing data file is expected before the first upload. Receiving the
      // 404 still proves that the server is reachable and accepted the request.
      if ((response.status >= 200 && response.status < 300) || response.status === 404) return;
      throw createStatusError(response.status, "连接", dataUrl);
    },

    async synchronize(input: SyncInput): Promise<WebDavSyncResult> {
      const mode = input.mode ?? "bidirectional";
      const syncedAt = now();

      if (mode === "upload") {
        const document = createDocument(input.data, syncedAt);
        await uploadDocument(dataUrl, document, commonHeaders, transport);
        return { action: "uploaded", document, syncedAt };
      }

      const remoteDocument = await downloadDocument(dataUrl, commonHeaders, transport);

      if (mode === "download") {
        if (!remoteDocument) throw new Error("WebDAV 上还没有同步数据，无法下载。");
        return { action: "downloaded", document: remoteDocument, syncedAt };
      }

      if (!remoteDocument) {
        const document = createDocument(input.data, syncedAt);
        await uploadDocument(dataUrl, document, commonHeaders, transport);
        return { action: "uploaded", document, syncedAt };
      }

      const localTime = parseTimestamp(input.localUpdatedAt);
      const remoteTime = parseTimestamp(remoteDocument.updatedAt);

      if (remoteTime > localTime) {
        return { action: "downloaded", document: remoteDocument, syncedAt };
      }

      if (localTime > remoteTime) {
        const document = createDocument(input.data, input.localUpdatedAt);
        await uploadDocument(dataUrl, document, commonHeaders, transport);
        return { action: "uploaded", document, syncedAt };
      }

      return { action: "unchanged", document: remoteDocument, syncedAt };
    },
  };
}

export function resolveWebDavDataUrl(rawUrl: string): string {
  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl) throw new Error("请填写 WebDAV 地址。");

  let url: URL;
  try {
    url = new URL(trimmedUrl);
  } catch {
    throw new Error("WebDAV 地址格式不正确。");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("WebDAV 地址必须使用 http:// 或 https://。");
  }
  if (
    url.protocol === "http:" &&
    url.hostname !== "localhost" &&
    url.hostname !== "127.0.0.1" &&
    url.hostname !== "[::1]"
  ) {
    throw new Error("为保护 WebDAV 密码，请使用 https:// 地址。");
  }

  if (
    url.hostname === "dav.jianguoyun.com" &&
    url.pathname.replace(/\/+$/, "") === "/dav"
  ) {
    url.pathname = "/dav/remember/";
  }

  const pathSegments = url.pathname.split("/").filter(Boolean);
  const lastSegment = pathSegments[pathSegments.length - 1] ?? "";
  if (!lastSegment.toLowerCase().endsWith(".json")) {
    if (!url.pathname.endsWith("/")) url.pathname += "/";
    url.pathname += DATA_FILE_NAME;
  }

  url.hash = "";
  url.search = "";
  return url.toString();
}

function createBasicAuthorization(username: string, password: string): string | undefined {
  if (!username && !password) return undefined;
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `Basic ${btoa(binary)}`;
}

function createDocument(data: InventorySyncData, updatedAt: string): InventorySyncDocument {
  parseTimestamp(updatedAt);
  return {
    app: "buwangwu",
    schemaVersion: 1,
    updatedAt,
    data,
  };
}

async function downloadDocument(
  url: string,
  commonHeaders: Record<string, string>,
  transport: WebDavTransport,
): Promise<InventorySyncDocument | undefined> {
  let response: WebDavResponse;
  try {
    response = await transport.request({
      url,
      method: "GET",
      headers: { ...commonHeaders, Accept: "application/json" },
    });
  } catch (error) {
    throw translateNetworkError(error);
  }

  if (response.status === 404) return undefined;
  if (response.status < 200 || response.status >= 300) {
    throw createStatusError(response.status, "下载", url);
  }

  return parseDocument(response.data);
}

async function uploadDocument(
  url: string,
  document: InventorySyncDocument,
  commonHeaders: Record<string, string>,
  transport: WebDavTransport,
): Promise<void> {
  let response: WebDavResponse;
  try {
    response = await transport.request({
      url,
      method: "PUT",
      headers: {
        ...commonHeaders,
        "Content-Type": "application/json; charset=utf-8",
      },
      data: JSON.stringify(document),
    });
  } catch (error) {
    throw translateNetworkError(error);
  }

  if (response.status >= 200 && response.status < 300) return;
  throw createStatusError(response.status, "上传", url);
}

function parseDocument(rawData: unknown): InventorySyncDocument {
  let data: unknown = rawData;
  if (typeof rawData === "string") {
    try {
      data = JSON.parse(rawData);
    } catch {
      throw new Error("WebDAV 数据文件不是有效的 JSON。");
    }
  }

  if (!data || typeof data !== "object") {
    throw new Error("WebDAV 数据文件格式不正确。");
  }

  const candidate = data as Partial<InventorySyncDocument>;
  const syncData = candidate.data as Partial<InventorySyncData> | undefined;
  if (
    candidate.app !== "buwangwu" ||
    candidate.schemaVersion !== 1 ||
    typeof candidate.updatedAt !== "string" ||
    !syncData ||
    !Array.isArray(syncData.items) ||
    !Array.isArray(syncData.logs) ||
    !Array.isArray(syncData.categories) ||
    !Array.isArray(syncData.locations) ||
    !Array.isArray(syncData.shoppingItems)
  ) {
    throw new Error("WebDAV 数据文件格式或版本不受支持。");
  }

  parseTimestamp(candidate.updatedAt);
  return candidate as InventorySyncDocument;
}

function parseTimestamp(value: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error("同步数据的更新时间无效。");
  return timestamp;
}

function translateNetworkError(error: unknown): Error {
  if (error instanceof Error && error.message.startsWith("WebDAV")) return error;

  const rawMessage = getRawErrorMessage(error);
  const normalizedMessage = rawMessage.toLowerCase();

  if (
    normalizedMessage.includes("failed to fetch") ||
    normalizedMessage.includes("load failed") ||
    normalizedMessage.includes("networkerror")
  ) {
    return createWebDavError({
      summary: "无法连接 WebDAV。",
      reason:
        "浏览器未能完成请求，常见原因是网络不可达、TLS 证书无效或 WebDAV 服务未允许跨域访问。",
      suggestion: "确认地址可访问；若只在浏览器失败，请为 WebDAV 服务配置 CORS，或改用 Android 应用同步。",
    });
  }

  if (normalizedMessage.includes("timeout") || normalizedMessage.includes("timed out")) {
    return createWebDavError({
      summary: "无法连接 WebDAV。",
      reason: "连接或读取在 15 秒内没有完成，服务器响应过慢或当前网络不可达。",
      suggestion: "检查网络与服务器状态后重试。",
    });
  }

  if (
    normalizedMessage.includes("certificate") ||
    normalizedMessage.includes("certpath") ||
    normalizedMessage.includes("ssl")
  ) {
    return createWebDavError({
      summary: "无法建立安全连接。",
      reason: `设备拒绝了 WebDAV 服务器的 TLS 证书${rawMessage ? `（${rawMessage}）` : ""}。`,
      suggestion: "检查证书是否有效、完整且与 WebDAV 域名匹配。",
    });
  }

  return createWebDavError({
    summary: "无法连接 WebDAV。",
    reason: rawMessage || "网络请求未完成，设备没有返回更具体的错误信息。",
    suggestion: "检查 WebDAV 地址、网络连接和服务器状态后重试。",
  });
}

function createStatusError(status: number, operation: string, requestUrl: string): Error {
  if (status === 401 || status === 403) {
    const isJianguoyun = new URL(requestUrl).hostname === "dav.jianguoyun.com";
    return createWebDavError({
      summary: "WebDAV 认证失败。",
      reason: `服务器返回 HTTP ${status}，拒绝了当前用户名或密码。`,
      suggestion: isJianguoyun
        ? "坚果云的用户名必须填写账号邮箱，密码必须填写在“安全选项 → 第三方应用管理”中生成的第三方应用密码。"
        : "检查用户名和应用专用密码；若服务商启用了双重验证，请重新生成应用专用密码。",
    });
  }
  if (status === 404 || status === 409) {
    return createWebDavError({
      summary: `WebDAV ${operation}失败。`,
      reason: `服务器返回 HTTP ${status}，目标目录不存在或不允许在此位置创建数据文件。`,
      suggestion: "先在 WebDAV 服务器上创建目标目录，并确认填写的是该目录或其中的 JSON 文件地址。",
    });
  }
  if (status === 507) {
    return createWebDavError({
      summary: "WebDAV 存储空间不足。",
      reason: "服务器返回 HTTP 507，无法再写入同步数据。",
      suggestion: "清理 WebDAV 空间或提升存储配额后重试。",
    });
  }
  return createWebDavError({
    summary: `WebDAV ${operation}失败。`,
    reason: `服务器返回 HTTP ${status}。`,
    suggestion: "检查 WebDAV 服务状态和当前账号权限后重试。",
  });
}

export function getWebDavErrorDetails(error: unknown): WebDavErrorDetails {
  if (error instanceof WebDavError) return error.details;

  const reason = getRawErrorMessage(error);
  return {
    summary: "WebDAV 同步失败。",
    reason: reason || "应用没有收到可识别的错误信息。",
    suggestion: "检查同步配置和网络后重试。",
  };
}

class WebDavError extends Error {
  constructor(readonly details: WebDavErrorDetails) {
    super(`${details.summary} 原因：${details.reason}`);
    this.name = "WebDavError";
  }
}

function createWebDavError(details: WebDavErrorDetails): WebDavError {
  return new WebDavError(details);
}

function getRawErrorMessage(error: unknown): string {
  let message = "";
  if (error instanceof Error) {
    message = error.message;
  } else if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  }

  return message.replace(/\s+/g, " ").trim().slice(0, 240);
}
