import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveCurrentMembership, type MembershipEntitlement, type MembershipProfile } from "@/lib/membership/current-membership";

export const GUIDE_COMMENT_COLUMNS = "id,post_id,user_id,display_name,avatar_url,body,created_at,parent_comment_id,reply_to_comment_id";
export type CommentRow = { id: string; post_id: string; user_id: string | null; display_name: string; avatar_url: string | null; body: string; created_at: string; parent_comment_id: string | null; reply_to_comment_id: string | null };
type CommentProfile = MembershipProfile & { id: string; role?: string; display_name?: string; avatar_url?: string };
export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  return url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
}

export async function publicComments(db: SupabaseClient, comments: CommentRow[]) {
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


export async function loadPublicGuideComments(db: SupabaseClient, postId: string) {
  const result = await db.from("guide_comments").select(GUIDE_COMMENT_COLUMNS).eq("post_id", postId).eq("status", "published").order("created_at", { ascending: true });
  if (result.error) throw new Error("留言暂时无法读取，请稍后重试。");
  return publicComments(db, (result.data ?? []) as CommentRow[]);
}
