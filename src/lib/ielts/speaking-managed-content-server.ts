import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  isSpeakingContentSlug,
  type SpeakingManagedContentResponse,
} from "@/lib/ielts/speaking-managed-content";

const EMPTY_CONTENT: SpeakingManagedContentResponse = {
  page: null,
  sections: [],
};

export async function getPublishedSpeakingManagedContent(
  slug: string,
): Promise<SpeakingManagedContentResponse> {
  if (!isSpeakingContentSlug(slug)) {
    return EMPTY_CONTENT;
  }

  const supabase = await createServerSupabaseClient();
  const { data: page, error: pageError } = await supabase
    .from("managed_content_pages")
    .select("id,title,summary,meta_json")
    .eq("slug", slug)
    .eq("module", "speaking")
    .eq("template_key", "speaking_topic_page")
    .eq("status", "published")
    .maybeSingle();

  if (pageError || !page) {
    return EMPTY_CONTENT;
  }

  const { data: sections, error: sectionError } = await supabase
    .from("managed_content_page_sections")
    .select("section_key,title,content_json,sort_order")
    .eq("page_id", page.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (sectionError) {
    return EMPTY_CONTENT;
  }

  return {
    page: {
      metaJson: page.meta_json,
      summary: page.summary,
      title: page.title,
    },
    sections: (sections ?? []).map((section) => ({
      contentJson: section.content_json,
      sectionKey: section.section_key,
      sortOrder: section.sort_order,
      title: section.title,
    })),
  };
}
