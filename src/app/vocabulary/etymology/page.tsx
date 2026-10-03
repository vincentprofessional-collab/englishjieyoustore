import { notFound } from "next/navigation";

import { VocabularyAutoplay } from "@/components/vocabulary-autoplay";
import { VocabularyDetailContent } from "@/components/vocabulary-detail-content";
import { VocabularyDetailShell } from "@/components/vocabulary-detail-shell";
import { getBbcVocabularyDetail } from "@/lib/articles/bbc-vocabulary";
import { getExtendedVocabularyEntry, getVocabularyFormationParts } from "@/lib/vocabulary/local-vocabulary";
import { getVocabularyPhraseMatches } from "@/lib/vocabulary/phrases";
import { getVocabularyUsageExamples, prioritizeVocabularyUsageExamples } from "@/lib/vocabulary/examples";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function VocabularyEtymologyLookupPage() {
  const word = "etymology";
  const bbcVocabularyDetail = getBbcVocabularyDetail(word);
  const entry = (await getExtendedVocabularyEntry(word)) ?? bbcVocabularyDetail?.entry;

  if (!entry) {
    notFound();
  }

  const fetchedUsageExamples = prioritizeVocabularyUsageExamples(
    await getVocabularyUsageExamples(
      entry.word,
      5,
      entry.inflections.map((inflection) => inflection.value),
    ),
    bbcVocabularyDetail?.examples ?? [],
  ).slice(0, 5);
  let canAccessBbcExamples = false;
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("can_access_project", { _project_key: "bbc" });
    canAccessBbcExamples = !error && data === true;
  } catch {
    // Hide BBC examples when the membership check is unavailable.
  }
  const usageExamples = canAccessBbcExamples
    ? fetchedUsageExamples
    : fetchedUsageExamples.filter((example) => example.bookCode !== "BBC");
  const formationParts = getVocabularyFormationParts(entry).map((part) => ({
    ...part,
    href: part.href ? `${part.href}${part.href.includes("?") ? "&" : "?"}from=lookup` : part.href,
  }));

  return (
    <section className="stack vocabulary-word-page vocabulary-etymology-lookup-page">
      <VocabularyAutoplay ukAudioUrl={entry.ukAudioUrl} usAudioUrl={entry.usAudioUrl} word={entry.word} />
      <VocabularyDetailShell backHref="/vocabulary" entry={entry}>
        <VocabularyDetailContent
          entry={entry}
          formationUnlocked
          formationParts={formationParts}
          phrases={getVocabularyPhraseMatches(entry.word)}
          usageExamples={usageExamples}
        />
      </VocabularyDetailShell>
    </section>
  );
}
