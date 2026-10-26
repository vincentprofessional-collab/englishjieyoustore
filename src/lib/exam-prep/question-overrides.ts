import { supabase } from "@/lib/supabase/client";

export type ExamPrepOption = { label: string; text: string };
export type ExamPrepQuestion = {
  id?: string;
  number: number;
  label?: string;
  stem?: string;
  prompt?: string;
  options?: ExamPrepOption[];
  optionGroups?: ExamPrepOption[][];
  answer?: string | null;
  answerMode?: string;
  responseType?: string;
  explanation?: string;
  reviewRequired?: boolean;
  reviewReasons?: string[];
  source?: {
    file?: string;
    answerFile?: string;
    answerSourceFile?: string;
    explanationSourceFile?: string;
    path?: string;
    page?: number;
    pageVerified?: boolean;
    promptVerified?: boolean;
    optionPages?: (number | null)[];
    optionsVerified?: boolean;
    answerSourceVerified?: boolean;
    explanationSourceVerified?: boolean;
    passageSourceFile?: string;
    passageSourcePath?: string;
    passagePage?: number;
    passagePageVerified?: boolean;
    passageVerified?: boolean;
    answerSourcePage?: number;
    answerSourceRaw?: string;
    unpairedAnswerKey?: string;
    explanationSourcePage?: number;
    section?: number;
    passage?: number;
  };
  group?: string;
  difficulty?: string;
  passage?: string;
  passageTitle?: string;
};

export type ExamPrepQuestionPatch = Partial<ExamPrepQuestion>;
export type ExamPrepQuestionOverride = { deleted?: boolean; patch?: ExamPrepQuestionPatch };
export type ExamPrepQuestionOverrideState = {
  overrides: Record<string, ExamPrepQuestionOverride>;
  additions: ExamPrepQuestion[];
};
export type ExamPrepSetData = {
  id: string;
  exam: "postgraduate" | "gre" | "gmat";
  title: string;
  questionCount: number;
  answerCount?: number;
  reviewCount?: number;
  questions?: ExamPrepQuestion[];
};

function overrideSlug(exam: string, setId: string) {
  return `exam-prep-question-overrides-${exam}-${setId}`.slice(0, 120);
}

export async function loadExamPrepQuestionOverrides(exam: string, setId: string): Promise<ExamPrepQuestionOverrideState> {
  const { data } = await supabase
    .from("managed_content_pages")
    .select("meta_json")
    .eq("slug", overrideSlug(exam, setId))
    .eq("status", "published")
    .maybeSingle();
  const meta = data?.meta_json;
  if (!meta || typeof meta !== "object") return { overrides: {}, additions: [] };
  const value = meta as Partial<ExamPrepQuestionOverrideState>;
  return {
    overrides: value.overrides && typeof value.overrides === "object" ? value.overrides : {},
    additions: Array.isArray(value.additions) ? value.additions : [],
  };
}

export async function saveExamPrepQuestionOverrides(
  adminUserId: string,
  exam: string,
  setId: string,
  state: ExamPrepQuestionOverrideState,
) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("managed_content_pages").upsert({
    created_by: adminUserId,
    meta_json: { ...state, contentVersion: 1, audit: { updatedAt: now, updatedBy: adminUserId } },
    module: "training",
    published_at: now,
    slug: overrideSlug(exam, setId),
    status: "published",
    summary: `${exam.toUpperCase()} 题组 ${setId} 的题目编辑`,
    template_key: "exam_prep_question_overrides",
    title: `${exam.toUpperCase()} 题目编辑：${setId}`,
    updated_at: now,
  }, { onConflict: "slug" });
  return error;
}

export function applyExamPrepQuestionOverrides<T extends ExamPrepSetData>(
  set: T,
  state: ExamPrepQuestionOverrideState,
): T {
  const questions = (set.questions || [])
    .filter((question) => !state.overrides[question.id || ""]?.deleted)
    .map((question) => ({ ...question, ...(state.overrides[question.id || ""]?.patch || {}) }));
  questions.push(...state.additions);
  return {
    ...set,
    questions,
    questionCount: questions.length,
    answerCount: questions.filter((question) => Boolean(question.answer)).length,
    reviewCount: questions.filter((question) => question.reviewRequired).length,
  };
}
