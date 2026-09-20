import { afterEach, describe, expect, it, vi } from "vitest";
import { requestIp } from "@/lib/request-ip";
afterEach(() => vi.unstubAllEnvs());
const request = (ip: string) => new Request("https://showle.test", { headers: { "x-forwarded-for": ip } });

describe("trusted proxy address", () => {
  it("ignores client-supplied headers unless proxy trust is configured", () => {
    vi.stubEnv("VERCEL", ""); vi.stubEnv("TRUSTED_PROXY", "");
    expect(requestIp(request("203.0.113.4"))).toBe("unknown");
  });
  it.each(["203.0.113.4, 198.51.100.1", "garbage", "::1%eth0", "127.0.0.1:4000", ""])('rejects malformed or ambiguous forwarding: %s', (ip) => {
    vi.stubEnv("VERCEL", "1");
    expect(requestIp(request(ip))).toBe("unknown");
  });
  it("accepts a proxy-replaced single address and canonicalizes IPv6 budgets", () => {
    vi.stubEnv("TRUSTED_PROXY", "forwarded");
    expect(requestIp(request("203.0.113.4"))).toBe("203.0.113.4");
    expect(requestIp(request("2001:0DB8:0000:0000:0000:0000:0000:0001"))).toBe("2001:db8::1");
  });
});
