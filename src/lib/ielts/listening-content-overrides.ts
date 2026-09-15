import type {
  ListeningSectionDetail,
  ListeningSectionSummary,
} from "@/lib/ielts/listening";
import { supabase } from "@/lib/supabase/client";

export const LISTENING_CONTENT_OVERRIDE_SLUG = "listening-content-overrides";

export type ListeningSectionOverride = {
  hidden?: boolean;
  section: ListeningSectionDetail;
  updatedAt: string;
};

export type ListeningContentOverrides = Record<string, ListeningSectionOverride>;

export async function loadListeningContentOverrides(): Promise<ListeningContentOverrides> {
  const { data } = await supabase
    .from("managed_content_pages")
    .select("meta_json")
    .eq("slug", LISTENING_CONTENT_OVERRIDE_SLUG)
    .eq("status", "published")
    .maybeSingle();
  const meta = data?.meta_json;

  if (
    !meta ||
    typeof meta !== "object" ||
    !("overrides" in meta) ||
    !meta.overrides ||
    typeof meta.overrides !== "object"
  ) {
    return {};
  }

  return meta.overrides as ListeningContentOverrides;
}

export async function saveListeningContentOverrides(
  adminUserId: string,
  overrides: ListeningContentOverrides,
) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("managed_content_pages").upsert(
    {
      created_by: adminUserId,
      meta_json: { contentVersion: 1, overrides },
      module: "listening",
      published_at: now,
      slug: LISTENING_CONTENT_OVERRIDE_SLUG,
      status: "published",
      summary: "听力题目、答案、解析与原文的管理员前端覆盖内容",
      template_key: "listening_section_page",
      title: "听力内容覆盖",
      updated_at: now,
    },
    { onConflict: "slug" },
  );

  return error;
}

export function applyListeningSummaryOverride(
  summary: ListeningSectionSummary,
  overrides: ListeningContentOverrides,
): ListeningSectionSummary {
  const override = overrides[summary.id];
  if (!override) return summary;

  return {
    ...summary,
    bookTitle: override.section.bookTitle,
    contentStatus: override.section.contentStatus,
    isHidden: Boolean(override.hidden),
    isPublished: override.section.isPublished,
    questionCount: override.section.questions.filter((question) => !question.isHidden).length,
    testTitle: override.section.testTitle,
    timeLimitSeconds: override.section.timeLimitSeconds,
    title: override.section.title,
  };
}

export function applyListeningDetailOverride(
  section: ListeningSectionDetail,
  overrides: ListeningContentOverrides,
  includeHidden: boolean,
): ListeningSectionDetail {
  const override = overrides[section.id];
  const merged = override?.section
    ? {
        ...section,
        ...override.section,
        isHidden: Boolean(override.hidden),
      }
    : section;

  if (includeHidden) return merged;

  return {
    ...merged,
    questions: merged.questions.filter((question) => !question.isHidden),
    transcriptSentences: merged.transcriptSentences.filter((sentence) => !sentence.isHidden),
  };
}
