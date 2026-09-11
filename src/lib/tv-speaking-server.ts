import "server-only";

import { createClient } from "@supabase/supabase-js";
import staticManifest from "@/../data/tv-speaking/clips.json";
import type { TvSpeakingClip, TvSpeakingManifest } from "@/lib/tv-speaking-types";

export const TV_SPEAKING_SLUG = "tv-speaking";
export const TV_SPEAKING_SECTION_KEY = "clips";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function isClip(value: unknown): value is TvSpeakingClip {
  const clip = value as Partial<TvSpeakingClip> | null;
  return Boolean(
    clip &&
      typeof clip.id === "string" &&
      typeof clip.english === "string" &&
      typeof clip.chinese === "string" &&
      typeof clip.storagePath === "string" &&
      (typeof clip.videoUrl === "string" || clip.videoUrl === null),
  );
}

export function normalizeTvSpeakingClips(value: unknown) {
  const content = value as { clips?: unknown } | null;
  return Array.isArray(content?.clips) ? content.clips.filter(isClip) : [];
}

export async function loadTvSpeakingManifest(): Promise<TvSpeakingManifest> {
  const fallback = staticManifest as TvSpeakingManifest;
  const supabase = serviceClient();
  if (!supabase) return fallback;

  const { data: page } = await supabase
    .from("managed_content_pages")
    .select("id,title,meta_json")
    .eq("slug", TV_SPEAKING_SLUG)
    .eq("module", "training")
    .eq("status", "published")
    .maybeSingle();
  if (!page) return fallback;

  const { data: section } = await supabase
    .from("managed_content_page_sections")
    .select("content_json")
    .eq("page_id", page.id)
    .eq("section_key", TV_SPEAKING_SECTION_KEY)
    .eq("is_active", true)
    .maybeSingle();
  const clips = normalizeTvSpeakingClips(section?.content_json);
  return clips.length
    ? {
        ...fallback,
        clips,
        title: typeof page.title === "string" ? page.title : fallback.title,
      }
    : fallback;
}

export { serviceClient as createTvSpeakingServiceClient };
