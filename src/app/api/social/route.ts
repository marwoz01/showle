import { NextResponse } from "next/server";
import { getSocialSummary } from "@/lib/social-queries";
import { profileViewer, profileFailure, PROFILE_HEADERS } from "@/lib/user-profile-api";

export async function GET() {
  try {
    const userId = await profileViewer("social-read", 60);
    return NextResponse.json(await getSocialSummary(userId), { headers: PROFILE_HEADERS });
  } catch (error) { return profileFailure(error); }
}
