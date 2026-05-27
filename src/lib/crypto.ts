import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  // Detailed config errors in dev; generic in production so users never see internals.
  const dev = process.env.NODE_ENV !== "production";
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(dev ? "ENCRYPTION_KEY env var is required for BYOK" : "Secure key storage is not configured.");
  }

  const trimmed = key.trim();
  const parsed = /^[a-f0-9]{64}$/i.test(trimmed)
    ? Buffer.from(trimmed, "hex")
    : Buffer.from(trimmed, "base64");

  if (parsed.length !== 32) {
    throw new Error(dev ? "ENCRYPTION_KEY must be 32 bytes encoded as 64 hex chars or base64." : "Secure key storage is misconfigured.");
  }

  return parsed;
}

export function encrypt(plaintext: string): {
  encrypted: string;
  iv: string;
  authTag: string;
} {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag,
  };
}

export function decrypt(encrypted: string, iv: string, authTag: string): string {
  const key = getEncryptionKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return `${key.slice(0, 7)}...${key.slice(-4)}`;
}
