import { afterEach, describe, expect, it, vi } from "vitest";
import { createCipheriv, createHash } from "node:crypto";
vi.mock("server-only", () => ({}));
import { openHigherLowerRun, sealHigherLowerRun } from "@/lib/higher-lower-session";
import type { HigherLowerRun } from "@/lib/higher-lower";

const run: HigherLowerRun = {
  version: 2, catalogVersion: "example", expiresAt: Date.now() + 1000,
  round: 1, score: 0, status: "guessing", outcome: null,
  leftId: 1, rightId: 2, seenIds: [1, 2], recentIds: [1, 2],
};
afterEach(() => vi.unstubAllEnvs());

describe("higher/lower session encryption", () => {
  it("round-trips authenticated data without exposing plaintext and uses random nonces", () => {
    vi.stubEnv("HIGHER_LOWER_SECRET", "test-only-secret-higher-lower");
    const one = sealHigherLowerRun(run);
    const two = sealHigherLowerRun(run);
    expect(openHigherLowerRun(one)).toEqual(run);
    expect(openHigherLowerRun(two)).toEqual(run);
    expect(one).not.toBe(two);
    expect(Buffer.from(one, "base64url").toString("utf8")).not.toContain("rightId");
  });

  it("rejects tampering with the nonce, tag or ciphertext and malformed encodings", () => {
    vi.stubEnv("HIGHER_LOWER_SECRET", "test-only-secret-higher-lower");
    const token = sealHigherLowerRun(run);
    for (const offset of [0, 12, 28]) {
      const bytes = Buffer.from(token, "base64url");
      bytes[offset] ^= 1;
      expect(() => openHigherLowerRun(bytes.toString("base64url"))).toThrow("invalid_session");
    }
    for (const invalid of ["", "abc", `${token}=`, "!".repeat(40), "x".repeat(32001)]) {
      expect(() => openHigherLowerRun(invalid)).toThrow("invalid_session");
    }
    vi.stubEnv("HIGHER_LOWER_SECRET", "a-different-secret");
    expect(() => openHigherLowerRun(token)).toThrow("invalid_session");
  });

  it("rejects previously issued runtime-game tokens even with the same secret", () => {
    const secret = "test-only-secret-higher-lower";
    vi.stubEnv("HIGHER_LOWER_SECRET", secret);
    const context = Buffer.from("showle:higher-lower:runtime:v1");
    const key = createHash("sha256").update(context).update("\0").update(secret).digest();
    const iv = Buffer.alloc(12, 1);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(context);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify({ ...run, version: 1 }), "utf8"), cipher.final()]);
    const previousToken = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
    expect(() => openHigherLowerRun(previousToken)).toThrow("invalid_session");
  });

  it("fails closed without a production secret and supports the existing Clerk secret", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("HIGHER_LOWER_SECRET", "");
    vi.stubEnv("CLERK_SECRET_KEY", "");
    expect(() => sealHigherLowerRun(run)).toThrow("game_unavailable");
    expect(() => openHigherLowerRun("abc")).toThrow("game_unavailable");
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_only_fixture");
    expect(openHigherLowerRun(sealHigherLowerRun(run))).toEqual(run);
  });

  it("uses a process-local development key when no secret is configured", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("HIGHER_LOWER_SECRET", "");
    vi.stubEnv("CLERK_SECRET_KEY", "");
    expect(openHigherLowerRun(sealHigherLowerRun(run))).toEqual(run);
  });
});
