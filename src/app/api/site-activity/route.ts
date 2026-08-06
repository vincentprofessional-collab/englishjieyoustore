import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ActivityEventType = "login" | "logout" | "page_view" | "registration";

type ActivityPayload = {
  durationSeconds?: number;
  eventType?: ActivityEventType;
  pageTitle?: string;
  path?: string;
  referrer?: string;
  sessionId?: string;
  startedAt?: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
const ipSalt =
  process.env.SITE_ANALYTICS_IP_SALT ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "ielts-platform";

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function readDuration(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : 0;
}

function readClientIp(request: NextRequest) {
  const explicitIp =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-client-ip");
  const forwardedIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  return explicitIp?.trim() || forwardedIp || "unknown";
}

function hashValue(value: string) {
  return createHash("sha256").update(`${ipSalt}:${value}`).digest("hex");
}

function stripIpFields<T extends Record<string, unknown>>(value: T) {
  const { ip_hash, visitor_key, ...rest } = value;
  return rest;
}

function isMissingIpColumnError(error: { message?: string } | null) {
  return Boolean(error?.message?.includes("ip_hash") || error?.message?.includes("visitor_key"));
}

function shouldSkipPath(path: string) {
  return path.startsWith("/admin") || path.startsWith("/debug");
}

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const payload = (await request.json().catch(() => ({}))) as ActivityPayload;
  const authorization = request.headers.get("authorization") ?? "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey ?? supabaseAnonKey, {
    global: {
      headers: authorization ? { Authorization: authorization } : {},
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = readString(payload.path, "/");
  const sessionId = readString(payload.sessionId);
  const startedAt = readString(payload.startedAt, new Date().toISOString());
  const durationSeconds = readDuration(payload.durationSeconds);
  const eventType = payload.eventType;
  const userId = user?.id ?? null;
  const ipHash = hashValue(readClientIp(request));
  const visitorKey = ipHash;
  const now = new Date().toISOString();

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId." }, { status: 400 });
  }

  if (shouldSkipPath(path)) {
    return NextResponse.json({ ok: true, skipped: "admin-path" });
  }

  if (userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.role === "admin") {
      return NextResponse.json({ ok: true, skipped: "admin-user" });
    }
  }

  const sessionPayload = {
    duration_seconds: durationSeconds,
    first_path: path,
    id: sessionId,
    ip_hash: ipHash,
    last_path: path,
    last_seen_at: now,
    referrer: readString(payload.referrer) || null,
    started_at: startedAt,
    updated_at: now,
    user_agent: request.headers.get("user-agent"),
    user_id: userId,
    visitor_key: visitorKey,
  };
  const sessionResult = await supabase
    .from("site_activity_sessions")
    .upsert(sessionPayload, { onConflict: "id" });

  if (sessionResult.error && isMissingIpColumnError(sessionResult.error)) {
    const retryResult = await supabase
      .from("site_activity_sessions")
      .upsert(stripIpFields(sessionPayload), { onConflict: "id" });

    if (retryResult.error) {
      return NextResponse.json({ error: retryResult.error.message }, { status: 500 });
    }
  } else if (sessionResult.error) {
    return NextResponse.json({ error: sessionResult.error.message }, { status: 500 });
  }

  if (!eventType) {
    return NextResponse.json({ ok: true });
  }

  const eventPayload = {
    duration_seconds: durationSeconds,
    event_type: eventType,
    ip_hash: ipHash,
    page_title: readString(payload.pageTitle) || null,
    path,
    referrer: readString(payload.referrer) || null,
    session_id: sessionId,
    user_id: userId,
    visitor_key: visitorKey,
  };
  const eventResult = await supabase.from("site_activity_events").insert(eventPayload);

  if (eventResult.error && isMissingIpColumnError(eventResult.error)) {
    const retryResult = await supabase
      .from("site_activity_events")
      .insert(stripIpFields(eventPayload));

    if (retryResult.error) {
      return NextResponse.json({ error: retryResult.error.message }, { status: 500 });
    }
  } else if (eventResult.error) {
    return NextResponse.json({ error: eventResult.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
