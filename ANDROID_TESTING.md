# 安卓手机测试

1. 电脑和安卓手机连接同一个 Wi-Fi。
2. 在项目目录运行：

```bash
npm run dev:android
```

3. 另开一个终端查看手机可访问地址：

```bash
npm run android:url
```

4. 在安卓手机 Chrome 打开输出的局域网地址，例如 `http://192.168.x.x:5173`。
5. Chrome 菜单中可以选择“添加到主屏幕”，以 PWA 方式测试接近 App 的体验。

如果手机打不开，优先检查 Windows 防火墙是否允许 Node/Vite 监听局域网连接。
