import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getProfileBadges, getProfileSummary } from "@/lib/user-profile";
import { toPublicProfile } from "@/lib/profile-comparison";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const ip = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim().slice(0, 80) ?? "unknown";
  if (!rateLimit(`public-profile:${ip}`, { limit: 60, windowMs: 60_000 }).success)
    return NextResponse.json({ error: "rate_limit" }, { status: 429, headers });
  const { slug } = await params;
  if (!/^[a-z0-9-]{3,64}$/.test(slug))
    return NextResponse.json({ error: "not_found" }, { status: 404, headers });
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { publicSlug: slug, isPublic: true },
      select: { userId: true, publicSlug: true, displayName: true, bio: true, avatarUrl: true, favoriteMovies: true },
    });
    if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404, headers });
    const summary = await getProfileSummary(profile.userId);
    // Do not return a snapshot after an opt-out or account deletion during the aggregate query.
    if (!await prisma.userProfile.findUnique({ where: { publicSlug: slug, isPublic: true }, select: { userId: true } }))
      return NextResponse.json({ error: "not_found" }, { status: 404, headers });
    return NextResponse.json(toPublicProfile(profile, summary, getProfileBadges(summary)), { headers });
  } catch (error) {
    console.error("Public profile unavailable", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503, headers });
  }
}
