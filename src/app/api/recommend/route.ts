import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { rateLimit } from "@/lib/rate-limit";
import { getOpenRouter } from "@/lib/gemini";
import {
  findSimilarMovies,
  findMoviesByFilters,
  buildQueryText,
  inferGenresFromText,
  type SimilarMovieResult,
} from "@/lib/embeddings";
import { prisma } from "@/lib/prisma";
import type { MediaDetails } from "@/types";

function toMediaDetails(row: SimilarMovieResult): MediaDetails {
  return {
    id: row.tmdbId,
    title: row.title,
    type: "movie",
    year: row.year,
    genres: row.genres,
    country: row.country,
    director: row.director,
    leadActor: row.leadActor,
    runtime: row.runtime,
    budget: row.budget,
    popularity: row.voteCount,
    rating: row.rating,
    posterPath: row.posterPath,
    backdropPath: row.backdropPath || undefined,
    overview: row.overview,
    tagline: row.tagline ?? undefined,
    cast: row.cast,
  };
}

interface RecommendRequest {
  genres: string[];
  yearFrom: number;
  yearTo: number;
  popularity: string;
  locale: string;
  exclude?: number[];
  freeformText?: string;
}

/**
 * Translate a non-English freeform query to English so the embedding lands in
 * the same language space as our (English-built) movie embeddings. Cross-lingual
 * cosine match is unreliable for short, idiomatic phrases ("romans z mocnym
 * zakończeniem" was matching popular blockbusters instead of romances).
 */
async function translateToEnglish(text: string): Promise<string> {
  try {
    const completion = await getOpenRouter().chat.completions.create({
      model: "google/gemini-2.0-flash-001",
      messages: [
        {
          role: "system",
          content: `You translate movie-recommendation queries into natural English used by film critics and audiences.

Context: the user is describing what kind of MOVIE they want to watch. Disambiguate genre and cinematic terms accordingly:
- "romans" / "romance" / etc. → "romance" (the film genre), never "novel"
- "thriller" / "horror" / "comedy" / "drama" → keep as English film-genre terms
- moods (dark, slow-burn, feel-good, gritty) → preserve them faithfully

Output ONLY the translation — no quotes, no preamble, no explanation.`,
        },
        { role: "user", content: text },
      ],
    });
    const translated = completion.choices[0]?.message?.content?.trim();
    return translated || text;
  } catch {
    return text;
  }
}

function buildJustificationPrompt(
  movies: { title: string; year: number; overview: string }[],
  preferences: { genres: string[]; freeformText?: string; popularity: string },
  locale: string
): { system: string; user: string } {
  const lang = locale === "pl"
    ? "Pisz uzasadnienia po polsku."
    : "Write justifications in English.";

  const system = `You are a movie recommendation expert. The user has been matched with movies based on their preferences. Your job is to write a short, compelling justification (1-2 sentences) for each movie explaining WHY it fits the user's taste.

Rules:
1. Be specific — reference the movie's mood, themes, style, or narrative approach.
2. Connect each justification to the user's stated preferences.
3. Never use generic phrases like "great movie" or "must-see".
4. ${lang}

Respond ONLY in JSON: {"justifications": ["...", "...", ...]}`;

  const movieList = movies
    .map((m, i) => `${i + 1}. "${m.title}" (${m.year}) — ${m.overview.slice(0, 200)}`)
    .join("\n");

  const prefParts: string[] = [];
  if (preferences.genres.length) prefParts.push(`Genres: ${preferences.genres.join(", ")}`);
  if (preferences.freeformText) prefParts.push(`User description: "${preferences.freeformText}"`);
  if (preferences.popularity) prefParts.push(`Popularity preference: ${preferences.popularity}`);

  const user = `User preferences:
${prefParts.join("\n")}

Movies to justify:
${movieList}`;

  return { system, user };
}

