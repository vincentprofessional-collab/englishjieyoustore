import { NextRequest, NextResponse } from "next/server";

import { getSignedVocabularyVideoUrl } from "@/lib/cos/storage";
import { isPlayableVocabularyVideoFilename } from "@/lib/vocabulary/videos";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (process.env.COS_MEDIA_ENABLED !== "true") {
    return new NextResponse("Not found", { status: 404 });
  }

  const filename = request.nextUrl.searchParams.get("name");
  if (!filename || !isPlayableVocabularyVideoFilename(filename)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const signedUrl = getSignedVocabularyVideoUrl(filename);
    return NextResponse.redirect(signedUrl, {
      status: 307,
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch {
    return new NextResponse("Media unavailable", { status: 404 });
  }
}
