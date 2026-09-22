import { NextRequest, NextResponse } from "next/server";
import { getSocialFeed } from "@/lib/social-feed";
import { auth } from "@clerk/nextjs/server";
import { rateLimit } from "@/lib/rate-limit";
import { profileFailure, PROFILE_HEADERS } from "@/lib/user-profile-api";
import { ProfileError } from "@/lib/user-profile-input";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    const ip = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim().slice(0, 80) ?? "unknown";
    if (!rateLimit(`social-feed:${userId ?? ip}`, { limit: 60, windowMs: 60_000 }).success) throw new ProfileError("rate_limited", 429);
    return NextResponse.json(await getSocialFeed(userId, request.nextUrl.searchParams.get("slug") ?? undefined), { headers: PROFILE_HEADERS });
  } catch (error) { return profileFailure(error); }
}
