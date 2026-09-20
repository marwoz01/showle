import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), clear: vi.fn(), export: vi.fn(), limit: vi.fn(), webhook: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@clerk/nextjs/webhooks", () => ({ verifyWebhook: mocks.webhook }));
vi.mock("@/lib/account-data", () => ({ clearAccountData: mocks.clear, exportAccountData: mocks.export }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mocks.limit }));
vi.mock("@/lib/server-error", () => ({ reportServerError: () => "safe-id" }));
import { GET, DELETE } from "@/app/api/user/data/route";
import { POST as webhook } from "@/app/api/webhooks/clerk/route";
const remove = (origin = "https://showle.example", body: unknown = { confirm: "clear-my-showle-data", userId: "user_victim" }) =>
  new NextRequest("https://showle.example/api/user/data", { method: "DELETE", headers: { origin }, body: JSON.stringify(body) });
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", "test-signing-secret");
  mocks.auth.mockResolvedValue({ userId: "user_owner" }); mocks.limit.mockResolvedValue({ success: true });
  mocks.export.mockResolvedValue({ version: 1 }); mocks.webhook.mockResolvedValue({ type: "user.deleted", data: { id: "user_owner" } });
});
describe("account endpoints", () => {
  it("requires authentication for downloads and erasure", async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    expect((await GET(remove())).status).toBe(401); expect((await DELETE(remove())).status).toBe(401);
    expect(mocks.clear).not.toHaveBeenCalled(); expect(mocks.export).not.toHaveBeenCalled();
  });
  it("downloads only the authenticated scope with no shared cache", async () => {
    const response = await GET(remove());
    expect(mocks.export).toHaveBeenCalledWith("user_owner");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("content-disposition")).toContain("attachment");
  });
  it("requires same-origin intent and explicit confirmation", async () => {
    expect((await DELETE(remove("https://other.example"))).status).toBe(403);
    expect((await DELETE(remove("null"))).status).toBe(403);
    expect((await DELETE(remove("https://showle.example", {}))).status).toBe(400);
    expect(mocks.clear).not.toHaveBeenCalled();
  });
  it("ignores claimed owners and only acknowledges a committed erase", async () => {
    expect((await DELETE(remove())).status).toBe(200);
    expect(mocks.clear).toHaveBeenCalledWith("user_owner");
    mocks.clear.mockRejectedValue(new Error("database"));
    expect((await DELETE(remove())).status).toBe(503);
  });
  it("rejects unverified account deletion notifications without touching data", async () => {
    mocks.webhook.mockRejectedValue(new Error("signature"));
    expect((await webhook(remove())).status).toBe(400);
    expect(mocks.clear).not.toHaveBeenCalled();
  });
  it("asks the provider to retry incomplete account cleanup", async () => {
    mocks.clear.mockRejectedValue(new Error("database"));
    expect((await webhook(remove())).status).toBe(503);
    expect(mocks.clear).toHaveBeenCalledWith("user_owner", true);
  });
  it("does not process events when the signing secret is missing", async () => {
    vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", "");
    expect((await webhook(remove())).status).toBe(503);
    expect(mocks.webhook).not.toHaveBeenCalled();
  });
  it("ignores unrelated verified events", async () => {
    mocks.webhook.mockResolvedValue({ type: "user.updated", data: { id: "user_owner" } });
    expect((await webhook(remove())).status).toBe(200);
    expect(mocks.clear).not.toHaveBeenCalled();
  });
});
