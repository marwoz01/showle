import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getOpenRouter } from "@/lib/gemini";
import { searchMovieByTitleAndYear } from "@/lib/tmdb";
import type { MediaDetails } from "@/types";

interface AIMovie {
  title: string;
  title_en: string;
  year: number;
  justification: string;
}

interface RecommendRequest {
  genres: string[];
  yearFrom: number;
  yearTo: number;
  popularity: string;
  locale: string;
  exclude?: number[];
}

const POPULARITY_DESCRIPTIONS: Record<string, string> = {
  popular: "popularne, znane szerokiej publiczności",
  medium: "średnio popularne, cenione przez koneserów",
  niche: "niszowe, mało znane perełki",
};

function buildSystemPrompt(locale: string): string {
  const lang = locale === "pl"
    ? "Uzasadnienia pisz po polsku."
    : "Write justifications in English.";

  return `Jesteś ekspertem od rekomendacji filmów. Twoim zadaniem jest zaproponować użytkownikowi filmy idealnie dopasowane do jego preferencji.

Zasady:
1. Wybierz DOKŁADNIE 10 filmów (podajemy więcej, żeby mieć zapas).
2. Dla każdego filmu podaj uzasadnienie w 1-2 zdaniach wyjaśniające, DLACZEGO ten film pasuje do użytkownika.
3. Jeśli użytkownik preferuje filmy niszowe, unikaj oczywistych blockbusterów. Szukaj ukrytych perełek.
4. Jeśli użytkownik preferuje filmy popularne, wybieraj uznane, wysoko oceniane tytuły.
5. Zadbaj o różnorodność — nie wybieraj filmów od tego samego reżysera ani z tego samego roku (chyba że to jedyne opcje).
6. Podaj tytuły w języku angielskim (title_en) oraz oryginalnym (title).
7. Nie używaj ogólników typu "świetny film" — zawsze podaj konkretny powód dopasowania (klimat, tempo, styl narracji, tematyka).
8. ${lang}

Odpowiedz WYŁĄCZNIE w formacie JSON:
{"recommendations": [{"title": "...", "title_en": "...", "year": 2000, "justification": "..."}]}`;
}

function buildUserPrompt(req: RecommendRequest): string {
  const popularity = POPULARITY_DESCRIPTIONS[req.popularity] || POPULARITY_DESCRIPTIONS.popular;
  const yearRange = req.yearFrom && req.yearTo
    ? `filmy z lat ${req.yearFrom}–${req.yearTo}`
    : "dowolny okres";

  return `Gatunki: ${req.genres.join(", ")}
Okres: ${yearRange}
Popularność: ${popularity}`;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const { success } = rateLimit(`recommend:${ip}`, { limit: 5, windowMs: 300_000 });

  if (!success) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": "300" } }
    );
  }

  let body: RecommendRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.genres || body.genres.length === 0) {
    return NextResponse.json({ error: "At least one genre required" }, { status: 400 });
  }

  try {
    const excludeSet = new Set(body.exclude || []);
    const systemPrompt = buildSystemPrompt(body.locale || "en");
    const userPrompt = buildUserPrompt(body);

    const completion = await getOpenRouter().chat.completions.create({
      model: "google/gemini-2.0-flash-001",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 500 });
    }

    const parsed = JSON.parse(text) as { recommendations: AIMovie[] };

    // Try to match each recommendation to TMDB, take first 5 successful
    const recommendations: { movie: MediaDetails; justification: string }[] = [];

    for (const rec of parsed.recommendations) {
      if (recommendations.length >= 5) break;

      // 3-level fallback: title_en+year → title_en → title+year
      let movie = await searchMovieByTitleAndYear(rec.title_en, rec.year);
      if (!movie) movie = await searchMovieByTitleAndYear(rec.title_en);
      if (!movie) movie = await searchMovieByTitleAndYear(rec.title, rec.year);

      if (movie && !excludeSet.has(movie.id)) {
        recommendations.push({ movie, justification: rec.justification });
      }
    }

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error("Recommend error:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