const DAILY_LIMIT_AUTH = 7;
const DAILY_LIMIT_ANON = 1;

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const { userId } = await auth();
  const today = new Date().toISOString().slice(0, 10);
  const dailyLimit = userId ? DAILY_LIMIT_AUTH : DAILY_LIMIT_ANON;
  const dailyKey = userId
    ? `recommend:${userId}:${today}`
    : `recommend:anon:${ip}:${today}`;

  const usage = await prisma.dailyUsage.findUnique({ where: { key: dailyKey } });
  const remaining = Math.max(0, dailyLimit - (usage?.count ?? 0));
  return NextResponse.json({ remaining, limit: dailyLimit });
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";

  // Anti-abuse: 5 req per 5 min per IP (independent of daily quota)
  const { success: ipOk } = rateLimit(`recommend:${ip}`, { limit: 5, windowMs: 300_000 });
  if (!ipOk) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": "300" } }
    );
  }

  // Daily quota — persisted in DB so it survives serverless cold starts
  const { userId } = await auth();
  const today = new Date().toISOString().slice(0, 10);
  const dailyLimit = userId ? DAILY_LIMIT_AUTH : DAILY_LIMIT_ANON;
  const dailyKey = userId
    ? `recommend:${userId}:${today}`
    : `recommend:anon:${ip}:${today}`;

  // Read current count before deciding whether to allow
  const existingUsage = await prisma.dailyUsage.findUnique({ where: { key: dailyKey } });
  if (existingUsage && existingUsage.count >= dailyLimit) {
    const error = userId ? "daily_limit_reached" : "daily_limit_anon";
    return NextResponse.json({ error, remaining: 0, limit: dailyLimit }, { status: 429 });
  }

  let body: RecommendRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const hasFreeform = !!body.freeformText?.trim();
  const hasGenres = body.genres && body.genres.length > 0;

  if (!hasFreeform && !hasGenres) {
    return NextResponse.json({ error: "At least one genre or freeform text required" }, { status: 400 });
  }

  if (hasFreeform && body.freeformText!.length > 400) {
    return NextResponse.json({ error: "Freeform text too long (max 400)" }, { status: 400 });
  }

  const TARGET = 8;

  try {
    // Watched movies are always excluded for signed-in users.
    const watchedIds = new Set<number>();
    if (userId) {
      const watched = await prisma.savedMovie.findMany({
        where: { userId, category: "watched" },
        select: { tmdbId: true },
      });
      watched.forEach((w) => watchedIds.add(w.tmdbId));
    }

    // Session-tracked exclusions (movies already shown to the user this visit).
    const sessionExcludes = new Set(body.exclude || []);
    const fullExcludes = new Set([...watchedIds, ...sessionExcludes]);

    // Translate non-English freeform input to match the catalog's English embeddings.
    let freeformForEmbedding = body.freeformText;
    if (hasFreeform && body.locale && body.locale !== "en") {
      freeformForEmbedding = await translateToEnglish(body.freeformText!);
    }

    // Build query text from structured + freeform inputs
    const queryText = buildQueryText({
      genres: body.genres,
      yearFrom: body.yearFrom,
      yearTo: body.yearTo,
      popularity: body.popularity,
      freeformText: freeformForEmbedding,
    });

    // When freeform text mentions a genre but the user didn't pick one from the UI,
    // infer it so the SQL genre filter fires and popular off-topic blockbusters don't
    // crowd out genuinely relevant films (e.g. "romance" → require Romance genre).
    // Run on BOTH the translated text and the original to survive translation failures.
    const inferredGenres =
      hasFreeform && !hasGenres
        ? [
            ...new Set([
              ...inferGenresFromText(body.freeformText!),
              ...inferGenresFromText(freeformForEmbedding ?? ""),
            ]),
          ]
        : [];

    const searchParams = {
      queryText,
      genres: body.genres,
      inferredGenres: inferredGenres.length ? inferredGenres : undefined,
      hasFreeform,
      yearFrom: body.yearFrom,
      yearTo: body.yearTo,
      popularity: body.popularity,
    };

    // Vector search with filter-only fallback if embeddings fail.
    async function search(excludeIds: number[]) {
      try {
        return await findSimilarMovies({ ...searchParams, excludeIds, limit: TARGET });
      } catch (embeddingError) {
        console.error("Embedding search failed, falling back to filters:", embeddingError);
        return findMoviesByFilters({ ...searchParams, excludeIds, limit: TARGET });
      }
    }

    let similarMovies = await search([...fullExcludes]);

    // Pool-exhaustion fallback: if we don't have enough results AND the user has been
    // clicking "try again" (sessionExcludes non-empty), retry without the session
    // exclusions so they get fresh recommendations even after burning through the pool.
    // Watched-exclusion is always preserved.
    if (similarMovies.length < TARGET && sessionExcludes.size > 0) {
      similarMovies = await search([...watchedIds]);
    }

    if (similarMovies.length === 0) {
      return NextResponse.json({ error: "no_results" }, { status: 404 });
    }

    // All movie data is in our own catalog now — no TMDB roundtrip needed.
    const movies: MediaDetails[] = similarMovies.map(toMediaDetails);

    // Generate AI justifications
    let justifications: string[] = movies.map((m) => m.overview.slice(0, 200));

    try {
      const prompt = buildJustificationPrompt(
        movies.map((m) => ({
          title: m.title,
          year: m.year,
          overview: m.overview,
        })),
        { genres: body.genres, freeformText: body.freeformText, popularity: body.popularity },
        body.locale || "en"
      );

      const completion = await getOpenRouter().chat.completions.create({
        model: "google/gemini-2.0-flash-001",
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
        response_format: { type: "json_object" },
      });

      const text = completion.choices[0]?.message?.content;
      if (text) {
        const parsed = JSON.parse(text) as { justifications: string[] };
        if (parsed.justifications?.length === movies.length) {
          justifications = parsed.justifications;
        }
      }
    } catch (aiError) {
      console.error("Justification generation failed, using overviews:", aiError);
    }

    // Build response in same shape as before
    const recommendations = movies.map((movie, i) => ({
      movie,
      justification: justifications[i] || movie.overview.slice(0, 200),
    }));

    // Increment usage counter only on a successful response
    const updated = await prisma.dailyUsage.upsert({
      where: { key: dailyKey },
      update: { count: { increment: 1 } },
      create: { key: dailyKey, count: 1, date: today },
    });
    const remaining = Math.max(0, dailyLimit - updated.count);

    return NextResponse.json({ recommendations, remaining, limit: dailyLimit });
  } catch (error) {
    console.error("Recommend error:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
