import { createHash, randomBytes } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { MovieChoiceError } from "@/lib/movie-choice-input";

export const MOVIE_CHOICE_COOKIE = "showle_movie_choice";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

export function readMovieChoiceSession(request: NextRequest): string | null {
  const token = request.cookies.get(MOVIE_CHOICE_COOKIE)?.value;
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

export function createMovieChoiceSession(): string {
  return randomBytes(32).toString("base64url");
}

export function movieChoiceIdentity(token: string): string {
  return createHash("sha256").update("showle:movie-choice:").update(token).digest("hex");
}

export function setMovieChoiceSession(response: NextResponse, token: string): void {
  response.cookies.set(MOVIE_CHOICE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/recommend/together",
    maxAge: COOKIE_MAX_AGE,
  });
}

export function assertMovieChoiceOrigin(request: NextRequest): void {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site" || !origin || origin !== request.nextUrl.origin) {
    throw new MovieChoiceError("invalid_origin", 403);
  }
}
