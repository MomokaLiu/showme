# Mission: 在红米 K70 上验证“不忘物”

## Why
把当前开发版本可靠地运行在真实的红米 K70 上，尽早发现桌面浏览器无法暴露的 HyperOS、文件选择、本机存储和 WebDAV 网络问题。

## Success looks like
- 能通过局域网在手机 Chrome 中快速验证最新界面
- 能生成并安装 debug APK，在红米 K70 上完成原生测试
- 能使用 ADB 定位安装、启动和 WebDAV 同步故障
- 能按固定清单复测添加、图片、成本计算、重启持久化和同步

## Constraints
- 开发电脑是 Windows
- 当前电脑尚未安装 JDK、Android SDK 和 ADB
- 测试机是运行 HyperOS 的红米 K70

## Out of scope
- 应用商店上架、正式签名和发布流水线
- 多品牌、多 Android 版本的兼容性矩阵
