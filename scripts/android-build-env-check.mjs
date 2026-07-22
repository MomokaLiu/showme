import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const isWindows = os.platform() === "win32";
const checks = [];

checks.push({
  name: "Java",
  ok: commandExists("java") || Boolean(process.env.JAVA_HOME),
  detail: process.env.JAVA_HOME ? `JAVA_HOME=${process.env.JAVA_HOME}` : "需要 JDK 17+，并配置 JAVA_HOME 或 PATH",
});

const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || defaultAndroidSdkPath();
checks.push({
  name: "Android SDK",
  ok: Boolean(sdkRoot && existsSync(sdkRoot)),
  detail: sdkRoot ? `SDK=${sdkRoot}` : "需要安装 Android Studio 或 Android command line tools",
});

checks.push({
  name: "Gradle Wrapper",
  ok: existsSync(path.join(process.cwd(), "android", isWindows ? "gradlew.bat" : "gradlew")),
  detail: "由 Capacitor 生成在 android/ 目录",
});

let hasError = false;
console.log("Android 打包环境检查：");
for (const check of checks) {
  console.log(`${check.ok ? "✓" : "✗"} ${check.name} - ${check.detail}`);
  hasError ||= !check.ok;
}

if (hasError) {
  console.log("");
  console.log("缺少环境时：安装 Android Studio，打开 SDK Manager 安装 Android SDK，然后设置 JAVA_HOME。");
  process.exitCode = 1;
}

function commandExists(command) {
  const result = spawnSync(isWindows ? "where" : "which", [command], { stdio: "ignore" });
  return result.status === 0;
}

function defaultAndroidSdkPath() {
  if (isWindows) {
    const localAppData = process.env.LOCALAPPDATA;
    return localAppData ? path.join(localAppData, "Android", "Sdk") : undefined;
  }
  if (os.platform() === "darwin") {
    return path.join(os.homedir(), "Library", "Android", "sdk");
  }
  return path.join(os.homedir(), "Android", "Sdk");
}
