import type { SatQuestion, SatSet } from "@/lib/sat/types";
import { supabase } from "@/lib/supabase/client";

export const SAT_QUESTION_OVERRIDE_SLUG = "sat-question-overrides";
export type SatQuestionOverridePatch = Partial<Pick<SatQuestion, "contentBlocks" | "prompt" | "choices" | "correctAnswer" | "rationale" | "choiceRationales">>;
export type SatQuestionOverride = { deleted?: boolean; patch?: SatQuestionOverridePatch; updatedAt?: string; updatedBy?: string };
export type SatQuestionOverrides = Record<string, SatQuestionOverride>;

export async function loadSatQuestionOverrides(): Promise<SatQuestionOverrides> {
  const { data } = await supabase.from("managed_content_pages").select("meta_json").eq("slug", SAT_QUESTION_OVERRIDE_SLUG).eq("status", "published").maybeSingle();
  const meta = data?.meta_json;
  if (!meta || typeof meta !== "object" || !("overrides" in meta) || typeof meta.overrides !== "object") return {};
  return meta.overrides as SatQuestionOverrides;
}

export async function saveSatQuestionOverrides(adminUserId: string, overrides: SatQuestionOverrides) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("managed_content_pages").upsert({
    created_by: adminUserId,
    meta_json: { overrides, contentVersion: 1, audit: { updatedAt: now, updatedBy: adminUserId } },
    module: "training",
    published_at: now,
    slug: SAT_QUESTION_OVERRIDE_SLUG,
    status: "published",
    summary: "SAT 题目管理员覆盖内容",
    template_key: "sat_question_overrides",
    title: "SAT 题目覆盖内容",
    updated_at: now,
  }, { onConflict: "slug" });
  return error;
}

export function applySatQuestionOverrides(set: SatSet, overrides: SatQuestionOverrides): SatSet {
  return { ...set, questions: set.questions.filter((question) => !overrides[question.id]?.deleted).map((question) => ({ ...question, ...(overrides[question.id]?.patch ?? {}) })) };
}
