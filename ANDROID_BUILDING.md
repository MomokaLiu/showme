# Android APP 打包

当前项目已接入 Capacitor，Android 原生工程位于 `android/`。

## 环境检查

```bash
npm run android:doctor
```

需要本机安装：

- JDK 17+
- Android Studio 或 Android command line tools
- Android SDK / Platform Tools

## 调试安装到真机

1. 安装 Android Studio，并在 SDK Manager 中安装 Android SDK / Platform Tools。
2. 手机开启开发者模式和 USB 调试。
3. 连接手机后运行：

```bash
npm run android:run
```

也可以打开 Android Studio：

```bash
npm run android:open
```

## 生成测试 APK

```bash
npm run android:apk
```

产物位置：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

这个 APK 适合发给测试机直接安装，不适合正式上架。

## 生成上架 AAB

```bash
npm run android:aab
```

正式上架前需要在 Android Studio 中配置签名：

1. Build > Generate Signed Bundle / APK
2. 选择 Android App Bundle
3. 创建或选择 keystore
4. 选择 release 构建

常见产物位置：

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## 每次修改 Web 代码后的同步

Capacitor 打包的是 `dist/`，所以修改 React 代码后要重新构建并同步：

```bash
npm run cap:sync
```

`android:run`、`android:apk` 和 `android:aab` 已经自动包含这一步。
