import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const IELTS_LISTENING_ANSWER_WORDS_PROJECT_KEY = "vocabulary.ielts-listening-answer-words";

export async function hasListeningAnswerWordsAccess() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return false;

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role === "admin") return true;

    const now = new Date().toISOString();
    const { data: entitlement } = await supabase.from("user_project_entitlements")
      .select("id")
      .eq("user_id", user.id)
      .eq("project_key", IELTS_LISTENING_ANSWER_WORDS_PROJECT_KEY)
      .eq("status", "active")
      .lte("starts_at", now)
      .gt("expires_at", now)
      .limit(1)
      .maybeSingle();

    return Boolean(entitlement);
  } catch {
    return false;
  }
}
