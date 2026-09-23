import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { connect, type Socket } from "node:net";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Explicit opt-in, loopback-only target; application environment files are never read.
const LOCAL_URL = "postgresql://showle_security@127.0.0.1:55439/showle_security_fix";
const enabled = Boolean(process.env.SHOWLE_PROFILE_PG_URL);
const schema = `user_profile_it_${randomUUID().replaceAll("-", "")}`;
const harness = vi.hoisted(() => ({ client: undefined as PrismaClient | undefined }));
vi.mock("@/lib/prisma", () => ({ prisma: new Proxy({}, { get: (_target, key) => {
  const value = harness.client?.[key as keyof PrismaClient];
  return typeof value === "function" ? value.bind(harness.client) : value;
} }) }));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: "viewer" }), currentUser: async () => ({ id: "viewer", username: "Test viewer", imageUrl: null }) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: () => ({ success: true }) }));
vi.mock("@/lib/tmdb", () => ({ getMovieDetails: () => { throw new Error("No external movie calls in isolated tests"); } }));
import { PATCH as updateProfile } from "@/app/api/profile/route";
import { PATCH as updatePreferences } from "@/app/api/profile/preferences/route";
import { DELETE } from "@/app/api/profile/data/route";
import { exportProfileData } from "@/lib/user-profile-data";
import { getOrCreateUserProfile } from "@/lib/user-profile";
import { socialPostgresCases } from "@/lib/__tests__/social-postgres.cases";
import { gemsPostgresCases } from "@/lib/__tests__/gems-postgres.cases";

