import { Capacitor, CapacitorHttp } from "@capacitor/core";
import type { WebDavTransport } from "./webDavSync";

const JIANGUOYUN_ORIGIN = "https://dav.jianguoyun.com";
const JIANGUOYUN_PROXY_PREFIX = "/__webdav/jianguoyun";

export const capacitorWebDavTransport: WebDavTransport = {
  async request(request) {
    const response = await CapacitorHttp.request({
      url: resolveWebDavRequestUrl(request.url),
      method: request.method,
      headers: request.headers,
      data: request.data,
      responseType: "text",
      connectTimeout: 15_000,
      readTimeout: 15_000,
    });

    return {
      status: response.status,
      data: response.data,
    };
  },
};

export function resolveWebDavRequestUrl(
  remoteUrl: string,
  isNativePlatform = Capacitor.isNativePlatform(),
  browserOrigin = globalThis.location?.origin ?? "",
): string {
  if (isNativePlatform) return remoteUrl;

  const url = new URL(remoteUrl);
  if (url.origin !== JIANGUOYUN_ORIGIN) return remoteUrl;
  if (!browserOrigin) return remoteUrl;

  const origin = new URL(browserOrigin);
  if (
    origin.protocol !== "https:" &&
    !isLoopbackHost(origin.hostname) &&
    !isPrivateLanHost(origin.hostname)
  ) {
    throw new Error(
      "WebDAV 坚果云网页代理拒绝通过不安全的公网 HTTP 传输应用密码，请改用 HTTPS 或 Android 应用同步。",
    );
  }

  return `${origin.origin}${JIANGUOYUN_PROXY_PREFIX}${url.pathname}${url.search}`;
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function isPrivateLanHost(hostname: string): boolean {
  const octets = hostname.split(".").map(Number);
  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return false;
  }

  return (
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}
