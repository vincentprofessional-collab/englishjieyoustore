import { supabase } from "@/lib/supabase/client";
import { LANGUAGE_EXAM_CONTENT_SLUG, type LanguageExamContent } from "@/lib/language-exam-content";

export async function saveLanguageExamContent(adminUserId: string, content: LanguageExamContent) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("managed_content_pages").upsert({
    created_by: adminUserId,
    meta_json: { ...content, contentVersion: 1, audit: { updatedAt: now, updatedBy: adminUserId } },
    module: "training",
    published_at: now,
    slug: LANGUAGE_EXAM_CONTENT_SLUG,
    status: "published",
    summary: "语言考试侧栏、页面展示内容及题库目录说明。",
    template_key: "site_announcement_page",
    title: "语言考试页面内容",
    updated_at: now,
  }, { onConflict: "slug" });
  if (error) throw new Error(error.message);
}
