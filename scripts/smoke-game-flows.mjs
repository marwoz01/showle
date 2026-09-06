// Local integration checks. Creates isolated test players, then deletes only their rows.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const origin = process.argv[2] ?? "http://localhost:3010";
assert(
  ["localhost", "127.0.0.1"].includes(new URL(origin).hostname),
  "Run only against a local server",
);
const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});
const host = randomUUID();
const guest = randomUUID();
const dailyGuest = randomUUID();
const codes = [];
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function api(path, player, body, cookie) {
  const response = await fetch(`${origin}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      ...(player ? { "x-duel-player": player } : {}),
      ...(cookie ? { cookie } : {}),
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  assert.equal(response.status, 200, `${path}: ${JSON.stringify(data)}`);
  return data;
}
async function playFrames(mode) {
  let view = await api("/api/duel/rooms", host, {
    action: "create",
    playerId: host,
    name: "Smoke host",
    mode,
    locale: "pl",
  });
  codes.push(view.code);
  const path = `/api/duel/rooms/${view.code}`;
  if (mode === "duel") {
    assert.equal(view.question, null);
    view = await api("/api/duel/rooms", guest, {
      action: "join",
      playerId: guest,
      name: "Smoke guest",
      code: view.code,
    });
  }
  assert.equal(view.roundEndsAt, null);
  for (let round = 0; round < 6; round++) {
    const action = { type: "ready", round, match: view.matchNumber };
    view = await api(`${path}/action`, host, action);
    if (mode === "duel") {
      assert.equal(view.roundEndsAt, null, "Must wait for both players");
      view = await api(`${path}/action`, guest, action);
    }
    assert.equal(
      Date.parse(view.roundEndsAt) - Date.parse(view.roundStartsAt),
      10000,
    );
    assert.equal(view.question.correctIndex, undefined);
    if (round === 0) {
      const early = await api(`${path}/answer`, host, {
        answerIndex: 0,
        round,
        match: view.matchNumber,
      });
      assert.equal(
        early.players[0].answered,
        false,
        "Countdown must reject early answers",
      );
    }
    await pause(Math.max(0, Date.parse(view.roundStartsAt) - Date.now()) + 100);
    const answer = { answerIndex: 0, round, match: view.matchNumber };
    const [one, two] = await Promise.all([
      api(`${path}/answer`, host, answer),
      api(`${path}/answer`, host, answer),
    ]);
    assert.equal(
      one.players[0].score,
      two.players[0].score,
      "Duplicate concurrent answers must not score twice",
    );
    if (mode === "duel") {
      assert.equal(
        one.roundResolvedAt,
        null,
        "First answer cannot end the round",
      );
      view = await api(`${path}/answer`, guest, answer);
    } else view = two;
    assert.notEqual(view.roundResolvedAt, null);
    assert(Number.isInteger(view.question.correctIndex));
    await pause(
      Math.max(0, Date.parse(view.roundResolvedAt) + 2550 - Date.now()),
    );
    view = await api(path, host);
    console.log(`${mode}: round ${round + 1}/6 verified`);
  }
  assert.equal(view.status, "finished");
  assert.equal(view.history.length, 6);
  const match = view.matchNumber;
  view = await api(`${path}/action`, host, {
    type: "rematch",
    match,
    locale: "pl",
  });
  if (mode === "duel") {
    assert.equal(view.status, "finished");
    view = await api(`${path}/action`, guest, {
      type: "rematch",
      match,
      locale: "pl",
    });
  }
  assert.equal(view.status, "playing");
  assert.equal(view.matchNumber, match + 1);
  assert.equal(view.players[0].score, 0);
  assert.equal(view.history.length, 0);
  console.log(`${mode}: rematch in the same room verified`);
}

try {
  const cookie = `showle-player=${dailyGuest}`;
  let daily = await api("/api/game/state?lang=pl", null, null, cookie);
  assert.equal(daily.answer, null);
  assert.equal(daily.guesses.length, 0);
  const invalid = await fetch(`${origin}/api/game/complete`, {
    method: "POST",
    headers: { cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "won", guessIds: [1], targetMovieId: 1 }),
  });
  assert.equal(invalid.status, 400);
  const yesterday = await fetch(`${origin}/api/game/state?dateKey=2000-01-01`, {
    headers: { cookie },
  });
  assert.equal(yesterday.status, 409);
  daily = await api(
    "/api/game/state?lang=pl",
    null,
    { type: "guess", movieId: 157336 },
    cookie,
  );
  assert.equal(daily.guesses.length, 1);
  const duplicate = await api(
    "/api/game/state?lang=pl",
    null,
    { type: "guess", movieId: 157336 },
    cookie,
  );
  assert.equal(duplicate.guesses.length, 1);
  daily = await api(
    "/api/game/state?lang=pl",
    null,
    { type: "give-up" },
    cookie,
  );
  assert(daily.answer);
  const restored = await api("/api/game/state?lang=en", null, null, cookie);
  assert.equal(restored.status, daily.status);
  assert.equal(restored.answer.runtime, daily.answer.runtime);
  console.log(
    "daily: hidden answer, validation, duplicate attempt, restoration and canonical values verified",
  );
  await Promise.all([playFrames("duel"), playFrames("practice")]);
  console.log("All local game-flow checks passed.");
} finally {
  // Exact test identifiers created above; never delete existing players or arbitrary rooms.
  await prisma.gameResult.deleteMany({
    where: { userId: `guest:${dailyGuest}` },
  });
  if (codes.length)
    await prisma.duelRoom.deleteMany({
      where: { code: { in: codes }, hostId: host },
    });
  await prisma.$disconnect();
}
