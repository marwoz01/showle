import { NextRequest, NextResponse } from "next/server";
import { getSocialPerson } from "@/lib/social";
import { parseSocialAction, updateSocialRelationship } from "@/lib/social-mutations";
import { readJsonBody } from "@/lib/request-body";
import { profileViewer, profileFailure, PROFILE_HEADERS } from "@/lib/user-profile-api";

export async function GET(request: NextRequest) {
  try {
    const userId = await profileViewer("social-person", 60);
    return NextResponse.json({ person: await getSocialPerson(userId, request.nextUrl.searchParams.get("slug") ?? "") }, { headers: PROFILE_HEADERS });
  } catch (error) { return profileFailure(error); }
}

export async function POST(request: Request) {
  try {
    const userId = await profileViewer("social-action", 30);
    const { slug, action } = parseSocialAction(await readJsonBody(request, 1024));
    return NextResponse.json(await updateSocialRelationship(userId, slug, action), { headers: PROFILE_HEADERS });
  } catch (error) { return profileFailure(error); }
}
