import type { JuniorHighPaper, JuniorHighQuestion } from "@/lib/junior-high/paper-types";
import { supabase } from "@/lib/supabase/client";

export const JUNIOR_HIGH_OVERRIDE_SLUG = "junior-high-question-overrides";

export type JuniorHighQuestionOverride = {
  deleted?: boolean;
  patch?: Partial<JuniorHighQuestion>;
};

export type JuniorHighQuestionOverrides = Record<string, JuniorHighQuestionOverride>;

export async function loadJuniorHighQuestionOverrides(): Promise<JuniorHighQuestionOverrides> {
  const { data } = await supabase
    .from("managed_content_pages")
    .select("meta_json")
    .eq("slug", JUNIOR_HIGH_OVERRIDE_SLUG)
    .eq("status", "published")
    .maybeSingle();
  const meta = data?.meta_json;
  if (!meta || typeof meta !== "object" || !("overrides" in meta) || typeof meta.overrides !== "object") return {};
  return meta.overrides as JuniorHighQuestionOverrides;
}

export async function saveJuniorHighQuestionOverrides(adminUserId: string, overrides: JuniorHighQuestionOverrides) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("managed_content_pages").upsert({
    created_by: adminUserId,
    meta_json: { overrides, contentVersion: 1 },
    module: "training",
    published_at: now,
    slug: JUNIOR_HIGH_OVERRIDE_SLUG,
    status: "published",
    summary: "中考英语题目管理员覆盖内容",
    template_key: "site_announcement_page",
    title: "中考英语题目覆盖内容",
    updated_at: now,
  }, { onConflict: "slug" });
  return error;
}

export function applyJuniorHighQuestionOverrides(paper: JuniorHighPaper, overrides: JuniorHighQuestionOverrides): JuniorHighPaper {
  const deletedIds = new Set(Object.entries(overrides).filter(([, value]) => value.deleted).map(([id]) => id));
  const questions = paper.questions
    .filter((question) => !deletedIds.has(question.id))
    .map((question) => ({ ...question, ...(overrides[question.id]?.patch ?? {}) }));
  const parts = paper.parts?.map((part) => ({
    ...part,
    groups: part.groups?.map((group) => ({
      ...group,
      questionIds: group.questionIds?.filter((id) => !deletedIds.has(id)),
    })).filter((group) => (group.questionIds?.length ?? 0) > 0),
  })).filter((part) => (part.groups?.length ?? 0) > 0);
  return { ...paper, questions, parts };
}
