import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  FREE_PREVIEW_VISITOR_COOKIE,
  FREE_PREVIEW_VISITOR_MAX_AGE,
  isFreePreviewVisitorId,
} from "@/lib/free-preview-visitor";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function proxy(request: NextRequest) {
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|ico)$).*)",
  ],
};
