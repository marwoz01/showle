import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const fetchMock = vi.fn();
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { vi.unstubAllGlobals(); });
describe("embedding cache and failure budget", () => {
  it("caches valid vectors and bounds input", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ embedding: { values: Array(1536).fill(0.1) } })));
    const { getEmbedding } = await import("@/lib/recommend-embedding");
    await getEmbedding("x".repeat(2500));
    await getEmbedding("x".repeat(2500));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body).content.parts[0].text).toHaveLength(2000);
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });
  it.each([[], Array(1536).fill(0), [1, 2, 3]].map((values) => [values]))("rejects malformed or zero vectors %#", async (values) => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ embedding: { values } })));
    const { getEmbedding } = await import("@/lib/recommend-embedding");
    await expect(getEmbedding("test")).rejects.toThrow("invalid_embedding");
  });
  it("does not keep calling an exhausted provider within Retry-After", async () => {
    fetchMock.mockResolvedValue(new Response("limited", { status: 429, headers: { "Retry-After": "120" } }));
    const { getEmbedding } = await import("@/lib/recommend-embedding");
    await expect(getEmbedding("first")).rejects.toThrow("embedding_429");
    await expect(getEmbedding("second")).rejects.toThrow("embedding_cooldown");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
