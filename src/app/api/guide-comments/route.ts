import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GUIDE_COMMENT_COLUMNS as COLUMNS, loadPublicGuideComments, publicComments, serviceClient, type CommentRow } from "@/lib/guide/public-comments";

export const dynamic = "force-dynamic";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function failure(error: string, status = 503) { return NextResponse.json({ error }, { status }); }
async function publishedPost(db: SupabaseClient, postId: string) {
  return db.from("managed_content_pages").select("id").eq("id", postId).eq("status", "published").like("slug", "guide-%").maybeSingle();
}


export async function GET(request: NextRequest) {
  const postId = request.nextUrl.searchParams.get("postId")?.trim() ?? "";
  if (!UUID_PATTERN.test(postId)) return failure("帖子编号无效。", 400);
  const db = serviceClient(); if (!db) return failure("留言服务暂不可用。");
  const post = await publishedPost(db, postId);
  if (post.error) return failure("帖子暂时无法读取。");
  if (!post.data) return failure("帖子不存在。", 404);
  try {
    return NextResponse.json({ comments: await loadPublicGuideComments(db, postId) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return failure("留言暂时无法读取，请稍后重试。");
  }
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
