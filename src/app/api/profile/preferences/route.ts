import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRecord, readJsonBody } from "@/lib/request-body";
import { getOrCreateUserProfile, profilePreferences } from "@/lib/user-profile";
import { PROFILE_HEADERS, profileFailure, profileViewer } from "@/lib/user-profile-api";
import { parsePreferencePatch, ProfileError } from "@/lib/user-profile-input";

export async function GET() {
  try {
    const userId = await profileViewer("preferences-read", 60);
    const profile = await getOrCreateUserProfile(userId);
    return NextResponse.json({ preferences: profilePreferences(profile), locale: profile.locale }, { headers: PROFILE_HEADERS });
  } catch (error) { return profileFailure(error); }
}

export async function PATCH(request: Request) {
  try {
    const userId = await profileViewer("preferences-write");
    const body = await readJsonBody(request, 4096);
    await getOrCreateUserProfile(userId);
    const updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"profile:" + userId}))`;
      const current = await tx.userProfile.findUniqueOrThrow({ where: { userId } });
      const patch = parsePreferencePatch(body, profilePreferences(current));
      return tx.userProfile.update({ where: { userId }, data: patch });
    });
    return NextResponse.json({ preferences: profilePreferences(updated), locale: updated.locale }, { headers: PROFILE_HEADERS });
  } catch (error) { return profileFailure(error); }
}

export async function POST(request: Request) {
  try {
    const userId = await profileViewer("feedback-reset", 5);
    const body = await readJsonBody(request, 1024);
    if (!isRecord(body) || body.action !== "reset-feedback") throw new ProfileError("invalid_action");
    await prisma.recommendationFeedback.deleteMany({ where: { userId } });
    return NextResponse.json({ ok: true }, { headers: PROFILE_HEADERS });
  } catch (error) { return profileFailure(error); }
}
