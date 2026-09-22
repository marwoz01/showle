import type { SocialPerson } from "@/types/social";

export type SocialAction = "follow" | "unfollow" | "request" | "accept" | "decline" | "cancel" | "remove";

export async function loadSocial<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { cache: "no-store", signal });
  if (!response.ok) throw new Error(String(response.status));
  return response.json() as Promise<T>;
}

export async function changeRelationship(slug: string, action: SocialAction, signal?: AbortSignal): Promise<SocialPerson> {
  const response = await fetch("/api/social/relationship", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, action }), signal,
  });
  if (!response.ok) throw new Error(String(response.status));
  return (await response.json() as { person: SocialPerson }).person;
}

export function friendSlug(value: string, origin: string): string | null {
  const input = value.trim();
  if (/^[a-z0-9-]{3,64}$/.test(input)) return input;
  try {
    const url = new URL(input, origin);
    if (![origin, "https://showle.vercel.app"].includes(url.origin)) return null;
    const slug = url.pathname === "/profile" ? url.searchParams.get("invite") : /^\/u\/([a-z0-9-]{3,64})\/?$/.exec(url.pathname)?.[1];
    return slug && /^[a-z0-9-]{3,64}$/.test(slug) ? slug : null;
  } catch { return null; }
}
