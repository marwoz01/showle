import { reportServerError } from "@/lib/server-error";

export const TMDB_TIMEOUT_MS = 6000;

export async function tmdbFetch<T>(path: string, params: Record<string, string> = {}, signal?: AbortSignal): Promise<T> {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set("api_key", process.env.TMDB_API_KEY ?? "");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const timeout = AbortSignal.timeout(TMDB_TIMEOUT_MS);
  const bounded = signal ? AbortSignal.any([signal, timeout]) : timeout;
  bounded.throwIfAborted();
  try {
    const response = await fetch(url.toString(), { signal: bounded, next: { revalidate: 3600 } });
    if (!response.ok) throw new Error(`TMDB status ${response.status}`);
    return await response.json();
  } catch (error) {
    reportServerError("tmdb.request", error);
    throw error;
  }
}
