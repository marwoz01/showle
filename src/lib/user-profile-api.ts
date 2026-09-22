import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { RequestBodyError } from "@/lib/request-body";
import { ProfileError } from "@/lib/user-profile-input";

export const PROFILE_HEADERS = { "Cache-Control": "private, no-store" };

export async function profileViewer(action: string, limit = 30): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new ProfileError("unauthorized", 401);
  if (!rateLimit(`profile:${action}:${userId}`, { limit, windowMs: 60_000 }).success) throw new ProfileError("rate_limited", 429);
  return userId;
}

export function profileFailure(error: unknown): NextResponse {
  if (error instanceof ProfileError || error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status, headers: PROFILE_HEADERS });
  console.error("Profile request failed", error);
  return NextResponse.json({ error: "profile_unavailable" }, { status: 503, headers: PROFILE_HEADERS });
}
