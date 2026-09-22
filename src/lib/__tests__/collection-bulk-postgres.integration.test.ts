import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { connect, type Socket } from "node:net";
import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Explicit opt-in, fixed loopback target: never reads DATABASE_URL or .env files.
const LOCAL_URL = "postgresql://showle_security@127.0.0.1:55439/showle_security_fix";
const enabled = Boolean(process.env.SHOWLE_COLLECTION_PG_URL);
const schema = `collection_bulk_it_${randomUUID().replaceAll("-", "")}`;
const harness = vi.hoisted(() => ({ client: undefined as PrismaClient | undefined }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  $transaction: (callback: (tx: Prisma.TransactionClient) => Promise<unknown>, options: { isolationLevel: Prisma.TransactionIsolationLevel; timeout: number }) => harness.client!.$transaction(callback, options),
} }));
import { addCollectionMovies, parseCollectionBulkInput, undoCollectionMovies } from "@/lib/collection-bulk";

// Keep the real Prisma client, Neon adapter, SQL generation and PG protocol.
// Only the WebSocket transport is replaced with a socket to the local cluster.
class LoopbackTransport extends EventEmitter {
  readyState = 0;
  binaryType = "arraybuffer";
  private socket: Socket;
  constructor(url: string) {
    super();
    if (url !== "ws://127.0.0.1:55439") throw new Error("Only the isolated loopback PostgreSQL is allowed");
    this.socket = connect({ host: "127.0.0.1", port: 55439 });
    this.socket.on("connect", () => { this.readyState = 1; this.emit("open"); });
    this.socket.on("data", (data) => this.emit("message", { data }));
    this.socket.on("error", (error) => this.emit("error", error));
    this.socket.on("close", () => { this.readyState = 3; this.emit("close"); });
  }
  addEventListener(event: string, listener: (...args: unknown[]) => void) { this.on(event, listener); }
  send(data: Uint8Array) { this.socket.write(data); }
  close() { this.socket.end(); }
}

