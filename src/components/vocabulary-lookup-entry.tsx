import { notFound } from "next/navigation";
import { cookies, headers } from "next/headers";
import { VocabularyAutoplay } from "@/components/vocabulary-autoplay";
import { VocabularyDetailShell } from "@/components/vocabulary-detail-shell";
import { VocabularyDetailContent } from "@/components/vocabulary-detail-content";
import { VocabularyLookupDisplaySection } from "@/components/vocabulary-lookup-display-section";
import { VocabularyVideoPlayer } from "@/components/vocabulary-video-player";
import { getExtendedVocabularyEntry, getVocabularyFormationParts } from "@/lib/vocabulary/local-vocabulary";
import { getVocabularyUsageExamples, prioritizeVocabularyUsageExamples } from "@/lib/vocabulary/examples";
import { getVocabularyPhraseMatches } from "@/lib/vocabulary/phrases";
import { getVocabularyLookupEtymology } from "@/lib/vocabulary/lookup-etymology";
import { getVocabularySynonymDistinctions } from "@/lib/vocabulary/synonym-distinctions";
import { DEFAULT_VOCABULARY_LOOKUP_DISPLAY_PREFERENCES, isPhoneUserAgent, VOCABULARY_LOOKUP_VIDEO_COOKIE } from "@/lib/vocabulary/lookup-display-preferences";
import { getBbcVocabularyDetail } from "@/lib/articles/bbc-vocabulary";
import { getVocabularyVideoCandidates, getVocabularyVideos } from "@/lib/vocabulary/videos";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function VocabularyLookupEntry({ word, backHref = "/vocabulary" }: { word: string; backHref?: string }) {
  const decodedWord = decodeURIComponent(word);
  const bbcVocabularyDetail = getBbcVocabularyDetail(decodedWord);
  const entry = /\s/.test(decodedWord) && bbcVocabularyDetail
    ? bbcVocabularyDetail.entry
    : (await getExtendedVocabularyEntry(decodedWord)) ?? bbcVocabularyDetail?.entry;

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
  const [requestHeaders, cookieStore] = await Promise.all([headers(), cookies()]);
  const isPhoneRequest = isPhoneUserAgent(requestHeaders.get("user-agent") ?? "");
  const etymology = getVocabularyLookupEtymology(entry.word);
  const synonymDistinctions = getVocabularySynonymDistinctions([
    entry.word,
    entry.normalizedWord,
    ...entry.inflections.map((inflection) => inflection.value),
  ]);
  const videoPreference = cookieStore.get(VOCABULARY_LOOKUP_VIDEO_COOKIE)?.value;
  const videoVisible = videoPreference === undefined ? DEFAULT_VOCABULARY_LOOKUP_DISPLAY_PREFERENCES.video : videoPreference === "1";
  const videoCandidates = isPhoneRequest ? [] : getVocabularyVideoCandidates(entry);
  const shouldLoadVideos = videoVisible && !isPhoneRequest;
  const videoData = shouldLoadVideos ? await getVocabularyVideos(entry) : null;
  const hasVideoForVisibleSection = videoCandidates.length > 0 && (!shouldLoadVideos || Boolean(videoData?.videos.length));
  const videoSection = hasVideoForVisibleSection ? (
    <VocabularyLookupDisplaySection controlsEnabled id="video" initialVisible={videoVisible} title="视频">
      {videoData?.videos.length ? (
        <VocabularyVideoPlayer
          canDelete={videoData.canDelete}
          entryWord={entry.normalizedWord}
          totalVideos={videoData.totalVideos}
          videos={videoData.videos}
          votesEnabled={videoData.votesEnabled}
        />
      ) : null}
    </VocabularyLookupDisplaySection>
  ) : null;

  return (
    <section className="stack vocabulary-word-page">
      <VocabularyAutoplay ukAudioUrl={entry.ukAudioUrl} usAudioUrl={entry.usAudioUrl} word={entry.word} />
      <VocabularyDetailShell
        backHref={backHref}
        entry={entry}
      >
        <VocabularyDetailContent
          entry={entry}
          etymologyChinese={etymology?.chinese}
          etymologyEnglish={etymology?.english}
          formationParts={formationParts}
          inlineVideo={!isPhoneRequest ? videoSection : null}
          lookupLayout
          phrases={phrases}
          synonymDistinctions={synonymDistinctions}
          usageExamples={usageExamples}
        />
      </VocabularyDetailShell>
    </section>
  );
}
