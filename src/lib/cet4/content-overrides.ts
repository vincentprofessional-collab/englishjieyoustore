import { supabase } from "@/lib/supabase/client";
import type { SeniorHighSet } from "@/lib/senior-high/v2-types";

export const CET4_CONTENT_OVERRIDE_SLUG = "cet4-content-overrides";

export type ExamContentOverrideScope = "cet4" | "cet6" | "senior-high" | "kaoyan";

const CONTENT_OVERRIDE_SLUGS: Record<ExamContentOverrideScope, string> = {
  cet4: CET4_CONTENT_OVERRIDE_SLUG,
  cet6: "cet6-content-overrides",
  "senior-high": "senior-high-v2-content-overrides",
  kaoyan: "kaoyan-content-overrides",
};

export function getExamContentOverrideSlug(scope: ExamContentOverrideScope = "cet4") {
  return CONTENT_OVERRIDE_SLUGS[scope];
}

export type Cet4SetOverride = {
  deleted?: boolean;
  set?: SeniorHighSet;
  updatedAt?: string;
  updatedBy?: string;
};

export type Cet4ContentOverrides = Record<string, Cet4SetOverride>;

export async function getCet4AdminUserId() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return "";
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return !profileError && profile?.role === "admin" ? user.id : "";
}

export async function loadCet4ContentOverrides(scope: ExamContentOverrideScope = "cet4"): Promise<Cet4ContentOverrides> {
  const slug = getExamContentOverrideSlug(scope);
  const { data, error } = await supabase.from("managed_content_pages").select("meta_json").eq("slug", slug).eq("status", "published").maybeSingle();
  if (error) throw new Error(error.message);
  const meta = data?.meta_json;
  if (!meta || typeof meta !== "object" || !("sets" in meta) || !meta.sets || typeof meta.sets !== "object" || Array.isArray(meta.sets)) return {};
  return meta.sets as Cet4ContentOverrides;
}

export async function saveCet4ContentOverrides(adminUserId: string, overrides: Cet4ContentOverrides, scope: ExamContentOverrideScope = "cet4") {
  const now = new Date().toISOString();
  const slug = getExamContentOverrideSlug(scope);
  const label = scope === "cet4" ? "大学英语四级" : scope === "cet6" ? "大学英语六级" : scope === "kaoyan" ? "考研英语" : "高中英语";
  const { error } = await supabase.from("managed_content_pages").upsert({
    created_by: adminUserId,
    meta_json: { sets: overrides, contentVersion: 1, audit: { updatedAt: now, updatedBy: adminUserId } },
    module: "training",
    published_at: now,
    slug,
    status: "published",
    summary: `${label}真题与题型管理员维护内容`,
    template_key: "senior_high_v2_question_overrides",
    title: `${label}真题与题型维护内容`,
    updated_at: now,
  }, { onConflict: "slug" });
  if (error) throw new Error(error.message);
}