// Real Prisma SQL, transactions and PostgreSQL protocol; replace only WebSocket transport.
class LoopbackTransport extends EventEmitter {
  readyState = 0;
  binaryType = "arraybuffer";
  private socket: Socket;
  constructor(url: string) {
    super();
    if (url !== "ws://127.0.0.1:55439") throw new Error("Only isolated loopback PostgreSQL is allowed");
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

const baseline = `
CREATE TABLE "SavedMovie" (id TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "tmdbId" INTEGER NOT NULL, title TEXT NOT NULL, year INTEGER NOT NULL, "posterPath" TEXT NOT NULL, genres TEXT[] NOT NULL, director TEXT NOT NULL DEFAULT '', overview TEXT NOT NULL DEFAULT '', runtime INTEGER NOT NULL DEFAULT 0, "tmdbRating" DOUBLE PRECISION NOT NULL DEFAULT 0, category TEXT NOT NULL, rating DOUBLE PRECISION, review TEXT, "watchedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, UNIQUE("userId", "tmdbId"));
CREATE TABLE "RankedList" (id TEXT PRIMARY KEY, "userId" TEXT NOT NULL, name TEXT NOT NULL, description TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "RankedListItem" (id TEXT PRIMARY KEY, "listId" TEXT NOT NULL REFERENCES "RankedList"(id) ON DELETE CASCADE, "tmdbId" INTEGER NOT NULL, title TEXT NOT NULL, year INTEGER NOT NULL, "posterPath" TEXT NOT NULL, genres TEXT[] NOT NULL, director TEXT NOT NULL DEFAULT '', overview TEXT NOT NULL DEFAULT '', position INTEGER NOT NULL, UNIQUE("listId", "tmdbId"));
CREATE TABLE "GameResult" (id TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "dateKey" TEXT NOT NULL, mode TEXT NOT NULL DEFAULT 'daily-movie', status TEXT NOT NULL, "guessIds" INTEGER[] NOT NULL, "attemptCount" INTEGER NOT NULL, "hintsUsed" INTEGER NOT NULL, "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "targetMovieId" INTEGER NOT NULL DEFAULT 0, "targetTitle" TEXT NOT NULL DEFAULT '', "targetYear" INTEGER NOT NULL DEFAULT 0, "targetPoster" TEXT NOT NULL DEFAULT '', "extraAttempts" INTEGER NOT NULL DEFAULT 0, "paidHintUsed" BOOLEAN NOT NULL DEFAULT false, "paidHintsCount" INTEGER NOT NULL DEFAULT 0, UNIQUE("userId", "dateKey", mode));
CREATE TABLE "UserStats" (id TEXT PRIMARY KEY, "userId" TEXT NOT NULL UNIQUE, "gamesPlayed" INTEGER NOT NULL DEFAULT 0, "gamesWon" INTEGER NOT NULL DEFAULT 0, "currentStreak" INTEGER NOT NULL DEFAULT 0, "maxStreak" INTEGER NOT NULL DEFAULT 0, "averageGuesses" DOUBLE PRECISION NOT NULL DEFAULT 0, "lastPlayedDate" TEXT);
CREATE TABLE "UserWallet" (id TEXT PRIMARY KEY, "userId" TEXT NOT NULL UNIQUE, balance INTEGER NOT NULL DEFAULT 0, "streakFreezes" INTEGER NOT NULL DEFAULT 0, "updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "CoinTransaction" (id TEXT PRIMARY KEY, "userId" TEXT NOT NULL, amount INTEGER NOT NULL, reason TEXT NOT NULL, "dateKey" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "DailyUsage" (key TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0, date TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "RecommendationFeedback" ("userId" TEXT NOT NULL, "tmdbId" INTEGER NOT NULL, reaction TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, PRIMARY KEY("userId", "tmdbId"));
CREATE TABLE "RecommendationMovie" ("tmdbId" INTEGER PRIMARY KEY, title TEXT NOT NULL, "titlePl" TEXT NOT NULL, year INTEGER NOT NULL, "posterPath" TEXT NOT NULL);
`;

describe.skipIf(!enabled)("profile migration and persistence on isolated PostgreSQL", () => {
  let schemaCreated = false;
  const originalConfig = { webSocketConstructor: neonConfig.webSocketConstructor, wsProxy: neonConfig.wsProxy, useSecureWebSocket: neonConfig.useSecureWebSocket, pipelineConnect: neonConfig.pipelineConnect };
  beforeAll(async () => {
    if (process.env.SHOWLE_PROFILE_PG_URL !== LOCAL_URL) throw new Error("Use only the explicit isolated local test URL");
    neonConfig.webSocketConstructor = LoopbackTransport;
    neonConfig.wsProxy = (host, port) => {
      if (host !== "127.0.0.1" || String(port) !== "55439") throw new Error("Unexpected PostgreSQL target");
      return "127.0.0.1:55439";
    };
    neonConfig.useSecureWebSocket = false;
    neonConfig.pipelineConnect = false;
    harness.client = new PrismaClient({ adapter: new PrismaNeon({ connectionString: LOCAL_URL, connectionTimeoutMillis: 3000 }, { schema }) });
    expect(await harness.client.$queryRaw`SELECT current_database()::text AS database, current_user::text AS role`).toEqual([{ database: "showle_security_fix", role: "showle_security" }]);
    expect(schema).toMatch(/^user_profile_it_[a-f0-9]{32}$/);
    await harness.client.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    schemaCreated = true;
    const migration = readFileSync("prisma/migrations/20260922_user_profiles/migration.sql", "utf8");
    const socialMigration = readFileSync("prisma/migrations/20260922_social_profiles/migration.sql", "utf8");
    const gemMigration = readFileSync("prisma/migrations/20260923_gem_rewards/migration.sql", "utf8");
    await harness.client.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      for (const statement of `${baseline}\n${migration}\n${socialMigration}\n${gemMigration}`.split(";").map((sql) => sql.trim()).filter(Boolean)) await tx.$executeRawUnsafe(statement);
    }, { timeout: 20_000 });
    await harness.client.$executeRawUnsafe(`INSERT INTO "${schema}"."RecommendationMovie" VALUES (1, 'Verified title', 'Sprawdzony film', 2001, '/verified.jpg')`);
  }, 30_000);
  afterAll(async () => {
    try { if (schemaCreated) await harness.client!.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`); }
    finally { await harness.client?.$disconnect(); Object.assign(neonConfig, originalConfig); }
  });
  beforeEach(async () => {
    await harness.client!.$transaction(async (tx) => {
      for (const table of ["RankedList", "SavedMovie", "GameResult", "UserStats", "UserWallet", "CoinTransaction", "DailyUsage", "RecommendationFeedback", "UserProfile", "HigherLowerRecord"]) await tx.$executeRawUnsafe(`DELETE FROM "${schema}"."${table}"`);
    });
  });
  const request = (body: unknown, method = "PATCH") => new Request("http://localhost/api/profile", { method, body: JSON.stringify(body) });
  socialPostgresCases(() => harness.client!);
  gemsPostgresCases(() => harness.client!);

  it("applies the checked-in migration and persists private defaults, preferences and verified favorite snapshots", async () => {
    const created = await getOrCreateUserProfile("viewer");
    expect(created).toMatchObject({ isPublic: false, genres: [], favoriteMovieIds: [], favoriteMovies: [], maxRuntime: null, locale: "pl" });
    expect(created.publicSlug).toMatch(/^[a-f0-9]{24}$/);
    const first = await updatePreferences(request({ genres: ["Drama"], excludedGenres: ["Horror"], providerIds: [8], maxRuntime: 120 }));
    expect(first.status).toBe(200);
    expect((await updatePreferences(request({ locale: "en" }))).status).toBe(200);
    expect((await updateProfile(request({ favoriteMovieIds: [1], isPublic: true, userId: "victim" }))).status).toBe(200);
    const stored = await harness.client!.userProfile.findUniqueOrThrow({ where: { userId: "viewer" } });
    expect(stored).toMatchObject({ locale: "en", genres: ["Drama"], excludedGenres: ["Horror"], providerIds: [8], maxRuntime: 120, isPublic: true, favoriteMovieIds: [1], favoriteMovies: [{ id: 1, title: "Verified title", year: 2001, posterPath: "/verified.jpg" }] });
    expect(await harness.client!.userProfile.findUnique({ where: { userId: "victim" } })).toBeNull();
    await harness.client!.higherLowerRecord.create({ data: { userId: "viewer", bestScore: 12 } });
    expect((await harness.client!.higherLowerRecord.findUniqueOrThrow({ where: { userId: "viewer" } })).bestScore).toBe(12);
  });

  it("serializes competing preference updates so one cannot create overlapping genres", async () => {
    await getOrCreateUserProfile("viewer");
    const responses = await Promise.all([updatePreferences(request({ genres: ["Comedy"] })), updatePreferences(request({ excludedGenres: ["Comedy"] }))]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 400]);
    const stored = await harness.client!.userProfile.findUniqueOrThrow({ where: { userId: "viewer" } });
    expect(stored.genres.some((genre) => stored.excludedGenres.includes(genre))).toBe(false);
  });

  async function seedUser(userId: string) {
    await harness.client!.userProfile.create({ data: { userId, publicSlug: `slug-${userId}` } });
    await harness.client!.savedMovie.createMany({ data: Array.from({ length: 25 }, (_, index) => ({ userId, tmdbId: index + 1, title: `Film ${index + 1}`, year: 2000, posterPath: "/film.jpg", genres: ["Drama"], category: "watched" })) });
    await harness.client!.rankedList.create({ data: { userId, name: "Favorites", items: { create: { tmdbId: 1, title: "Film", year: 2000, posterPath: "/film.jpg", genres: ["Drama"], position: 1 } } } });
    await harness.client!.gameResult.create({ data: { userId, dateKey: "2026-09-22", status: "playing", guessIds: [1], attemptCount: 1, hintsUsed: 0, targetMovieId: 99, targetTitle: "Secret answer" } });
    await harness.client!.userStats.create({ data: { userId, gamesPlayed: 2 } });
    await harness.client!.userWallet.create({ data: { userId, balance: 20 } });
    await harness.client!.coinTransaction.create({ data: { userId, amount: 20, reason: "win_reward" } });
    await harness.client!.recommendationFeedback.create({ data: { userId, tmdbId: 1, reaction: "more" } });
    await harness.client!.higherLowerRecord.create({ data: { userId, bestScore: 10 } });
    await harness.client!.dailyUsage.create({ data: { key: `recommend:${userId}:2026-09-22`, date: "2026-09-22", count: 1 } });
  }

  it("exports all owned pages then atomically removes only owned app data including cascading ranking items", async () => {
    await seedUser("viewer"); await seedUser("other-viewer");
    const exported = await exportProfileData("viewer");
    expect(exported.collection).toHaveLength(25);
    expect(exported.collection.every((movie) => movie.userId === "viewer")).toBe(true);
    expect(exported.rankings[0].items).toHaveLength(1);
    expect(exported.history[0]).toMatchObject({ guessIds: [1], targetMovieId: null, targetTitle: "" });
    expect(exported.usage).toHaveLength(1);
    expect((await DELETE(request({ confirmation: "DELETE SHOWLE DATA", userId: "other-viewer" }, "DELETE"))).status).toBe(200);
    const empty = await exportProfileData("viewer");
    expect(empty).toMatchObject({ profile: null, collection: [], rankings: [], history: [], stats: null, feedback: [], wallet: null, transactions: [], higherLowerRecord: null, usage: [] });
    const other = await exportProfileData("other-viewer");
    expect(other.collection).toHaveLength(25);
    expect(other.rankings[0].items).toHaveLength(1);
    expect(other.wallet?.balance).toBe(20);
    expect(await harness.client!.rankedListItem.count()).toBe(1);
  });
});
