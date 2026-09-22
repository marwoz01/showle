import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/request-body";
import { getOrCreateUserProfile, getProfileBadges, getProfileSummary, privateProfileView } from "@/lib/user-profile";
import { getProfileActivity } from "@/lib/user-profile-activity";
import { PROFILE_HEADERS, profileFailure, profileViewer } from "@/lib/user-profile-api";
import { parseProfilePatch } from "@/lib/user-profile-input";
import { resolveProfileMovies } from "@/lib/user-profile-movies";

export async function GET() {
  try {
    const userId = await profileViewer("read", 60);
    const [profile, summary, activity] = await Promise.all([getOrCreateUserProfile(userId, true), getProfileSummary(userId), getProfileActivity(userId)]);
    return NextResponse.json({ profile: privateProfileView(profile), summary, activity, badges: getProfileBadges(summary) }, { headers: PROFILE_HEADERS });
  } catch (error) { return profileFailure(error); }
}

export async function PATCH(request: Request) {
  try {
    const userId = await profileViewer("write");
    const patch = parseProfilePatch(await readJsonBody(request, 4096));
    const profile = await getOrCreateUserProfile(userId);
    const favoriteMovies = patch.favoriteMovieIds !== undefined ? await resolveProfileMovies(patch.favoriteMovieIds, profile.locale) : undefined;
    const updated = await prisma.userProfile.update({ where: { userId }, data: { ...patch, ...(favoriteMovies ? { favoriteMovies: favoriteMovies as unknown as Prisma.InputJsonValue } : {}) } });
    return NextResponse.json({ profile: privateProfileView(updated) }, { headers: PROFILE_HEADERS });
  } catch (error) { return profileFailure(error); }
}
