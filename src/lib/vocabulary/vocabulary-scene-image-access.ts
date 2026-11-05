import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const VOCABULARY_SCENE_IMAGES_PROJECT_KEY = "vocabulary.scene-images";

export async function hasVocabularySceneImageAccess() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return false;

    const { data: profile, error: profileError } = await supabase.from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    // Current release is an administrator preview, including for paid accounts.
    return !profileError && profile?.role === "admin";
  } catch {
    return false;
  }
}
