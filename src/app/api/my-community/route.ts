import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { COMMUNITY_READ_KEY, nextCommunityCursor } from "@/lib/community/inbox";
import { loadCommunityInbox } from "@/lib/community/inbox-server";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
async function authorize(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return { response: json({ error: "留言服务暂时不可用。" }, 503) };
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { response: json({ error: "请先登录后查看自己的帖子与留言。" }, 401) };
  const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return { response: json({ error: "登录已失效，请重新登录。" }, 401) };
  return { client, user };
}

export async function GET(request: NextRequest) {
  const auth = await authorize(request);
  if ("response" in auth) return auth.response;
  try {
    return json(await loadCommunityInbox(auth.client, auth.user.id, auth.user.user_metadata[COMMUNITY_READ_KEY], request.nextUrl.searchParams.get("summary") === "1"));
  } catch { return json({ error: "帖子与留言暂时无法读取，请稍后重试。" }, 503); }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin) return json({ error: "请求来源无效。" }, 403);
  const auth = await authorize(request);
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null);
  if (typeof body?.until !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(body.until) || !Number.isFinite(Date.parse(body.until))) return json({ error: "已读时间无效。" }, 400);
  const readAt = nextCommunityCursor(auth.user.user_metadata[COMMUNITY_READ_KEY], body.until);
  // GoTrue merges these metadata keys, preserving concurrent nickname/avatar edits.
  const { error } = await auth.client.auth.admin.updateUserById(auth.user.id, { user_metadata: { [COMMUNITY_READ_KEY]: readAt } });
  if (error) return json({ error: "已读状态保存失败，请重试。" }, 503);
  return json({ readAt });
}
