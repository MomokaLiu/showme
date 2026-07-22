import os from "node:os";

const port = process.env.PORT || "5173";
const interfaces = os.networkInterfaces();
const urls = [];

for (const entries of Object.values(interfaces)) {
  for (const entry of entries ?? []) {
    if (entry.family === "IPv4" && !entry.internal) {
      urls.push(`http://${entry.address}:${port}`);
    }
  }
}

if (!urls.length) {
  console.log("未找到局域网 IPv4 地址。请确认电脑已连接 Wi-Fi 或局域网。");
  process.exit(0);
}

console.log("安卓手机与电脑连接同一 Wi-Fi 后，在手机 Chrome 打开：");
for (const url of urls) {
  console.log(`- ${url}`);
}
console.log("");
console.log("启动开发服务：npm run dev:android");
