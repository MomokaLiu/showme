import { useEffect, useState, type FormEvent } from "react";
import {
  canUseDeviceAuthentication,
  configurePrivacyPin,
  configurePrivacyPattern,
  enrollDeviceAuthentication,
  hasDeviceAuthentication,
  hasPrivacyPin,
  hasPrivacyPattern,
  lockPrivateSession,
  verifyPrivacyPin,
} from "../services/privacyService";
import { GesturePatternInput } from "./GesturePatternInput";

export function PrivacySettingsCard() {
  const [configured, setConfigured] = useState(() => hasPrivacyPin());
  const [deviceAvailable, setDeviceAvailable] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pendingPattern, setPendingPattern] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void canUseDeviceAuthentication().then(setDeviceAvailable);
  }, []);

  async function savePin(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    setBusy(true);
    try {
      if (configured && !(await verifyPrivacyPin(currentPin))) throw new Error("当前密码不正确。");
      if (newPin !== confirmation) throw new Error("两次输入的新密码不一致。");
      await configurePrivacyPin(newPin);
      lockPrivateSession();
      setConfigured(true);
      setCurrentPin("");
      setNewPin("");
      setConfirmation("");
      setMessage(configured ? "私密库存密码已更新。" : "私密库存密码已启用。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败，请重试。");
    } finally {
      setBusy(false);
    }
  }

  async function enrollDevice() {
    setMessage("");
    setError("");
    setBusy(true);
    try {
      if (!(await verifyPrivacyPin(currentPin))) throw new Error("请先输入正确的当前密码。");
      await enrollDeviceAuthentication();
      setCurrentPin("");
      setMessage("设备验证已启用，可在私密库存使用生物识别或锁屏验证。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "设备验证设置失败。");
    } finally {
      setBusy(false);
    }
  }

  async function savePattern(pattern: string) {
    setMessage("");
    setError("");
    setBusy(true);
    try {
      if (!(await verifyPrivacyPin(currentPin))) throw new Error("请先输入正确的当前密码。");
      if (!pendingPattern) {
        setPendingPattern(pattern);
        setMessage("请再次绘制相同手势进行确认。");
      } else if (pendingPattern !== pattern) {
        setPendingPattern("");
        throw new Error("两次手势不一致，请重新绘制。");
      } else {
        await configurePrivacyPattern(pattern);
        setPendingPattern("");
        setCurrentPin("");
        setMessage("手势解锁已启用。");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "手势设置失败。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="privacy-settings-card">
      <p>私密物品会从“找东西”、普通列表、统计和榜单隐藏。解锁状态保留 10 分钟。</p>
      <form className="form-stack" onSubmit={savePin}>
        {configured ? (
          <label className="field">
            <span>当前密码</span>
            <input
              type="password"
              inputMode="numeric"
              value={currentPin}
              onChange={(event) => setCurrentPin(event.target.value)}
              required
            />
          </label>
        ) : null}
        <div className="field-grid">
          <label className="field">
            <span>{configured ? "新密码" : "设置密码"}</span>
            <input
              type="password"
              inputMode="numeric"
              value={newPin}
              onChange={(event) => setNewPin(event.target.value)}
              minLength={4}
              maxLength={12}
              required
            />
          </label>
          <label className="field">
            <span>再次输入</span>
            <input
              type="password"
              inputMode="numeric"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              minLength={4}
              maxLength={12}
              required
            />
          </label>
        </div>
        <button className="primary-button" type="submit" disabled={busy}>
          {configured ? "更新私密密码" : "启用私密库存"}
        </button>
      </form>
      {configured ? (
        <div className="gesture-settings">
          <div>
            <strong>{hasPrivacyPattern() ? "更新手势解锁" : "设置手势解锁"}</strong>
            <small>先在上方输入当前密码，再连续绘制两次相同图案。</small>
          </div>
          <GesturePatternInput onComplete={savePattern} disabled={busy} />
        </div>
      ) : null}
      {configured && deviceAvailable ? (
        <button className="secondary-button" type="button" onClick={enrollDevice} disabled={busy}>
          {hasDeviceAuthentication() ? "重新设置设备验证" : "启用生物识别 / 设备验证"}
        </button>
      ) : null}
      {message ? <p className="form-message" role="status">{message}</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}
