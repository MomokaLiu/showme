import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  authenticateWithDevice,
  canUseDeviceAuthentication,
  configurePrivacyPin,
  hasDeviceAuthentication,
  hasPrivacyPin,
  hasPrivacyPattern,
  isPrivateSessionUnlocked,
  PRIVACY_SESSION_EVENT,
  unlockPrivateSession,
  verifyPrivacyPin,
  verifyPrivacyPattern,
} from "../services/privacyService";
import { GesturePatternInput } from "./GesturePatternInput";

type PrivacyGateProps = {
  children: ReactNode;
  lockedPreview?: ReactNode;
};

export function PrivacyGate({ children, lockedPreview }: PrivacyGateProps) {
  const [unlocked, setUnlocked] = useState(() => isPrivateSessionUnlocked());
  const [hasPin, setHasPin] = useState(() => hasPrivacyPin());
  const [deviceAvailable, setDeviceAvailable] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [usePattern, setUsePattern] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const syncSession = () => setUnlocked(isPrivateSessionUnlocked());
    window.addEventListener(PRIVACY_SESSION_EVENT, syncSession);
    void canUseDeviceAuthentication().then(setDeviceAvailable);
    return () => window.removeEventListener(PRIVACY_SESSION_EVENT, syncSession);
  }, []);

  if (unlocked) return <>{children}</>;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (!hasPin) {
        if (pin !== confirmation) throw new Error("两次输入的密码不一致。");
        await configurePrivacyPin(pin);
        setHasPin(true);
      } else if (!(await verifyPrivacyPin(pin))) {
        throw new Error("密码不正确。");
      }
      unlockPrivateSession();
      setUnlocked(true);
      setPin("");
      setConfirmation("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "验证失败，请重试。");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeviceAuthentication() {
    setError("");
    setBusy(true);
    const success = await authenticateWithDevice();
    setBusy(false);
    if (success) setUnlocked(true);
    else setError("设备验证未完成，请使用密码进入。");
  }

  async function handlePattern(pattern: string) {
    setError("");
    setBusy(true);
    if (await verifyPrivacyPattern(pattern)) {
      unlockPrivateSession();
      setUnlocked(true);
    } else {
      setError("手势图案不正确，请重试。");
    }
    setBusy(false);
  }

  return (
    <div className="page-stack">
      {lockedPreview}
      <section className="privacy-gate">
        <span className="privacy-gate__icon" aria-hidden="true">🔒</span>
        <h2>{hasPin ? "验证后查看私密物品" : "设置私密库存密码"}</h2>
        <p>
          {hasPin
            ? "验证状态会保留 10 分钟，离开设备前可随时手动锁定。"
            : "设置 4–12 位数字密码。密码只保存在当前设备，不会随库存同步。"}
        </p>
        {hasPin && hasPrivacyPattern() ? (
          <div className="privacy-auth-switch">
            <button type="button" className={!usePattern ? "is-active" : ""} onClick={() => setUsePattern(false)}>
              密码
            </button>
            <button type="button" className={usePattern ? "is-active" : ""} onClick={() => setUsePattern(true)}>
              手势
            </button>
          </div>
        ) : null}
        {usePattern ? (
          <GesturePatternInput onComplete={handlePattern} disabled={busy} />
        ) : (
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>{hasPin ? "私密库存密码" : "设置数字密码"}</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete={hasPin ? "current-password" : "new-password"}
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              minLength={4}
              maxLength={12}
              required
            />
          </label>
          {!hasPin ? (
            <label className="field">
              <span>再次输入</span>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                minLength={4}
                maxLength={12}
                required
              />
            </label>
          ) : null}
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "正在验证..." : hasPin ? "验证并进入" : "启用私密库存"}
          </button>
        </form>
        )}
        {hasPin && deviceAvailable && hasDeviceAuthentication() ? (
          <button className="secondary-button privacy-gate__device" type="button" onClick={handleDeviceAuthentication} disabled={busy}>
            使用生物识别或设备验证
          </button>
        ) : null}
      </section>
    </div>
  );
}
