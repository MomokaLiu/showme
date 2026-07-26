import { defineConfig, type ProxyOptions } from "vite";
import react from "@vitejs/plugin-react";

const JIANGUOYUN_PROXY_PREFIX = "/__webdav/jianguoyun";

export default defineConfig({
  plugins: [react],
  server: {
    proxy: {
      [JIANGUOYUN_PROXY_PREFIX]: createJianguoyunProxy(),
    },
  },
  preview: {
    proxy: {
      [JIANGUOYUN_PROXY_PREFIX]: createJianguoyunProxy(),
    },
  },
});

function createJianguoyunProxy(): ProxyOptions {
  return {
    target: "https://dav.jianguoyun.com",
    changeOrigin: true,
    secure: true,
    rewrite: (path) => path.slice(JIANGUOYUN_PROXY_PREFIX.length) || "/",
    configure(proxy) {
      proxy.on("proxyReq", (proxyRequest) => {
        proxyRequest.removeHeader("origin");
        proxyRequest.removeHeader("referer");
      });
      proxy.on("proxyRes", (proxyResponse) => {
        // Let the app handle 401 responses. Forwarding this header would make
        // the browser open its own Basic Auth prompt and leave fetch pending.
        delete proxyResponse.headers["www-authenticate"];
      });
    },
  };
}
