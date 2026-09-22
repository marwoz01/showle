import { describe, expect, it } from "vitest";
import { friendSlug } from "@/components/profile/social/social-client";

describe("friend invitation links", () => {
  const origin = "http://localhost:3000";
  const code = "123abc456def789abc012def";
  it("accepts a code and a current-origin invitation", () => {
    expect(friendSlug(`  ${code}  `, origin)).toBe(code);
    expect(friendSlug(`${origin}/profile?invite=${code}`, origin)).toBe(code);
    expect(friendSlug(`/profile?invite=${code}`, origin)).toBe(code);
  });
  it("accepts Showle public-profile URLs and deployed invitations", () => {
    expect(friendSlug(`https://showle.vercel.app/u/${code}#compare`, origin)).toBe(code);
    expect(friendSlug(`https://showle.vercel.app/profile?invite=${code}`, origin)).toBe(code);
    expect(friendSlug(`/u/${code}/`, origin)).toBe(code);
  });
  it("rejects lookalike origins, injected paths and invalid identifiers", () => {
    for (const input of [
      `https://showle.vercel.app.evil.test/u/${code}`,
      `https://evil.test/profile?invite=${code}`,
      `javascript:alert(1)`, `/u/${code}/unrelated`,
      "/profile?invite=%2Fsecret", "ab", "A".repeat(24), "a".repeat(65),
    ]) expect(friendSlug(input, origin)).toBeNull();
  });
});
