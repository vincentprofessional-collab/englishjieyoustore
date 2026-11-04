import { supabase } from "@/lib/supabase/client";
import {
  normalizeVocabularyLearningContent,
  VOCABULARY_LEARNING_CONTENT_SLUG,
  type VocabularyLearningContent,
} from "@/lib/vocabulary/learning-content";

export async function loadVocabularyLearningContent(): Promise<VocabularyLearningContent> {
  const { data, error } = await supabase
    .from("managed_content_pages")
    .select("meta_json")
    .eq("slug", VOCABULARY_LEARNING_CONTENT_SLUG)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return normalizeVocabularyLearningContent(data?.meta_json);
}

export async function saveVocabularyLearningContent(adminUserId: string, content: VocabularyLearningContent) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("managed_content_pages").upsert({
    created_by: adminUserId,
    meta_json: { ...content, contentVersion: 1, audit: { updatedAt: now, updatedBy: adminUserId } },
    module: "training",
    published_at: now,
    slug: VOCABULARY_LEARNING_CONTENT_SLUG,
    status: "published",
    summary: "词汇书、单词、短语与表达内容。",
    template_key: "site_announcement_page",
    title: "背单词内容管理",
    updated_at: now,
  }, { onConflict: "slug" });
  if (error) throw new Error(error.message);
}
