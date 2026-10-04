import { NextRequest, NextResponse } from "next/server";
import { getSignedCosMediaUrl } from "@/lib/cos/storage";
import { getSupabaseStorageUrl, isLegacyCosOnlyMediaPath } from "@/lib/media/url";
import type { ManagedMediaBucket } from "@/lib/media/url";

export const runtime = "nodejs";

const mediaBuckets = new Set<ManagedMediaBucket>(["audio", "images", "video", "videos", "documents"]);

const forwardedAudioHeaders = [
  "accept-ranges",
  "content-length",
  "content-range",
  "content-type",
  "etag",
  "last-modified",
] as const;

async function streamListeningAudio(request: NextRequest, path: string) {
  const sourceUrl = getSupabaseStorageUrl("audio", path);
  if (!sourceUrl) return new NextResponse("Media unavailable", { status: 404 });

  const upstreamRequestHeaders = new Headers();
  for (const header of ["range", "if-range"] as const) {
    const value = request.headers.get(header);
    if (value) upstreamRequestHeaders.set(header, value);
  }

  let upstream: Response | null = null;
  try {
    upstream = await fetch(sourceUrl, {
      cache: "no-store",
      headers: upstreamRequestHeaders,
      method: request.method,
      signal: request.signal,
    });
  } catch {
    upstream = null;
  }

  if (!upstream || [403, 404].includes(upstream.status) || upstream.status >= 500) {
    if (process.env.COS_MEDIA_ENABLED === "true") {
      try {
        const cosUrl = getSignedCosMediaUrl("audio", path);
        const cosResponse = await fetch(cosUrl, {
          cache: "no-store",
          headers: upstreamRequestHeaders,
          method: "GET",
          signal: request.signal,
        });
        if ([200, 206, 304, 416].includes(cosResponse.status)) {
          upstream = cosResponse;
        }
      } catch {
        // Preserve the Supabase response if the legacy COS copy is also unavailable.
      }
    }
  }

  if (!upstream) {
    return new NextResponse("Audio unavailable", { status: 502 });
  }

  if (![200, 206, 304, 403, 404, 416].includes(upstream.status)) {
    return new NextResponse("Audio unavailable", { status: 502 });
  }

  const responseHeaders = new Headers({
    "Cache-Control": "public, max-age=600, stale-while-revalidate=3600",
    "X-Content-Type-Options": "nosniff",
  });
  for (const header of forwardedAudioHeaders) {
    const value = upstream.headers.get(header);
    if (value) responseHeaders.set(header, value);
  }

  return new Response(request.method === "HEAD" ? null : upstream.body, {
    headers: responseHeaders,
    status: upstream.status,
  });
}

async function handleMediaRequest(request: NextRequest) {
  const bucket = request.nextUrl.searchParams.get("bucket") as ManagedMediaBucket | null;
  const path = request.nextUrl.searchParams.get("path");
  if (!bucket || !mediaBuckets.has(bucket) || !path) {
    return NextResponse.json({ error: "Invalid media path." }, { status: 400 });
  }

  const cleanPath = path.replace(/^\/+|\/+$/g, "");
  const isBbcAudio = bucket === "audio" && /^bbc(?:\/|$)/i.test(cleanPath);
  if (bucket === "audio" && /^listening\//i.test(cleanPath)) {
    return streamListeningAudio(request, cleanPath);
  }

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

export async function GET(request: NextRequest) {
  return handleMediaRequest(request);
}

export async function HEAD(request: NextRequest) {
  return handleMediaRequest(request);
}
