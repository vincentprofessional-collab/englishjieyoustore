import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveCurrentMembership, type MembershipEntitlement, type MembershipProfile } from "@/lib/membership/current-membership";

export const dynamic = "force-dynamic";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COLUMNS = "id,post_id,user_id,display_name,avatar_url,body,created_at,parent_comment_id,reply_to_comment_id";
type CommentRow = { id: string; post_id: string; user_id: string | null; display_name: string; avatar_url: string | null; body: string; created_at: string; parent_comment_id: string | null; reply_to_comment_id: string | null };
type CommentProfile = MembershipProfile & { id: string; role?: string; display_name?: string; avatar_url?: string };
function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  return url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
}
function failure(error: string, status = 503) { return NextResponse.json({ error }, { status }); }
async function publishedPost(db: SupabaseClient, postId: string) {
  return db.from("managed_content_pages").select("id").eq("id", postId).eq("status", "published").like("slug", "guide-%").maybeSingle();
}

async function publicComments(db: SupabaseClient, comments: CommentRow[]) {
  const ids = [...new Set(comments.flatMap(comment => comment.user_id ? [comment.user_id] : []))];
  const profiles = new Map<string, CommentProfile>();
  const entitlements = new Map<string, MembershipEntitlement[]>();
  if (ids.length) {
    const [profileResult, entitlementResult] = await Promise.all([
      db.from("profiles").select("id,role,display_name,avatar_url,member_number,membership_status,membership_expires_at").in("id", ids),
      db.from("user_project_entitlements").select("user_id,plan,status,starts_at,expires_at,created_at").in("user_id", ids).order("created_at", { ascending: false }),
    ]);
    for (const profile of (profileResult.data ?? []) as CommentProfile[]) profiles.set(profile.id, profile);
    for (const item of (entitlementResult.data ?? []) as (MembershipEntitlement & { user_id: string })[]) {
      const group = entitlements.get(item.user_id) ?? []; group.push(item); entitlements.set(item.user_id, group);
    }
    // Public messages remain readable even when optional membership enrichment fails.
  }
  return comments.map(({ user_id, ...comment }) => {
    const profile = user_id ? profiles.get(user_id) : undefined;
    return { ...comment, display_name: profile?.display_name || comment.display_name, avatar_url: profile?.avatar_url || comment.avatar_url,
      is_admin: Boolean(user_id && profile?.role === "admin"), is_guest: user_id === null,
      is_paid_member: Boolean(user_id && resolveCurrentMembership(profile, entitlements.get(user_id) ?? []).state === "active") };
  });
}

export async function GET(request: NextRequest) {
  const postId = request.nextUrl.searchParams.get("postId")?.trim() ?? "";
  if (!UUID_PATTERN.test(postId)) return failure("帖子编号无效。", 400);
  const db = serviceClient(); if (!db) return failure("留言服务暂不可用。");
  const post = await publishedPost(db, postId);
  if (post.error) return failure("帖子暂时无法读取。");
  if (!post.data) return failure("帖子不存在。", 404);
  const result = await db.from("guide_comments").select(COLUMNS).eq("post_id", postId).eq("status", "published").order("created_at", { ascending: true });
  if (result.error) return failure("留言暂时无法读取，请稍后重试。");
  return NextResponse.json({ comments: await publicComments(db, (result.data ?? []) as CommentRow[]) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return failure("请求来源无效。", 403);
  const input = await request.json().catch(() => null);
  const postId = typeof input?.postId === "string" ? input.postId : "";
  const body = typeof input?.body === "string" ? input.body.trim() : "";
  const clientId = typeof input?.clientId === "string" ? input.clientId : "";
  if (!UUID_PATTERN.test(postId) || !body || body.length > 800 || !/^[a-z0-9-]{8,120}$/i.test(clientId)) return failure("留言内容或帖子编号无效。", 400);
  if (input.website) return failure("留言未发布。", 400);
  const db = serviceClient(); if (!db) return failure("留言服务暂不可用，内容未发布。");
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const auth = token ? await db.auth.getUser(token) : null;
  if (auth?.error || (token && !auth?.data.user)) return failure("登录已失效，请重新登录后发布。", 401);
  const user = auth?.data.user;
  const profileResult = user ? await db.from("profiles").select("display_name,avatar_url,role").eq("id", user.id).maybeSingle() : null;
  if (profileResult?.error) return failure("暂时无法读取账户资料，留言未发布。");
  const post = await publishedPost(db, postId);
  if (post.error) return failure("帖子暂时无法读取，留言未发布。");
  if (!post.data) return failure("帖子不存在或尚未发布。", 404);
  const parentId = input.parentCommentId ?? null, targetId = input.replyToCommentId ?? null;
  if (parentId !== null || targetId !== null) {
    if (typeof parentId !== "string" || typeof targetId !== "string" || !UUID_PATTERN.test(parentId) || !UUID_PATTERN.test(targetId)) return failure("回复目标无效。", 400);
    const refs = await db.from("guide_comments").select("id,parent_comment_id").eq("post_id", postId).eq("status", "published").in("id", [...new Set([parentId, targetId])]);
    if (refs.error) return failure("暂时无法核对原留言，请稍后重试。");
    const root = refs.data?.find(row => row.id === parentId), target = refs.data?.find(row => row.id === targetId);
    if (!root || root.parent_comment_id || !target || (target.id !== root.id && target.parent_comment_id !== root.id)) return failure("原留言已不可用，请刷新帖子后重试。", 400);
  }
  const digest = createHash("sha256").update(`guide-comment-v1:${postId}:${user?.id ?? "guest"}:${clientId}`).digest("hex");
  const id = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-${(parseInt(digest[16], 16) & 3 | 8).toString(16)}${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
  const displayName = String(user ? profileResult?.data?.display_name || user.user_metadata?.display_name || "用户" : input.displayName || "访客").trim().slice(0, 30) || "用户";
  const legacyDate = user && input.legacySync === true && typeof input.createdAt === "string" ? Date.parse(input.createdAt) : NaN;
  const row = { id, post_id: postId, user_id: user?.id ?? null, display_name: displayName, avatar_url: user ? profileResult?.data?.avatar_url || null : null,
    body, status: "published", parent_comment_id: parentId, reply_to_comment_id: targetId,
    ...(Number.isFinite(legacyDate) && legacyDate >= Date.UTC(2015, 0, 1) && legacyDate <= Date.now() ? { created_at: new Date(legacyDate).toISOString() } : {}) };
  const result = await db.from("guide_comments").insert(row).select(COLUMNS).single();
  let saved = result.data as CommentRow | null;
  if (result.error?.code === "23505") {
    const existing = await db.from("guide_comments").select(COLUMNS).eq("id", id).eq("post_id", postId).eq("status", "published").maybeSingle();
    if (existing.data?.user_id === row.user_id && existing.data?.body === body) saved = existing.data;
  }
  if (!saved) return failure("留言未能保存到服务器，内容仍保留在输入框，请稍后重试。");
  return NextResponse.json({ comment: (await publicComments(db, [saved]))[0] }, { headers: { "Cache-Control": "no-store" } });
}
