import { NextRequest, NextResponse } from "next/server";
import { getSignedCosMediaUrl } from "@/lib/cos/storage";
import type { ManagedMediaBucket } from "@/lib/media/url";

export const runtime = "nodejs";

const mediaBuckets = new Set<ManagedMediaBucket>(["audio", "images", "video", "videos", "documents"]);

export async function GET(request: NextRequest) {
  if (process.env.COS_MEDIA_ENABLED !== "true") {
    return new NextResponse("Not found", { status: 404 });
  }

  const bucket = request.nextUrl.searchParams.get("bucket") as ManagedMediaBucket | null;
  const path = request.nextUrl.searchParams.get("path");
  if (!bucket || !mediaBuckets.has(bucket) || !path) {
    return NextResponse.json({ error: "Invalid media path." }, { status: 400 });
  }

  try {
    const signedUrl = getSignedCosMediaUrl(bucket, path);
    return NextResponse.redirect(signedUrl, {
      status: 307,
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch {
    return NextResponse.json({ error: "Media is unavailable." }, { status: 404 });
  }
}
