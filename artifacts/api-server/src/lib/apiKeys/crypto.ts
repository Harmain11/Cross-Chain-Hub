import { randomBytes, createHash } from "node:crypto";

const KEY_PREFIX = "af_live_";

/** Generates a new plaintext API key and its SHA-256 hash for storage. */
export function generateApiKey() {
  const secret = randomBytes(24).toString("base64url");
  const fullKey = `${KEY_PREFIX}${secret}`;
  return {
    fullKey,
    keyHash: hashApiKey(fullKey),
    keyPrefix: fullKey.slice(0, KEY_PREFIX.length + 6),
  };
}

export function hashApiKey(fullKey: string): string {
  return createHash("sha256").update(fullKey).digest("hex");
}

export function looksLikeApiKey(value: string): boolean {
  return value.startsWith(KEY_PREFIX);
}
