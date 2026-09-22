import { validMovieId } from "@/lib/recommend-input";
import type { RecommendationReaction } from "@/types/recommendation";

export type FeedbackEntry = [number, RecommendationReaction];
export const RECOMMENDATION_FEEDBACK_RESET_EVENT = "showle:recommendation:feedback-reset";

export function recommendationFeedbackStorageKey(userId: string | null | undefined) {
  return `showle-recommend-feedback:${userId ?? "guest"}`;
}

export function clearRecommendationAccountFeedback(userId: string) {
  if (!userId) return;
  try { localStorage.removeItem(recommendationFeedbackStorageKey(userId)); } catch { /* Optional browser cache. */ }
  window.dispatchEvent(new CustomEvent(RECOMMENDATION_FEEDBACK_RESET_EVENT, { detail: userId }));
}

export function readFeedback(value: unknown): FeedbackEntry[] {
  const raw = Array.isArray(value) ? value : value && typeof value === "object" ? Object.entries(value) : [];
  const entries = new Map<number, RecommendationReaction>();
  for (const pair of raw) {
    if (!Array.isArray(pair) || pair.length !== 2) continue;
    const id = Number(pair[0]);
    if (!validMovieId(id) || (pair[1] !== "more" && pair[1] !== "less")) continue;
    entries.delete(id); entries.set(id, pair[1]);
  }
  return [...entries].slice(-50);
}
export function updateFeedback(previous: FeedbackEntry[], id: number, reaction: RecommendationReaction | null): FeedbackEntry[] {
  const next = previous.filter(([movieId]) => movieId !== id);
  if (reaction) next.push([id, reaction]);
  return next.slice(-50);
}
