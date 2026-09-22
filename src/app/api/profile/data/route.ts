import { NextResponse } from "next/server";
import { isRecord, readJsonBody } from "@/lib/request-body";
import { PROFILE_HEADERS, profileFailure, profileViewer } from "@/lib/user-profile-api";
import { deleteProfileData } from "@/lib/user-profile-data";
import { ProfileError } from "@/lib/user-profile-input";

export async function DELETE(request: Request) {
  try {
    const userId = await profileViewer("delete", 3);
    const body = await readJsonBody(request, 1024);
    if (!isRecord(body) || body.confirmation !== "DELETE SHOWLE DATA") throw new ProfileError("confirmation_required");
    await deleteProfileData(userId);
    const response = NextResponse.json({ ok: true }, { headers: PROFILE_HEADERS });
    // Prevent anonymous progress in this browser from being adopted back into the reset account.
    response.cookies.set("showle-player", "", {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0,
    });
    return response;
  } catch (error) { return profileFailure(error); }
}
