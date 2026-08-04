import { useState } from "react";
import { PrivacySettingsCard } from "../../components/PrivacySettingsCard";
import {
  testAiRecognitionConnection,
} from "../../services/imageRecognitionService";
import {
  loadAiRecognitionConfig,
  saveAiRecognitionConfig,
  type AiRecognitionConfig,
} from "../../services/aiRecognitionStorage";
import { loadWebDavConfig, saveWebDavConfig } from "../../services/syncStorage";
import { useInventoryStore } from "../../store/itemStore";
import type { WebDavConfig, WebDavSyncMode } from "../../types/sync";
import { DataSafetyCard } from "../../components/DataSafetyCard";
import { navigate } from "../router";
import { CategorySettingsCard } from "../../components/CategorySettingsCard";

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
  const [aiConfig, setAiConfig] = useState<AiRecognitionConfig>(() => loadAiRecognitionConfig());
  const [aiConfigSaved, setAiConfigSaved] = useState(false);
  const [aiTestState, setAiTestState] = useState<{
    isTesting: boolean;
    message?: string;
    isError?: boolean;
  }>({ isTesting: false });
  const isJianguoyun = isJianguoyunUrl(webDavConfig.url);
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  const androidTestUrl =
    host === "127.0.0.1" || host === "localhost"
      ? "运行 npm run android:url 获取手机可访问地址"
      : window.location.origin;

  function updateWebDavConfig<Key extends keyof WebDavConfig>(key: Key, value: WebDavConfig[Key]) {
    setWebDavConfig((current) => ({ ...current, [key]: value }));
  }

  function updateAiConfig<Key extends keyof AiRecognitionConfig>(key: Key, value: AiRecognitionConfig[Key]) {
    setAiConfig((current) => ({ ...current, [key]: value }));
    setAiConfigSaved(false);
    setAiTestState({ isTesting: false });
  }

  async function handleTestAi() {
    saveAiRecognitionConfig(aiConfig);
    setAiConfigSaved(true);
    setAiTestState({ isTesting: true });
    try {
      const result = await testAiRecognitionConnection(aiConfig);
      if (result.success) {
        setAiTestState({
          isTesting: false,
          message: `AI 识别测试成功！模型 (${result.model}) 响应正常。`,
          isError: false,
        });
      } else {
        setAiTestState({
          isTesting: false,
          message: `测试失败：${result.error}`,
          isError: true,
        });
      }
    } catch (cause) {
      setAiTestState({
        isTesting: false,
        message: `测试出错：${cause instanceof Error ? cause.message : String(cause)}`,
        isError: true,
      });
    }
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
    <div className="page-stack settings-page">
      <section className="settings-link-list">
        <button type="button" onClick={() => navigate("/locations")}><span><strong>存放位置</strong><small>房间、柜子和收纳盒</small></span><b>›</b></button>
        <button type="button" onClick={() => navigate("/insights")}><span><strong>数据洞察</strong><small>价值、成本和浪费</small></span><b>›</b></button>
        <button type="button" onClick={() => navigate("/rankings")}><span><strong>库存榜单</strong><small>闲置与使用价值</small></span><b>›</b></button>
      </section>

      <div className="settings-group-label">管理</div>

      <details className="settings-details">
        <summary><strong>分类管理</strong><span>{categories.filter((category) => !category.isArchived).length} 个使用中</span></summary>
        <section className="section-block settings-details__body">
          <CategorySettingsCard />
        </section>
      </details>

      <details className="settings-details">
        <summary><strong>数据安全</strong><span>备份、导入与导出</span></summary>
        <section className="section-block settings-details__body">
          <DataSafetyCard />
        </section>
      </details>

      <details className="settings-details">
        <summary><strong>AI 图片识别</strong><span>模型与密钥配置</span></summary>
      <section className="section-block settings-details__body">
        <div className="section-title">
          <h2>AI 图片识别</h2>
        </div>
        <div className="sync-card">
          <p className="settings-intro">
            配置兼容 Chat Completions 的视觉模型接口后，可在“添加物品”中拍照生成录入建议。AI 结果只会填入草稿。
          </p>
          <label className="field">
            <span>接口地址</span>
            <input
              type="url"
              value={aiConfig.endpoint}
              onChange={(event) => updateAiConfig("endpoint", event.target.value)}
              placeholder="https://generativelanguage.googleapis.com/v1beta/openai"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </label>
          <div className="field-grid">
            <label className="field">
              <span>模型</span>
              <input
                value={aiConfig.model}
                onChange={(event) => updateAiConfig("model", event.target.value)}
                placeholder="例如 gemini-3.6-flash 或 gpt-4o-mini"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </label>
            <label className="field">
              <span>API 密钥</span>
              <input
                type="password"
                value={aiConfig.apiKey}
                onChange={(event) => updateAiConfig("apiKey", event.target.value)}
                placeholder="仅保存在当前设备"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </label>
          </div>
          <div className="sync-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                saveAiRecognitionConfig(aiConfig);
                setAiConfigSaved(true);
              }}
            >
              保存 AI 配置
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={aiTestState.isTesting}
              onClick={handleTestAi}
            >
              {aiTestState.isTesting ? "测试中..." : "测试 AI 识别"}
            </button>
          </div>
          {aiConfigSaved ? <p className="form-message" role="status">AI 识别配置已保存。</p> : null}
          {aiTestState.message ? (
            <p
              className={aiTestState.isError ? "sync-status sync-status--error" : "form-message"}
              role="status"
            >
              {aiTestState.message}
            </p>
          ) : null}
          <small>密钥只保存在当前设备，不进入 WebDAV 同步。支持 Google Gemini OpenAI 兼容接口及各类 Chat Completions 代理。</small>
        </div>
      </section>
      </details>

      <details className="settings-details">
        <summary><strong>私密库存保护</strong><span>密码、手势和设备验证</span></summary>
      <section className="section-block settings-details__body">
        <div className="section-title">
          <h2>私密库存保护</h2>
        </div>
        <PrivacySettingsCard />
        <small className="privacy-disclaimer">私密库存提供本机界面访问控制，不等同于端到端加密；同步到 WebDAV 的备份文件也未加密。</small>
      </section>
      </details>

      <details className="settings-details">
        <summary><strong>WebDAV 数据同步</strong><span>高级备份与多设备恢复</span></summary>
      <section className="section-block settings-details__body">
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
      </details>

      {import.meta.env.DEV ? <details className="settings-details">
        <summary><strong>安卓真机测试</strong><span>仅开发环境</span></summary>
        <section className="section-block settings-details__body">
          <div className="android-test-card">
            <strong>{androidTestUrl}</strong>
            <span>电脑运行 npm run dev:android 后，手机和电脑连同一 Wi-Fi，再用手机 Chrome 打开电脑局域网地址。</span>
            <span>可运行 npm run android:url 查看可用地址。</span>
          </div>
        </section>
      </details> : null}

      <details className="settings-details">
        <summary><strong>数据概览</strong><span>{items.length} 件库存</span></summary>
        <section className="section-block settings-details__body">
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
      </details>

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
