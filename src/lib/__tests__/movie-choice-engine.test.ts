import { describe, expect, it } from "vitest";
import { serializeMovieChoiceRoom, transitionMovieChoiceRoom } from "@/lib/movie-choice-engine";
import { parseMovieChoiceRequest } from "@/lib/movie-choice-input";
import { movieChoiceMovies, movieChoiceNow as now, movieChoicePreferences as preferences, movieChoiceRoomFixture as fixture } from "./movie-choice-fixtures";

describe("shared film room transitions", () => {
  it("lets the host rejoin without occupying the guest slot or renaming anyone", () => {
    const room = fixture();
    expect(transitionMovieChoiceRoom(room, "host-secret", { action: "join", code: room.code, name: "Another name" }, now)).toBe(room);
    const joined = transitionMovieChoiceRoom(room, "guest-secret", { action: "join", code: room.code, name: "Guest" }, now);
    expect(joined).toMatchObject({ status: "preferences", guestId: "guest-secret", guestName: "Guest", revision: 2 });
    expect(transitionMovieChoiceRoom(joined, "guest-secret", { action: "join", code: room.code, name: "Changed" }, now)).toBe(joined);
    expect(() => transitionMovieChoiceRoom(joined, "third", { action: "join", code: room.code, name: "Third" }, now)).toThrow("room_full");
  });

  it("accepts host preferences before the second person joins", () => {
    const room = transitionMovieChoiceRoom(fixture(), "host-secret", { action: "preferences", code: "ABCDEF", batch: 1, preferences }, now);
    expect(room.status).toBe("waiting");
    expect(room.hostPreferences).toEqual(preferences);
  });

  it("does not expose identities, other preferences or other votes", () => {
    const room = fixture({ status: "voting", guestId: "guest-secret", guestName: "Guest", generationToken: "private-generation",
      hostPreferences: preferences, guestPreferences: { ...preferences, genres: ["Horror"] }, movies: movieChoiceMovies,
      hostVotes: [{ movieId: 1, liked: false }], guestVotes: [{ movieId: 1, liked: true }, { movieId: 2, liked: true }],
    });
    const host = serializeMovieChoiceRoom(room, "host-secret", now);
    expect(host.preferences).toEqual(preferences);
    expect(host.votes).toEqual([{ movieId: 1, liked: false }]);
    expect(host.players[1]).toMatchObject({ votedCount: 2, ready: true });
    const serialized = JSON.stringify(host);
    for (const secret of ["host-secret", "guest-secret", "private-generation", "Horror", "guestVotes", "guestPreferences"]) {
      expect(serialized).not.toContain(secret);
    }
    expect(() => serializeMovieChoiceRoom(room, "outsider", now)).toThrow("room_not_found");
  });

  it("makes votes immutable and idempotent, preserving the first mutual like", () => {
    const room = fixture({ status: "voting", guestId: "guest-secret", movies: movieChoiceMovies });
    const vote = { action: "vote" as const, code: room.code, batch: 1, movieId: 1, liked: true };
    const first = transitionMovieChoiceRoom(room, "host-secret", vote, now);
    expect(first.status).toBe("voting");
    expect(transitionMovieChoiceRoom(first, "host-secret", vote, now)).toBe(first);
    expect(() => transitionMovieChoiceRoom(first, "host-secret", { ...vote, liked: false }, now)).toThrow("already_voted");
    const matched = transitionMovieChoiceRoom(first, "guest-secret", vote, now);
    expect(matched).toMatchObject({ status: "matched", matchMovieId: 1, revision: 3 });
    expect(serializeMovieChoiceRoom(matched, "host-secret", now).match?.id).toBe(1);
    expect(transitionMovieChoiceRoom(matched, "guest-secret", vote, now)).toBe(matched);
    expect(() => transitionMovieChoiceRoom(matched, "host-secret", { ...vote, movieId: 2 }, now)).toThrow("not_ready");
  });

  it("allows different speeds and exhausts only after both finish without a match", () => {
    let room = fixture({ status: "voting", guestId: "guest-secret", movies: movieChoiceMovies });
    for (const movie of movieChoiceMovies) room = transitionMovieChoiceRoom(room, "host-secret", { action: "vote", code: room.code, batch: 1, movieId: movie.id, liked: true }, now);
    expect(room.status).toBe("voting");
    for (const movie of movieChoiceMovies) room = transitionMovieChoiceRoom(room, "guest-secret", { action: "vote", code: room.code, batch: 1, movieId: movie.id, liked: false }, now);
    expect(room.status).toBe("exhausted");
  });

  it("rejects missing, out-of-order and stale votes without changing the state", () => {
    const room = fixture({ status: "voting", guestId: "guest-secret", movies: movieChoiceMovies });
    for (const movieId of [2, 999]) {
      expect(() => transitionMovieChoiceRoom(room, "host-secret", { action: "vote", code: room.code, batch: 1, movieId, liked: true }, now)).toThrow("invalid_vote");
    }
    expect(() => transitionMovieChoiceRoom(room, "host-secret", { action: "vote", code: room.code, batch: 2, movieId: 1, liked: true }, now)).toThrow("batch_changed");
    expect(room.hostVotes).toEqual([]);
  });

  it("requires an explicit host reset, forgets private choices and excludes the previous deck", () => {
    const room = fixture({ status: "matched", guestId: "guest-secret", movies: movieChoiceMovies, matchMovieId: 1, hostPreferences: preferences, hostVotes: [{ movieId: 1, liked: true }] });
    const action = { action: "reset" as const, code: room.code, batch: 1 };
    expect(() => transitionMovieChoiceRoom(room, "guest-secret", action, now)).toThrow("host_only");
    const reset = transitionMovieChoiceRoom(room, "host-secret", action, now);
    expect(reset).toMatchObject({ status: "preferences", batch: 2, revision: 2, movies: [], hostVotes: [], guestVotes: [], hostPreferences: null, guestPreferences: null, matchMovieId: null, excludedMovieIds: [1, 2, 3] });
    expect(() => transitionMovieChoiceRoom(reset, "host-secret", action, now)).toThrow("batch_changed");
    expect(() => transitionMovieChoiceRoom(reset, "guest-secret", { action: "preferences", code: room.code, batch: 1, preferences }, now)).toThrow("batch_changed");
  });

  it("recovers a stale generation lease without accepting concurrent preference edits", () => {
    const room = fixture({ status: "preferences", guestId: "guest-secret", generationToken: "token", generationStartedAt: new Date(now), hostPreferences: preferences, guestPreferences: preferences });
    const action = { action: "preferences" as const, code: room.code, batch: 1, preferences };
    expect(() => transitionMovieChoiceRoom(room, "host-secret", action, now + 1000)).toThrow("preparing");
    expect(serializeMovieChoiceRoom(room, "host-secret", now + 46_000)).toMatchObject({ preparing: false, generationError: "service_unavailable" });
    expect(transitionMovieChoiceRoom(room, "host-secret", action, now + 46_000)).toMatchObject({ generationToken: null, generationError: null, revision: 2 });
  });

  it("does not admit expired rooms or outsiders", () => {
    const room = fixture({ expiresAt: new Date(now) });
    expect(() => transitionMovieChoiceRoom(room, "host-secret", { action: "join", code: room.code, name: "Host" }, now)).toThrow("room_not_found");
    expect(() => serializeMovieChoiceRoom(room, "host-secret", now)).toThrow("room_not_found");
    expect(() => transitionMovieChoiceRoom(fixture(), "outsider", { action: "preferences", code: room.code, batch: 1, preferences }, now)).toThrow("room_not_found");
  });
});

