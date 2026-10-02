import { NextRequest, NextResponse } from "next/server";

import { getSupabaseStorageUrl } from "@/lib/media/url";
import { isPlayableVocabularyVideoFilename } from "@/lib/vocabulary/videos";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const filename = request.nextUrl.searchParams.get("name");
  if (!filename || !isPlayableVocabularyVideoFilename(filename)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const mediaUrl = getSupabaseStorageUrl("videos", `vocabulary/${filename}`);
  return mediaUrl
    ? NextResponse.redirect(mediaUrl, { status: 307, headers: { "Cache-Control": "public, max-age=31536000, immutable" } })
    : new NextResponse("Media unavailable", { status: 404 });
}