describe.skipIf(!enabled)("collection bulk persistence on isolated PostgreSQL", () => {
  let schemaCreated = false;
  const config = {
    webSocketConstructor: neonConfig.webSocketConstructor,
    wsProxy: neonConfig.wsProxy,
    useSecureWebSocket: neonConfig.useSecureWebSocket,
    pipelineConnect: neonConfig.pipelineConnect,
  };

  beforeAll(async () => {
    if (process.env.SHOWLE_COLLECTION_PG_URL !== LOCAL_URL) throw new Error("Use only the explicit isolated local test URL");
    vi.stubEnv("CLERK_SECRET_KEY", "local-collection-integration-signing-key");
    neonConfig.webSocketConstructor = LoopbackTransport;
    neonConfig.wsProxy = (host, port) => {
      if (host !== "127.0.0.1" || String(port) !== "55439") throw new Error("Unexpected PostgreSQL target");
      return "127.0.0.1:55439";
    };
    neonConfig.useSecureWebSocket = false;
    neonConfig.pipelineConnect = false;
    harness.client = new PrismaClient({ adapter: new PrismaNeon({ connectionString: LOCAL_URL, connectionTimeoutMillis: 3000 }, { schema }) });
    const identity = await harness.client.$queryRaw<{ database: string; role: string }[]>`SELECT current_database()::text AS database, current_user::text AS role`;
    expect(identity).toEqual([{ database: "showle_security_fix", role: "showle_security" }]);
    expect(schema).toMatch(/^collection_bulk_it_[a-f0-9]{32}$/);
    await harness.client.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    schemaCreated = true;
    await harness.client.$executeRawUnsafe(`CREATE TABLE "${schema}"."SavedMovie" (
      "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "tmdbId" INTEGER NOT NULL,
      "title" TEXT NOT NULL, "year" INTEGER NOT NULL, "posterPath" TEXT NOT NULL,
      "genres" TEXT[] NOT NULL, "director" TEXT NOT NULL DEFAULT '', "overview" TEXT NOT NULL DEFAULT '',
      "runtime" INTEGER NOT NULL DEFAULT 0, "tmdbRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "category" TEXT NOT NULL, "rating" DOUBLE PRECISION, "review" TEXT,
      "watchedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL, UNIQUE ("userId", "tmdbId")
    )`);
  }, 20_000);

  afterAll(async () => {
    try {
      if (schemaCreated) await harness.client!.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    } finally {
      await harness.client?.$disconnect();
      Object.assign(neonConfig, config);
      vi.unstubAllEnvs();
    }
  });

  beforeEach(async () => { await harness.client!.savedMovie.deleteMany(); });

  function input(category: "watched" | "watchlist", ...ids: number[]) {
    return parseCollectionBulkInput({ category, movies: ids.map((tmdbId) => ({ tmdbId, title: `Incoming ${tmdbId}` })) });
  }
  async function seed(tmdbId: number, category: "watched" | "watchlist", userId = "viewer") {
    return harness.client!.savedMovie.create({ data: {
      userId, tmdbId, title: `Saved ${tmdbId}`, year: 2001, posterPath: "/original.jpg", genres: ["Drama"],
      director: "Original director", overview: "Original description", runtime: 120, tmdbRating: 7.8,
      category, rating: 8.5, review: "Original review", watchedAt: category === "watched" ? new Date("2025-05-01T12:00:00.123Z") : null,
    } });
  }

  it("persists exact receipt timestamps and undoes mixed new, moved and unchanged movies", async () => {
    const same = await seed(1, "watched");
    const moved = await seed(2, "watchlist");
    const other = await seed(3, "watched", "other-viewer");
    const result = await addCollectionMovies("viewer", input("watched", 1, 2, 3));
    const rows = await harness.client!.savedMovie.findMany({ where: { userId: "viewer" } });
    expect(rows).toHaveLength(3);
    expect(rows.find((row) => row.tmdbId === 1)).toEqual(same);
    expect(rows.find((row) => row.tmdbId === 2)).toMatchObject({ title: moved.title, rating: 8.5, review: "Original review", category: "watched" });
    const receipt = JSON.parse(Buffer.from(result.undoToken.split(".")[0], "base64url").toString()) as { changes: { id: string; updatedAt: string }[] };
    expect(receipt.changes).toHaveLength(2);
    for (const change of receipt.changes) expect(change.updatedAt).toBe(rows.find((row) => row.id === change.id)!.updatedAt.toISOString());
    await undoCollectionMovies("viewer", { undoToken: result.undoToken });
    const restored = await harness.client!.savedMovie.findMany();
    expect(restored).toHaveLength(3);
    expect(restored.find((row) => row.id === same.id)).toEqual(same);
    expect(restored.find((row) => row.id === other.id)).toEqual(other);
    expect(restored.find((row) => row.id === moved.id)).toMatchObject({ category: "watchlist", watchedAt: null, rating: 8.5, review: "Original review", title: moved.title });
  });

  it("rolls back earlier undo deletions when a later movie has a newer rating", async () => {
    const before = await seed(2, "watched");
    const result = await addCollectionMovies("viewer", input("watchlist", 1, 2));
    const moved = await harness.client!.savedMovie.findUniqueOrThrow({ where: { id: before.id } });
    await harness.client!.savedMovie.update({ where: { id: before.id }, data: { rating: 10, updatedAt: new Date(moved.updatedAt.getTime() + 5) } });
    await expect(undoCollectionMovies("viewer", { undoToken: result.undoToken })).rejects.toMatchObject({ status: 409 });
    expect(await harness.client!.savedMovie.count({ where: { userId: "viewer" } })).toBe(2);
    expect(await harness.client!.savedMovie.findUnique({ where: { id: before.id } })).toMatchObject({ rating: 10, category: "watchlist", watchedAt: before.watchedAt, review: before.review });
  });

  it("restores an existing watch date without deleting the existing film", async () => {
    const before = await seed(1, "watched");
    const result = await addCollectionMovies("viewer", input("watchlist", 1));
    await undoCollectionMovies("viewer", { undoToken: result.undoToken });
    expect(await harness.client!.savedMovie.findUnique({ where: { id: before.id } })).toMatchObject({ category: "watched", watchedAt: before.watchedAt, rating: before.rating, review: before.review });
  });
});
