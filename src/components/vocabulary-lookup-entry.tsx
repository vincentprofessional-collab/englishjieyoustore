import { notFound } from "next/navigation";
import { VocabularyAutoplay } from "@/components/vocabulary-autoplay";
import { VocabularyDetailShell } from "@/components/vocabulary-detail-shell";
import { VocabularyDetailContent } from "@/components/vocabulary-detail-content";
import { getExtendedVocabularyEntry, getVocabularyFormationParts } from "@/lib/vocabulary/local-vocabulary";
import { getVocabularyUsageExamples, prioritizeVocabularyUsageExamples } from "@/lib/vocabulary/examples";
import { getVocabularyPhraseMatches } from "@/lib/vocabulary/phrases";
import { getVocabularyLookupEtymology } from "@/lib/vocabulary/lookup-etymology";
import { getVocabularySynonymDistinctions } from "@/lib/vocabulary/synonym-distinctions";
import { getBbcVocabularyDetail } from "@/lib/articles/bbc-vocabulary";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getManagedLearningPhrase } from "@/lib/vocabulary/managed-learning-words";
import { toLocalVocabularyEntry } from "@/lib/vocabulary/learning";
import type { VocabularyUsageExample } from "@/lib/vocabulary/examples";

export async function VocabularyLookupEntry({ word, backHref = "/vocabulary" }: { word: string; backHref?: string }) {
  const decodedWord = decodeURIComponent(word);
  const bbcVocabularyDetail = getBbcVocabularyDetail(decodedWord);
  const isPhrase = /[\s-]/.test(decodedWord);
  const managedPhrase = isPhrase ? await getManagedLearningPhrase(decodedWord) : null;
  const entry = managedPhrase
    ? toLocalVocabularyEntry(managedPhrase)
    : isPhrase && bbcVocabularyDetail
      ? bbcVocabularyDetail.entry
      : (await getExtendedVocabularyEntry(decodedWord)) ?? bbcVocabularyDetail?.entry;

  if (!entry) {
    notFound();
  }

  const managedExamples: VocabularyUsageExample[] = managedPhrase
    ? managedPhrase.englishExamples.map((englishText, index) => ({
        audioUrl: null,
        bookCode: managedPhrase.bbcExampleSource ? "BBC" : "VOCABULARY",
        chineseText: managedPhrase.englishExampleTranslations?.[index] ?? "",
        englishText,
        id: `managed-phrase:${managedPhrase.id}:${index}`,
        sentenceNo: managedPhrase.bbcExampleSource?.sentenceNo ?? index + 1,
        sourceId: managedPhrase.bbcExampleSource?.articleId ?? "",
        sourceTitle: managedPhrase.bbcExampleSource ? `BBC · ${managedPhrase.bbcExampleSource.articleTitle}` : "地道表达词汇书",
        sourceType: managedPhrase.bbcExampleSource ? "article" : "manual",
        testNo: 0,
      }))
    : [];
  const fetchedUsageExamples = managedPhrase
    ? managedExamples
    : prioritizeVocabularyUsageExamples(
      await getVocabularyUsageExamples(
        entry.word,
        5,
        entry.inflections.map((inflection) => inflection.value),
      ),
      bbcVocabularyDetail?.examples ?? [],
    ).slice(0, 5);
  const hasBbcExamples = fetchedUsageExamples.some((example) => example.bookCode === "BBC");
  let canAccessBbcExamples = !hasBbcExamples;
  if (hasBbcExamples) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase.rpc("can_access_project", {
        _project_key: "bbc",
      });
      canAccessBbcExamples = !error && data === true;
    } catch {
      // Treat an unavailable membership check as a visitor and hide BBC examples.
    }
  }
  const usageExamples = canAccessBbcExamples
    ? fetchedUsageExamples
    : fetchedUsageExamples.filter((example) => example.bookCode !== "BBC");
  const phrases = getVocabularyPhraseMatches(entry.word);
  const formationParts = getVocabularyFormationParts(entry).map((part) => ({
    ...part,
    href: part.href ? `${part.href}${part.href.includes("?") ? "&" : "?"}from=lookup` : part.href,
  }));
  const etymology = getVocabularyLookupEtymology(entry.word);
  const synonymDistinctions = getVocabularySynonymDistinctions([
    entry.word,
    entry.normalizedWord,
    ...entry.inflections.map((inflection) => inflection.value),
  ]);
  return (
    <section className="stack vocabulary-word-page">
      <VocabularyAutoplay ukAudioUrl={entry.ukAudioUrl} usAudioUrl={entry.usAudioUrl} word={entry.word} />
      <VocabularyDetailShell
        backHref={backHref}
        entry={entry}
        formationParts={formationParts}
      >
        <VocabularyDetailContent
          entry={entry}
          etymologyChinese={etymology?.chinese}
          etymologyEnglish={etymology?.english}
          formationParts={formationParts}
          lookupLayout
          phrases={phrases}
          synonymDistinctions={synonymDistinctions}
          usageExamples={usageExamples}
        />
      </VocabularyDetailShell>
    </section>
  );
}
