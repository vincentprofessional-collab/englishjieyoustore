import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getBbcArticleById } from "@/lib/articles/bbc";

export const runtime = "nodejs";

const COMMENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

type MemberPlan = "monthly" | "quarterly" | "yearly" | "lifetime";
type CurrentMemberProfile = {
  id: string;
  avatar_url: string | null;
  member_number: number | null;
  membership_status: string | null;
  membership_expires_at: string | null;
};
type MembershipEntitlement = {
  created_at: string | null;
  expires_at: string;
  plan: string;
  starts_at: string;
  status: string;
  user_id: string;
};

function readMemberPlan(value: unknown): MemberPlan | null {
  return value === "monthly" || value === "quarterly" || value === "yearly" || value === "lifetime"
    ? value
    : null;
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const articleId = request.nextUrl.searchParams.get("articleId")?.trim() ?? "";
  if (!getBbcArticleById(articleId)) {
    return NextResponse.json({ error: "这篇 BBC 文章不存在。" }, { status: 404 });
  }
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "留言服务暂不可用。" }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const withThreads = await supabase
    .from("bbc_article_comments")
    .select("id,article_id,author_name,body,created_at,user_id,avatar_url,member_plan,member_number,parent_comment_id,reply_to_comment_id")
    .eq("article_id", articleId)
    .order("created_at", { ascending: false })
    .limit(100);
  const commentsResult = withThreads.error
    ? await supabase
        .from("bbc_article_comments")
        .select("id,article_id,author_name,body,created_at,user_id,avatar_url,member_plan,member_number")
        .eq("article_id", articleId)
        .order("created_at", { ascending: false })
        .limit(100)
    : withThreads;
  if (commentsResult.error) {
    return NextResponse.json({ error: "留言暂时无法读取。" }, { status: 503 });
  }

  const comments = commentsResult.data ?? [];
  const userIds = [...new Set(comments.flatMap((comment) => comment.user_id ? [comment.user_id] : []))];
  if (!userIds.length) return NextResponse.json({ comments });

  const profilesResult = await supabase
    .from("profiles")
    .select("id,avatar_url,member_number,membership_status,membership_expires_at")
    .in("id", userIds);
  if (profilesResult.error) return NextResponse.json({ comments });

  const profiles = new Map(
    ((profilesResult.data ?? []) as CurrentMemberProfile[]).map((profile) => [profile.id, profile]),
  );
  const now = new Date();
  const nowIso = now.toISOString();
  const entitlementsResult = await supabase
    .from("user_project_entitlements")
    .select("user_id,plan,status,starts_at,expires_at,created_at")
    .in("user_id", userIds)
    .order("created_at", { ascending: false });
  if (entitlementsResult.error) {
    return NextResponse.json({ error: "会员状态暂时无法读取。" }, { status: 503 });
  }
  const entitlementsByUser = new Map<string, MembershipEntitlement[]>();
  for (const entitlement of (entitlementsResult.data ?? []) as MembershipEntitlement[]) {
    const group = entitlementsByUser.get(entitlement.user_id) ?? [];
    group.push(entitlement);
    entitlementsByUser.set(entitlement.user_id, group);
  }

  const refreshedComments = comments.map((comment) => {
    if (!comment.user_id) return comment;
    const profile = profiles.get(comment.user_id);
    if (!profile) return { ...comment, member_number: null, member_plan: null, membership_state: "guest" as const };
    const userEntitlements = entitlementsByUser.get(comment.user_id) ?? [];
    const activeEntitlement = userEntitlements.find((entitlement) =>
      entitlement.status === "active" &&
      new Date(entitlement.starts_at).getTime() <= now.getTime() &&
      new Date(entitlement.expires_at).getTime() > now.getTime(),
    );
    let memberPlan = activeEntitlement ? readMemberPlan(activeEntitlement.plan) : null;
    const legacyLifetime = profile.membership_status === "lifetime";
    const legacyPaid = profile.membership_status === "paid";
    const legacyPaidActive = legacyPaid &&
      (!profile.membership_expires_at || new Date(profile.membership_expires_at).getTime() > now.getTime());
    if (!memberPlan && legacyLifetime) memberPlan = "lifetime";
    else if (!memberPlan && legacyPaid) memberPlan = "yearly";
    if (!memberPlan) {
      memberPlan = userEntitlements
        .map((entitlement) => readMemberPlan(entitlement.plan))
        .find((plan): plan is MemberPlan => Boolean(plan)) ?? null;
    }
    const membershipState = activeEntitlement || legacyLifetime || legacyPaidActive
      ? "active"
      : memberPlan || profile.member_number != null
        ? "expired"
        : "guest";
    return {
      ...comment,
      avatar_url: profile.avatar_url ?? comment.avatar_url,
      member_number: membershipState !== "guest" ? profile.member_number : null,
      member_plan: memberPlan,
      membership_state: membershipState,
    };
  });

  return NextResponse.json({ comments: refreshedComments });
}

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "留言服务暂不可用。" }, { status: 503 });
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const articleId = typeof payload?.articleId === "string" ? payload.articleId.trim() : "";
  const authorName = typeof payload?.authorName === "string" ? payload.authorName.trim() : "访客";
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  const website = typeof payload?.website === "string" ? payload.website.trim() : "";
  const parentCommentId = typeof payload?.parentCommentId === "string" ? payload.parentCommentId.trim() : null;
  const replyToCommentId = typeof payload?.replyToCommentId === "string" ? payload.replyToCommentId.trim() : null;

  if (website) return NextResponse.json({ error: "无法提交留言。" }, { status: 400 });
  if (!getBbcArticleById(articleId)) {
    return NextResponse.json({ error: "这篇 BBC 文章不存在。" }, { status: 404 });
  }
  if (!body || body.length > 1000) {
    return NextResponse.json({ error: "昵称最多 40 字，留言最多 1000 字。" }, { status: 400 });
  }
  if (
    (parentCommentId !== null && !COMMENT_ID_PATTERN.test(parentCommentId)) ||
    (replyToCommentId !== null && !COMMENT_ID_PATTERN.test(replyToCommentId)) ||
    (!parentCommentId && replyToCommentId)
  ) {
    return NextResponse.json({ error: "回复目标无效，请刷新页面后重试。" }, { status: 400 });
  }

  const authorization = request.headers.get("authorization") ?? "";
  const bearerToken = /^Bearer\s+(.+)$/i.exec(authorization)?.[1]?.trim() ?? "";
  const authClient = createClient(supabaseUrl, supabaseAnonKey ?? serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null = null;
  if (bearerToken) {
    const authResult = await authClient.auth.getUser(bearerToken);
    if (authResult.error || !authResult.data.user) {
      return NextResponse.json({ error: "登录状态已失效，请重新登录后留言。" }, { status: 401 });
    }
    user = authResult.data.user;
  }
  if (!user && (!authorName || authorName.length > 40)) {
    return NextResponse.json({ error: "昵称最多 40 字，留言最多 1000 字。" }, { status: 400 });
  }

  const ipAddress =
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ??
    "unknown";
  const ipHash = createHmac("sha256", process.env.BBC_COMMENT_RATE_LIMIT_SALT || serviceKey)
    .update(ipAddress)
    .digest("hex");
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let displayName = authorName || "访客";
  let avatarUrl: string | null = null;
  let memberPlan: MemberPlan | null = null;
  let memberNumber: number | null = null;
  let membershipState: "active" | "expired" | "guest" = "guest";

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("display_name,avatar_url,membership_status,membership_expires_at,member_number")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      return NextResponse.json({ error: "会员资料暂时无法读取，请稍后再试。" }, { status: 503 });
    }

    displayName = String(
      profile?.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "注册用户",
    ).trim().slice(0, 40) || "注册用户";
    avatarUrl = profile?.avatar_url || (typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null);
    const profileMemberNumber = profile?.member_number;
    memberNumber = typeof profileMemberNumber === "number" && Number.isInteger(profileMemberNumber)
      ? profileMemberNumber
      : null;

    const now = new Date();
    const nowIso = now.toISOString();
    const { data: entitlements } = await supabase
      .from("user_project_entitlements")
      .select("plan,status,starts_at,expires_at,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const records = (entitlements ?? []) as Omit<MembershipEntitlement, "user_id">[];
    const activeEntitlement = records.find((entitlement) =>
      entitlement.status === "active" &&
      new Date(entitlement.starts_at).getTime() <= now.getTime() &&
      new Date(entitlement.expires_at).getTime() > now.getTime(),
    );
    memberPlan = activeEntitlement ? readMemberPlan(activeEntitlement.plan) : null;
    if (!memberPlan && profile?.membership_status === "lifetime") {
      memberPlan = "lifetime";
    } else if (
      !memberPlan &&
      profile?.membership_status === "paid" &&
      (!profile.membership_expires_at || new Date(profile.membership_expires_at).getTime() > now.getTime())
    ) {
      memberPlan = "yearly";
    }
    if (!memberPlan) {
      memberPlan = records
        .map((entitlement) => readMemberPlan(entitlement.plan))
        .find((plan): plan is MemberPlan => Boolean(plan)) ??
        (profile?.membership_status === "paid" ? "yearly" : null);
    }
    const legacyLifetime = profile?.membership_status === "lifetime";
    const legacyPaidActive = profile?.membership_status === "paid" &&
      (!profile.membership_expires_at || new Date(profile.membership_expires_at).getTime() > now.getTime());
    membershipState = activeEntitlement || legacyLifetime || legacyPaidActive
      ? "active"
      : memberPlan || memberNumber != null
        ? "expired"
        : "guest";
    if (membershipState === "guest") memberNumber = null;
  }

  const { data, error } = await supabase.rpc("post_bbc_article_comment", {
    p_article_id: articleId,
    p_author_name: displayName,
    p_body: body,
    p_ip_hash: ipHash,
    p_user_id: user?.id ?? null,
    p_avatar_url: avatarUrl,
    p_member_plan: memberPlan,
    p_member_number: memberNumber,
    p_parent_comment_id: parentCommentId,
    p_reply_to_comment_id: replyToCommentId,
  });

  if (error) {
    if (error.code === "P0001" || /rate.?limit/i.test(error.message)) {
      return NextResponse.json({ error: "留言过于频繁，请稍后再试。" }, { status: 429 });
    }
    return NextResponse.json({ error: "留言服务暂不可用。" }, { status: 503 });
  }

  const comment = Array.isArray(data) ? data[0] : data;
  if (!comment) return NextResponse.json({ error: "留言提交失败。" }, { status: 500 });
  return NextResponse.json({ comment: { ...comment, membership_state: membershipState } }, { status: 201 });
}
