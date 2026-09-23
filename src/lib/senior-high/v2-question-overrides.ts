import type { SeniorHighQuestion, SeniorHighSet } from "@/lib/senior-high/v2-types";
import { supabase } from "@/lib/supabase/client";

export const SENIOR_HIGH_V2_OVERRIDE_SLUG = "senior-high-v2-question-overrides";

export type SeniorHighQuestionOverridePatch = Partial<Pick<
  SeniorHighQuestion,
  "promptBlocks" | "options" | "answerSpec" | "explanationBlocks" | "correctionStatement" | "writingFrame"
>>;

export type SeniorHighQuestionOverride = {
  deleted?: boolean;
  patch?: SeniorHighQuestionOverridePatch;
  updatedAt?: string;
  updatedBy?: string;
};

export type SeniorHighQuestionOverrides = Record<string, SeniorHighQuestionOverride>;

export async function loadSeniorHighQuestionOverrides(): Promise<SeniorHighQuestionOverrides> {
  const { data } = await supabase
    .from("managed_content_pages")
    .select("meta_json")
    .eq("slug", SENIOR_HIGH_V2_OVERRIDE_SLUG)
    .eq("status", "published")
    .maybeSingle();
  const meta = data?.meta_json;
  if (!meta || typeof meta !== "object" || !("overrides" in meta) || typeof meta.overrides !== "object") return {};
  return meta.overrides as SeniorHighQuestionOverrides;
}

export async function saveSeniorHighQuestionOverrides(adminUserId: string, overrides: SeniorHighQuestionOverrides) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("managed_content_pages").upsert({
    created_by: adminUserId,
    meta_json: { overrides, contentVersion: 1, audit: { updatedAt: now, updatedBy: adminUserId } },
    module: "training",
    published_at: now,
    slug: SENIOR_HIGH_V2_OVERRIDE_SLUG,
    status: "published",
    summary: "高考英语题目管理员覆盖内容",
    template_key: "senior_high_v2_question_overrides",
    title: "高考英语题目覆盖内容",
    updated_at: now,
  }, { onConflict: "slug" });
  return error;
}

export function applySeniorHighQuestionOverrides(set: SeniorHighSet, overrides: SeniorHighQuestionOverrides): SeniorHighSet {
  return {
    ...set,
    sections: set.sections.map((section) => ({
      ...section,
      groups: section.groups.map((group) => ({
        ...group,
        questions: group.questions
          .filter((question) => !overrides[question.id]?.deleted)
          .map((question) => ({ ...question, ...(overrides[question.id]?.patch ?? {}) })),
      })).filter((group) => group.questions.length > 0),
    })).filter((section) => section.groups.length > 0),
  };
}
