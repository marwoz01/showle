import { afterEach, describe, expect, it, vi } from "vitest";
import { createCollectionStatusStore } from "@/lib/collection-status";
import { collectionRequest } from "@/lib/collection-client";
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe("collection browser status batching", () => {
  it("combines card lookups, including unknown and older saved films", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ items: [{ tmdbId: 70, category: "watchlist" }] })));
    const store = createCollectionStatusStore(fetcher);
    store.load(70); store.load(80); store.load(70);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][0]).toBe("/api/collection/status?ids=70,80");
    expect(store.get(70)).toBe("watchlist"); expect(store.get(80)).toBeNull();
    store.stop();
  });
  it("does not overwrite a confirmed save with an older lookup response", async () => {
    vi.useFakeTimers();
    let finish!: (response: Response) => void;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const store = createCollectionStatusStore(fetcher);
    store.load(42); await vi.advanceTimersByTimeAsync(1);
    store.set(42, "watched");
    finish(new Response(JSON.stringify({ items: [] })));
    await vi.advanceTimersByTimeAsync(1);
    expect(store.get(42)).toBe("watched");
    store.stop();
  });
  it("isolates accounts and can retry a failed lookup", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [] })));
    const owner = createCollectionStatusStore(fetcher);
    const other = createCollectionStatusStore(fetcher);
    owner.load(42); await vi.advanceTimersByTimeAsync(1);
    expect(owner.get(42)).toBe("error");
    owner.load(42, true); await vi.advanceTimersByTimeAsync(1);
    expect(owner.get(42)).toBeNull();
    owner.set(42, "watched"); expect(other.get(42)).toBe("loading");
    owner.stop(); other.stop();
  });
  it("restarts interrupted subscribed loads after an effect remount", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ items: [] })));
    const store = createCollectionStatusStore(fetcher);
    store.subscribe(42, () => {}); store.load(42); store.stop(); store.start();
    await vi.advanceTimersByTimeAsync(1);
    expect(store.get(42)).toBeNull();
    store.stop();
  });
  it.each([401, 429, 500])("rejects an HTTP %i response instead of treating it as a save", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status })));
    await expect(collectionRequest("/api/collection", { method: "POST" })).rejects.toThrow();
  });
});
