import type { SeniorHighCatalog, SeniorHighItem, SeniorHighPaper, SeniorHighOption } from "@/lib/senior-high/types";
import { supabase } from "@/lib/supabase/client";

export const SENIOR_HIGH_OVERRIDE_SLUG = "senior-high-question-overrides";

export type SeniorHighQuestionPatch = Partial<Pick<SeniorHighItem, "stem" | "options" | "answer" | "analysis">>;

export type SeniorHighQuestionOverride = {
  deleted?: boolean;
  patch?: SeniorHighQuestionPatch;
  updatedAt?: string;
  updatedBy?: string;
  action?: "update" | "delete";
};

export type SeniorHighQuestionOverrides = Record<string, SeniorHighQuestionOverride>;

export async function loadSeniorHighQuestionOverrides(): Promise<SeniorHighQuestionOverrides> {
  const { data } = await supabase
    .from("managed_content_pages")
    .select("meta_json")
    .eq("slug", SENIOR_HIGH_OVERRIDE_SLUG)
    .eq("status", "published")
    .maybeSingle();
  const meta = data?.meta_json;
  if (!meta || typeof meta !== "object" || !("overrides" in meta) || typeof meta.overrides !== "object") return {};
  return meta.overrides as SeniorHighQuestionOverrides;
}

export function applySeniorHighItemOverride(item: SeniorHighItem, overrides: SeniorHighQuestionOverrides): SeniorHighItem {
  return { ...item, ...(overrides[item.id]?.patch ?? {}) };
}

function applyPaperOverrides(paper: SeniorHighPaper, overrides: SeniorHighQuestionOverrides): SeniorHighPaper {
  const questions = paper.questions
    .filter((question) => !overrides[question.id]?.deleted)
    .map((question) => applySeniorHighItemOverride(question, overrides));
  return { ...paper, questions, question_count: questions.length };
}

export function applySeniorHighCatalogOverrides(
  catalog: SeniorHighCatalog,
  overrides: SeniorHighQuestionOverrides,
): SeniorHighCatalog {
  const applyCollection = (items: SeniorHighItem[]) => items
    .filter((item) => !overrides[item.id]?.deleted)
    .map((item) => applySeniorHighItemOverride(item, overrides));
  return {
    ...catalog,
    knowledge: applyCollection(catalog.knowledge),
    practice: applyCollection(catalog.practice),
    papers: catalog.papers.map((paper) => applyPaperOverrides(paper, overrides)),
  };
}

export function answerOptions(item: SeniorHighItem): SeniorHighOption[] {
  return item.options ?? [];
}
