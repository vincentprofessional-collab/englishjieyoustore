import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveCurrentMembership, type MembershipEntitlement, type MembershipProfile } from "@/lib/membership/current-membership";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

type CommentRow = {
  id: string;
  post_id: string;
  user_id: string | null;
  display_name: string;
  avatar_url: string | null;
  body: string;
  created_at: string;
  parent_comment_id: string | null;
  reply_to_comment_id: string | null;
};

type CommentProfile = MembershipProfile & { id: string };
type UserEntitlement = MembershipEntitlement & { user_id: string };

export async function GET(request: NextRequest) {
  const postId = request.nextUrl.searchParams.get("postId")?.trim() ?? "";
  if (!UUID_PATTERN.test(postId)) {
    return NextResponse.json({ error: "帖子编号无效。" }, { status: 400 });
  }
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "留言服务暂不可用。" }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const post = await supabase
    .from("managed_content_pages")
    .select("id")
    .eq("id", postId)
    .eq("status", "published")
    .like("slug", "guide-%")
    .maybeSingle();
  if (post.error) return NextResponse.json({ error: "留言暂时无法读取。" }, { status: 503 });
  if (!post.data) return NextResponse.json({ error: "帖子不存在。" }, { status: 404 });

  const result = await supabase
    .from("guide_comments")
    .select("id,post_id,user_id,display_name,avatar_url,body,created_at,parent_comment_id,reply_to_comment_id")
    .eq("post_id", postId)
    .eq("status", "published")
    .order("created_at", { ascending: true });
  if (result.error) return NextResponse.json({ error: "留言暂时无法读取。" }, { status: 503 });

  const comments = (result.data ?? []) as CommentRow[];
  const userIds = [...new Set(comments.flatMap((comment) => comment.user_id ? [comment.user_id] : []))];
  const isPaidByUser = new Map<string, boolean>();
  if (userIds.length) {
    const [profilesResult, entitlementsResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,member_number,membership_status,membership_expires_at")
        .in("id", userIds),
      supabase
        .from("user_project_entitlements")
        .select("user_id,plan,status,starts_at,expires_at,created_at")
        .in("user_id", userIds)
        .order("created_at", { ascending: false }),
    ]);
    if (profilesResult.error || entitlementsResult.error) {
      return NextResponse.json({ error: "会员状态暂时无法读取。" }, { status: 503 });
    }

    const profiles = new Map(((profilesResult.data ?? []) as CommentProfile[]).map((profile) => [profile.id, profile]));
    const entitlementsByUser = new Map<string, MembershipEntitlement[]>();
    for (const entitlement of (entitlementsResult.data ?? []) as UserEntitlement[]) {
      const group = entitlementsByUser.get(entitlement.user_id) ?? [];
      group.push(entitlement);
      entitlementsByUser.set(entitlement.user_id, group);
    }
    const now = Date.now();
    for (const userId of userIds) {
      const membership = resolveCurrentMembership(profiles.get(userId), entitlementsByUser.get(userId) ?? [], now);
      isPaidByUser.set(userId, membership.state === "active");
    }
  }

  return NextResponse.json({
    comments: comments.map(({ user_id, ...comment }) => ({
      ...comment,
      is_guest: user_id === null,
      is_paid_member: user_id ? isPaidByUser.get(user_id) ?? false : false,
    })),
  });
}