describe("shared film input validation", () => {
  it("normalizes display names and invitation codes", () => {
    expect(parseMovieChoiceRequest({ action: "join", code: " abcdef ", name: "  Ala   Kowalska " })).toEqual({ action: "join", code: "ABCDEF", name: "Ala Kowalska" });
  });
  it.each([
    { action: "create", name: "x".repeat(25), locale: "pl" },
    { action: "create", name: "Host", locale: "xx" },
    { action: "create", name: "Host", locale: "pl", playerId: "injected" },
    { action: "join", code: "../../file", name: "Guest" },
    { action: "preferences", code: "ABCDEF", batch: 1, preferences: { ...preferences, genres: ["invented"] } },
    { action: "preferences", code: "ABCDEF", batch: 1, preferences: { ...preferences, excludedGenres: ["Comedy"] } },
    { action: "preferences", code: "ABCDEF", batch: 1, preferences: { ...preferences, providerIds: ["8"] } },
    { action: "preferences", code: "ABCDEF", batch: 1, preferences: { ...preferences, maxRuntime: -1 } },
    { action: "vote", code: "ABCDEF", batch: "1", movieId: 1, liked: true },
    { action: "vote", code: "ABCDEF", batch: 1, movieId: 1, liked: "true" },
  ])("rejects malformed request %#", (request) => expect(() => parseMovieChoiceRequest(request)).toThrow());
});
