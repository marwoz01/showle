import { NextRequest, NextResponse } from "next/server";
import { searchSocialProfiles } from "@/lib/social-queries";
import { profileViewer, profileFailure, PROFILE_HEADERS } from "@/lib/user-profile-api";

export async function GET(request: NextRequest) {
  try {
    const userId = await profileViewer("social-search", 60);
    return NextResponse.json(await searchSocialProfiles(userId, request.nextUrl.searchParams.get("q") ?? ""), { headers: PROFILE_HEADERS });
  } catch (error) { return profileFailure(error); }
}
