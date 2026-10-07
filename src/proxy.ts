import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  FREE_PREVIEW_VISITOR_COOKIE,
  FREE_PREVIEW_VISITOR_MAX_AGE,
  isFreePreviewVisitorId,
} from "@/lib/free-preview-visitor";
import { getBbcAssetArticle, isFreeBbc2015AssetPath } from "@/lib/articles/bbc-free-access.mjs";
import { getManagedMediaUrl, getStaticMediaAddress, getSupabaseStorageUrl, isLegacyCosOnlyMediaPath } from "@/lib/media/url";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const automatedUserAgent = /bot\b|crawl|spider|slurp|headlesschrome|googleother|lighthouse/i;

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const staticMedia = getStaticMediaAddress(path);
  const isBbcAsset =
    path.startsWith("/subtitles/bbc/") ||
    path.startsWith("/audio/bbc/") ||
    path.startsWith("/api/bbc-audio/");
  const isFreeBbcAsset = isBbcAsset && isFreeBbc2015AssetPath(path);
  const bbcAssetArticle = isBbcAsset ? getBbcAssetArticle(path) : null;

  if (staticMedia && !isBbcAsset) {
    if (process.env.NODE_ENV === "development" && /^\/audio\/(?:new-concept\/(?:book2|book1-uk|book2-uk)|new-concept-sentences\/book2)\//.test(path)) {
      return NextResponse.next({ request });
    }
    if (staticMedia.bucket === "audio" || staticMedia.bucket === "video" || staticMedia.bucket === "videos") {
      if (isLegacyCosOnlyMediaPath(staticMedia.bucket, staticMedia.path)) {
        return NextResponse.rewrite(new URL(getManagedMediaUrl(staticMedia.bucket, staticMedia.path), request.url));
      }
      const directUrl = getSupabaseStorageUrl(staticMedia.bucket, staticMedia.path);
      if (directUrl) return NextResponse.rewrite(new URL(directUrl));
      return NextResponse.next({ request });
    }
    if (process.env.COS_MEDIA_ENABLED !== "true") {
      return NextResponse.next({ request });
    }
    const target = new URL(getManagedMediaUrl(staticMedia.bucket, staticMedia.path), request.url);
    return NextResponse.rewrite(target);
  }

  if (
    path !== "/robots.txt" &&
    automatedUserAgent.test(request.headers.get("user-agent") ?? "")
  ) {
    return new NextResponse("Automated access is not allowed.", {
      status: 403,
      headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  const existingVisitorId = request.cookies.get(FREE_PREVIEW_VISITOR_COOKIE)?.value;
  const visitorId = isFreePreviewVisitorId(existingVisitorId)
    ? existingVisitorId
    : crypto.randomUUID();

  request.cookies.set(FREE_PREVIEW_VISITOR_COOKIE, visitorId);

  let response = NextResponse.next({ request });

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, options, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, options, value }) => {
            response.cookies.set(name, value, options);
          });
          Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
        },
      },
    });

    await supabase.auth.getClaims();

    if (isBbcAsset && !isFreeBbcAsset) {
      const result = bbcAssetArticle
        ? await supabase.rpc("claim_paid_content_access", {
            _content_key: `bbc-article:${bbcAssetArticle.articleId}`,
            _free_limit: 1,
            _project_key: "bbc",
            _visitor_id: visitorId,
          })
        : await supabase.rpc("can_access_project", { _project_key: "bbc" });

      if (result.error || result.data !== true) {
        return new NextResponse("BBC membership required.", {
          status: 403,
          headers: { "Cache-Control": "private, no-store" },
        });
      }
    }
  } else if (isBbcAsset && !isFreeBbcAsset) {
    return new NextResponse("BBC membership check unavailable.", {
      status: 503,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  if (!isFreePreviewVisitorId(existingVisitorId)) {
    response.cookies.set(FREE_PREVIEW_VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      maxAge: FREE_PREVIEW_VISITOR_MAX_AGE,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/audio/bbc/:path*",
    "/api/bbc-audio/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico)$).*)",
  ],
};
