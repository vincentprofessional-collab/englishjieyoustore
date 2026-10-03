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
  if (!mediaUrl) return new NextResponse("Media unavailable", { status: 404 });

  try {
    const range = request.headers.get("range");
    const upstream = await fetch(mediaUrl, {
      cache: "no-store",
      headers: range ? { Range: range } : undefined,
    });
    if (!upstream.ok && upstream.status !== 206) {
      return new NextResponse("Media unavailable", { status: upstream.status });
    }

    const headers = new Headers({
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Content-Type": upstream.headers.get("content-type") ?? "video/mp4",
      "X-Content-Type-Options": "nosniff",
    });
    for (const name of ["content-length", "content-range", "etag", "last-modified"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }

    return new NextResponse(upstream.body, { headers, status: upstream.status });
  } catch {
    return new NextResponse("Media unavailable", { status: 502 });
  }
}
