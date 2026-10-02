import { NextRequest, NextResponse } from "next/server";
import { getSignedCosMediaUrl } from "@/lib/cos/storage";
import { getSupabaseStorageUrl, isLegacyCosOnlyMediaPath } from "@/lib/media/url";
import type { ManagedMediaBucket } from "@/lib/media/url";

export const runtime = "nodejs";

const mediaBuckets = new Set<ManagedMediaBucket>(["audio", "images", "video", "videos", "documents"]);

export async function GET(request: NextRequest) {
  const bucket = request.nextUrl.searchParams.get("bucket") as ManagedMediaBucket | null;
  const path = request.nextUrl.searchParams.get("path");
  if (!bucket || !mediaBuckets.has(bucket) || !path) {
    return NextResponse.json({ error: "Invalid media path." }, { status: 400 });
  }

  const cleanPath = path.replace(/^\/+|\/+$/g, "");
  const isBbcAudio = bucket === "audio" && /^bbc(?:\/|$)/i.test(cleanPath);
  if (((bucket === "audio" && !isBbcAudio) || bucket === "video" || bucket === "videos")
    && !isLegacyCosOnlyMediaPath(bucket, cleanPath)) {
    const directUrl = getSupabaseStorageUrl(bucket, cleanPath);
    return directUrl
      ? NextResponse.redirect(directUrl, { status: 307, headers: { "Cache-Control": "public, max-age=31536000, immutable" } })
      : new NextResponse("Media unavailable", { status: 404 });
  }

  if (process.env.COS_MEDIA_ENABLED !== "true") return new NextResponse("Not found", { status: 404 });

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
