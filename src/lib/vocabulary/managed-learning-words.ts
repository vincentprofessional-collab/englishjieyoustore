import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupplementalLearningWords } from "@/lib/vocabulary/supplemental-learning-books";
import {
  applyVocabularyLearningOverrides,
  normalizeVocabularyLearningContent,
  VOCABULARY_LEARNING_CONTENT_SLUG,
} from "@/lib/vocabulary/learning-content";
import type { LearningWord } from "@/lib/vocabulary/learning";
import { getBbcPhraseLemma } from "@/lib/vocabulary/bbc-phrase-lemma";

function normalizePhrase(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9]+/g, " ").trim();
}

export async function getManagedLearningPhrase(value: string): Promise<LearningWord | null> {
  const normalizedPhrase = normalizePhrase(getBbcPhraseLemma(value));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!normalizedPhrase || !url || !anonKey) return null;

  try {
    const supabase = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await supabase
      .from("managed_content_pages")
      .select("meta_json")
      .eq("slug", VOCABULARY_LEARNING_CONTENT_SLUG)
      .eq("status", "published")
      .maybeSingle();
    if (error || !data?.meta_json) return null;

    const state = normalizeVocabularyLearningContent(data.meta_json);
    const changes = state.entries["地道表达"];
    const phraseBookWords = getSupplementalLearningWords("地道表达") ?? [];
    const word = applyVocabularyLearningOverrides(phraseBookWords, state)
      .find((entry) => entry.level === "地道表达" && normalizePhrase(entry.word) === normalizedPhrase);
    if (!word) return null;
    const isManagedAddition = changes?.additions.some((entry) => entry.id === word.id);
    const hasManagedOverride = Boolean(changes?.overrides[word.id]?.word);
    return isManagedAddition || hasManagedOverride ? word : null;
  } catch {
    return null;
  }
}
