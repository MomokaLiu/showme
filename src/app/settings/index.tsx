import { useState } from "react";
import { loadWebDavConfig, saveWebDavConfig } from "../../services/syncStorage";
import { useInventoryStore } from "../../store/itemStore";
import type { WebDavConfig, WebDavSyncMode } from "../../types/sync";

export default function SettingsPage() {
  const {
    categories,
    locations,
    items,
    shoppingItems,
    webDavSyncState,
    testWebDavConnection,
    synchronizeWebDav,
  } = useInventoryStore();
  const [webDavConfig, setWebDavConfig] = useState<WebDavConfig>(() => loadWebDavConfig());
  const isJianguoyun = isJianguoyunUrl(webDavConfig.url);
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  const androidTestUrl =
    host === "127.0.0.1" || host === "localhost"
      ? "运行 npm run android:url 获取手机可访问地址"
      : window.location.origin;

  function updateWebDavConfig<Key extends keyof WebDavConfig>(key: Key, value: WebDavConfig[Key]) {
    setWebDavConfig((current) => ({ ...current, [key]: value }));
  }

  function persistConfig() {
    saveWebDavConfig(webDavConfig);
  }

  async function handleTestConnection() {
    persistConfig();
    try {
      await testWebDavConnection(webDavConfig);
    } catch {
      // The store exposes a user-facing error in webDavSyncState.
    }
  }

  async function handleSync(mode: WebDavSyncMode) {
    if (
      mode === "upload" &&
      !window.confirm("这会用本机数据覆盖 WebDAV 上的数据文件，确定继续吗？")
    ) {
      return;
    }
    if (
      mode === "download" &&
      !window.confirm("这会用 WebDAV 数据覆盖本机全部库存和清单，确定继续吗？")
    ) {
      return;
    }

    persistConfig();
    try {
      await synchronizeWebDav(webDavConfig, mode);
    } catch {
      // The store exposes a user-facing error in webDavSyncState.
    }
  }

  return (
    <div className="page-stack">
      <section className="section-block">
        <div className="section-title">
          <h2>WebDAV 数据同步</h2>
        </div>
        <div className="sync-card">
          <label className="field">
            <span>WebDAV 地址</span>
            <input
              type="url"
              value={webDavConfig.url}
              onChange={(event) => updateWebDavConfig("url", event.target.value)}
              placeholder="https://dav.example.com/不忘物/"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <small>可填写已有目录或完整 JSON 文件地址；目录中会使用 buwangwu-data.json。</small>
          </label>
          <div className="field-grid">
            <label className="field">
              <span>{isJianguoyun ? "坚果云账号邮箱" : "用户名"}</span>
              <input
                value={webDavConfig.username}
                onChange={(event) => updateWebDavConfig("username", event.target.value)}
                placeholder={isJianguoyun ? "name@example.com" : undefined}
                autoCapitalize="none"
                autoCorrect="off"
              />
            </label>
            <label className="field">
              <span>{isJianguoyun ? "坚果云第三方应用密码" : "密码或应用密码"}</span>
              <input
                type="password"
                value={webDavConfig.password}
                onChange={(event) => updateWebDavConfig("password", event.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
              />
            </label>
          </div>
          {isJianguoyun ? (
            <small className="sync-provider-hint">
              坚果云不接受昵称或登录密码；请使用注册邮箱和在“安全选项 → 第三方应用管理”中生成的密码。根地址会自动使用
              remember/buwangwu-data.json。
            </small>
          ) : null}

          <div className="sync-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={webDavSyncState.isSyncing}
              onClick={handleTestConnection}
            >
              测试连接
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={webDavSyncState.isSyncing}
              onClick={() => handleSync("bidirectional")}
            >
              {webDavSyncState.isSyncing ? "同步中..." : "立即同步"}
            </button>
          </div>

          <div className="sync-actions sync-actions--secondary">
            <button
              type="button"
              disabled={webDavSyncState.isSyncing}
              onClick={() => handleSync("upload")}
            >
              强制上传本机数据
            </button>
            <button
              type="button"
              disabled={webDavSyncState.isSyncing}
              onClick={() => handleSync("download")}
            >
              从 WebDAV 恢复
            </button>
          </div>

          {webDavSyncState.isError && webDavSyncState.errorDetails ? (
            <div className="sync-status sync-status--error" role="alert">
              <strong>{webDavSyncState.errorDetails.summary}</strong>
              <span>
                <b>错误原因：</b>
                {webDavSyncState.errorDetails.reason}
              </span>
              <span>
                <b>处理建议：</b>
                {webDavSyncState.errorDetails.suggestion}
              </span>
            </div>
          ) : webDavSyncState.message ? (
            <p className="sync-status" role="status">
              {webDavSyncState.message}
            </p>
          ) : null}
          {webDavSyncState.lastSyncedAt ? (
            <small>上次同步：{new Date(webDavSyncState.lastSyncedAt).toLocaleString("zh-CN")}</small>
          ) : null}

          <div className="sync-notes">
            <span>双向同步会比较整库更新时间，较新的完整快照覆盖较旧版本。</span>
            <span>密码以本地应用配置保存在当前设备且不会同步；请使用应用专用密码。</span>
            <span>使用本项目的 dev/preview 服务在本机打开时，坚果云会自动使用同源代理。</span>
            <span>其他静态网站或 WebDAV 服务仍需由服务器提供代理或允许跨域访问。</span>
            <span>私有局域网 HTTP 可用于手机测试；正式使用仍推荐 Android 应用或 HTTPS。</span>
            <span>请先在 WebDAV 上创建目标目录；推荐使用服务商提供的应用专用密码。</span>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-title">
          <h2>安卓真机测试</h2>
        </div>
        <div className="android-test-card">
          <strong>{androidTestUrl}</strong>
          <span>电脑运行 npm run dev:android 后，手机和电脑连同一 Wi-Fi，再用手机 Chrome 打开电脑局域网地址。</span>
          <span>可运行 npm run android:url 查看可用地址。</span>
        </div>
      </section>

      <section className="section-block">
        <div className="section-title">
          <h2>数据概览</h2>
        </div>
        <div className="detail-grid">
          <div className="detail-row">
            <span>库存记录</span>
            <strong>{items.length}</strong>
          </div>
          <div className="detail-row">
            <span>购物项</span>
            <strong>{shoppingItems.length}</strong>
          </div>
          <div className="detail-row">
            <span>分类</span>
            <strong>{categories.length}</strong>
          </div>
          <div className="detail-row">
            <span>位置</span>
            <strong>{locations.length}</strong>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-title">
          <h2>默认分类</h2>
        </div>
        <div className="tag-wrap">
          {categories.map((category) => (
            <span key={category.id}>{category.name}</span>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-title">
          <h2>默认位置</h2>
        </div>
        <div className="tag-wrap">
          {locations.map((location) => (
            <span key={location.id}>{location.name}</span>
          ))}
        </div>
      </section>
    </div>
  );
}

function isJianguoyunUrl(rawUrl: string): boolean {
  try {
    return new URL(rawUrl).hostname === "dav.jianguoyun.com";
  } catch {
    return false;
  }
}
