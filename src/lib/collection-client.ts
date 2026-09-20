import type { CollectionCategory, SavedMovie } from "@/types/collection";

export class CollectionRequestError extends Error {
  constructor(public readonly status: number) { super("collection_request_failed"); }
}

export async function collectionRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  if (!response.ok) throw new CollectionRequestError(response.status);
  return response.json() as Promise<T>;
}
export function collectionChanged(owner: string, movie?: Pick<SavedMovie, "tmdbId" | "category"> | { tmdbId: number; category: null }) {
  window.dispatchEvent(new CustomEvent("collection-changed", { detail: { owner, movie } }));
}
export interface CollectionChange { owner: string; movie?: { tmdbId: number; category: CollectionCategory | null } }
