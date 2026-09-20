import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { HIGHER_LOWER_MAX_TOKEN_LENGTH, HigherLowerError } from "@/lib/higher-lower";
import type { HigherLowerRun } from "@/lib/higher-lower";

const TOKEN_CONTEXT = Buffer.from("showle:higher-lower:release-year:v2");
let developmentKey: Buffer | undefined;

function getKey(): Buffer {
  const secret = process.env.HIGHER_LOWER_SECRET?.trim() || process.env.CLERK_SECRET_KEY?.trim();
  if (secret) return createHash("sha256").update(TOKEN_CONTEXT).update("\0").update(secret).digest();
  if (process.env.NODE_ENV === "production") throw new HigherLowerError("game_unavailable");
  // Local sessions intentionally expire on a dev process restart, never a shared default key.
  developmentKey ??= randomBytes(32);
  return developmentKey;
}

/** Confidential and authenticated, but stateless: old tokens can be replayed.
 * This is a casual run with a local personal best, not a competitive score proof.
 */
export function sealHigherLowerRun(run: HigherLowerRun): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  cipher.setAAD(TOKEN_CONTEXT);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(run), "utf8"), cipher.final()]);
  const token = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
  if (token.length > HIGHER_LOWER_MAX_TOKEN_LENGTH) throw new HigherLowerError("game_unavailable");
  return token;
}

export function openHigherLowerRun(token: string): unknown {
  const key = getKey();
  if (!token.length || token.length > HIGHER_LOWER_MAX_TOKEN_LENGTH || !/^[A-Za-z0-9_-]+$/.test(token)) {
    throw new HigherLowerError("invalid_session");
  }
  try {
    const bytes = Buffer.from(token, "base64url");
    if (bytes.length <= 28 || bytes.toString("base64url") !== token) throw new Error("invalid_encoding");
    const decipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
    decipher.setAAD(TOKEN_CONTEXT);
    decipher.setAuthTag(bytes.subarray(12, 28));
    const plaintext = Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]);
    return JSON.parse(plaintext.toString("utf8"));
  } catch {
    throw new HigherLowerError("invalid_session");
  }
}
