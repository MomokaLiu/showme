const PIN_STORAGE_KEY = "buwangwu.privacyPin";
const PATTERN_STORAGE_KEY = "buwangwu.privacyPattern";
const CREDENTIAL_STORAGE_KEY = "buwangwu.privacyCredential";
const SESSION_STORAGE_KEY = "buwangwu.privateSessionUntil";
const SESSION_DURATION_MS = 10 * 60 * 1000;
const PBKDF2_ITERATIONS = 120_000;
export const PRIVACY_SESSION_EVENT = "buwangwu:privacy-session";

type PinRecord = {
  salt: string;
  hash: string;
  iterations: number;
};

export function hasPrivacyPin(storage: Pick<Storage, "getItem"> = window.localStorage): boolean {
  return Boolean(storage.getItem(PIN_STORAGE_KEY));
}

export async function configurePrivacyPin(
  pin: string,
  storage: Pick<Storage, "setItem"> = window.localStorage,
): Promise<void> {
  validatePin(pin);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePinHash(pin, salt, PBKDF2_ITERATIONS);
  const record: PinRecord = {
    salt: bytesToBase64(salt),
    hash: bytesToBase64(hash),
    iterations: PBKDF2_ITERATIONS,
  };
  storage.setItem(PIN_STORAGE_KEY, JSON.stringify(record));
}

export async function verifyPrivacyPin(
  pin: string,
  storage: Pick<Storage, "getItem"> = window.localStorage,
): Promise<boolean> {
  const raw = storage.getItem(PIN_STORAGE_KEY);
  if (!raw) return false;
  try {
    const record = JSON.parse(raw) as PinRecord;
    const actual = await derivePinHash(pin, base64ToBytes(record.salt), record.iterations);
    return timingSafeEqual(actual, base64ToBytes(record.hash));
  } catch {
    return false;
  }
}

export function hasPrivacyPattern(storage: Pick<Storage, "getItem"> = window.localStorage): boolean {
  return Boolean(storage.getItem(PATTERN_STORAGE_KEY));
}

export async function configurePrivacyPattern(
  pattern: string,
  storage: Pick<Storage, "setItem"> = window.localStorage,
): Promise<void> {
  validatePattern(pattern);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePinHash(pattern, salt, PBKDF2_ITERATIONS);
  const record: PinRecord = {
    salt: bytesToBase64(salt),
    hash: bytesToBase64(hash),
    iterations: PBKDF2_ITERATIONS,
  };
  storage.setItem(PATTERN_STORAGE_KEY, JSON.stringify(record));
}

export async function verifyPrivacyPattern(
  pattern: string,
  storage: Pick<Storage, "getItem"> = window.localStorage,
): Promise<boolean> {
  const raw = storage.getItem(PATTERN_STORAGE_KEY);
  if (!raw) return false;
  try {
    const record = JSON.parse(raw) as PinRecord;
    const actual = await derivePinHash(pattern, base64ToBytes(record.salt), record.iterations);
    return timingSafeEqual(actual, base64ToBytes(record.hash));
  } catch {
    return false;
  }
}

export function isPrivateSessionUnlocked(
  now = Date.now(),
  storage: Pick<Storage, "getItem"> = window.sessionStorage,
): boolean {
  const expiresAt = Number(storage.getItem(SESSION_STORAGE_KEY));
  return Number.isFinite(expiresAt) && expiresAt > now;
}

export function unlockPrivateSession(
  now = Date.now(),
  storage: Pick<Storage, "setItem"> = window.sessionStorage,
) {
  storage.setItem(SESSION_STORAGE_KEY, String(now + SESSION_DURATION_MS));
  window.dispatchEvent(new Event(PRIVACY_SESSION_EVENT));
}

export function lockPrivateSession(storage: Pick<Storage, "removeItem"> = window.sessionStorage) {
  storage.removeItem(SESSION_STORAGE_KEY);
  window.dispatchEvent(new Event(PRIVACY_SESSION_EVENT));
}

export async function canUseDeviceAuthentication(): Promise<boolean> {
  if (
    typeof window === "undefined" ||
    !window.isSecureContext ||
    !("PublicKeyCredential" in window) ||
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== "function"
  ) {
    return false;
  }
  return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false);
}

export function hasDeviceAuthentication(
  storage: Pick<Storage, "getItem"> = window.localStorage,
): boolean {
  return Boolean(storage.getItem(CREDENTIAL_STORAGE_KEY));
}

export async function enrollDeviceAuthentication(): Promise<void> {
  if (!(await canUseDeviceAuthentication())) throw new Error("当前设备或环境不支持生物识别/设备验证。");
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "不忘物" },
      user: { id: userId, name: "private-inventory", displayName: "私密库存" },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "preferred",
        userVerification: "required",
      },
      timeout: 60_000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error("设备验证设置未完成。");
  window.localStorage.setItem(CREDENTIAL_STORAGE_KEY, bytesToBase64(new Uint8Array(credential.rawId)));
}

export async function authenticateWithDevice(): Promise<boolean> {
  const encodedCredentialId = window.localStorage.getItem(CREDENTIAL_STORAGE_KEY);
  if (!encodedCredentialId || !(await canUseDeviceAuthentication())) return false;
  try {
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [
          {
            id: toArrayBuffer(base64ToBytes(encodedCredentialId)),
            type: "public-key",
            transports: ["internal"],
          },
        ],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    if (!credential) return false;
    unlockPrivateSession();
    return true;
  } catch {
    return false;
  }
}

async function derivePinHash(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

function validatePin(pin: string) {
  if (!/^\d{4,12}$/.test(pin)) throw new Error("请设置 4–12 位数字密码。");
}

function validatePattern(pattern: string) {
  if (!/^[1-9]{4,9}$/.test(pattern) || new Set(pattern).size !== pattern.length) {
    throw new Error("手势图案需要连接 4–9 个不重复的点。");
  }
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}
