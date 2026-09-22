import { NextResponse } from "next/server";
import { PROFILE_HEADERS, profileFailure, profileViewer } from "@/lib/user-profile-api";
import { collectionCsv, exportProfileData } from "@/lib/user-profile-data";
import { ProfileError } from "@/lib/user-profile-input";

export async function GET(request: Request) {
  try {
    const userId = await profileViewer("export", 3);
    const format = new URL(request.url).searchParams.get("format") ?? "json";
    if (format !== "json" && format !== "csv") throw new ProfileError("invalid_format");
    const data = await exportProfileData(userId);
    const filename = `showle-${new Date().toISOString().slice(0, 10)}.${format}`;
    return new NextResponse(format === "csv" ? collectionCsv(data.collection) : JSON.stringify(data, null, 2), {
      headers: { ...PROFILE_HEADERS, "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) { return profileFailure(error); }
}
