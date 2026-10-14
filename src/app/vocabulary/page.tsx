import { cookies, headers } from "next/headers";
import { VocabularySearchAutocomplete } from "@/components/vocabulary-search-autocomplete";
import { MobileWordHub } from "@/components/mobile-section-hubs";
import { VocabularyDetailShell } from "@/components/vocabulary-detail-shell";
import { VocabularyDetailContent } from "@/components/vocabulary-detail-content";
import { VocabularyLookupDisplaySection } from "@/components/vocabulary-lookup-display-section";
import { VocabularyVideoPlayer } from "@/components/vocabulary-video-player";
import { getExtendedVocabularyEntry, getVocabularyEntry, getVocabularyFormationParts } from "@/lib/vocabulary/local-vocabulary";
import { getVocabularyLookupEtymology } from "@/lib/vocabulary/lookup-etymology";
import { DEFAULT_VOCABULARY_LOOKUP_DISPLAY_PREFERENCES, isPhoneUserAgent, VOCABULARY_LOOKUP_VIDEO_COOKIE } from "@/lib/vocabulary/lookup-display-preferences";
import { getVocabularyPhraseMatches } from "@/lib/vocabulary/phrases";
import { getVocabularyVideos } from "@/lib/vocabulary/videos";
import { getVocabularyUsageExamples } from "@/lib/vocabulary/examples";
import { getVocabularySynonymDistinctions } from "@/lib/vocabulary/synonym-distinctions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function MobileDefaultWordPreview() {
  const entry = getVocabularyEntry("balloon") ?? await getExtendedVocabularyEntry("balloon");
  if (!entry) return null;

  const [requestHeaders, cookieStore, fetchedUsageExamples] = await Promise.all([
    headers(), cookies(), getVocabularyUsageExamples(entry.word, 5, entry.inflections.map((item) => item.value)),
  ]);
  let canAccessBbcExamples = false;
  if (fetchedUsageExamples.some((example) => example.bookCode === "BBC")) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase.rpc("can_access_project", { _project_key: "bbc" });
      canAccessBbcExamples = !error && data === true;
    } catch {
      // Hide member examples when access cannot be verified.
    }
  }
  const usageExamples = canAccessBbcExamples ? fetchedUsageExamples : fetchedUsageExamples.filter((example) => example.bookCode !== "BBC");
  const isPhoneRequest = isPhoneUserAgent(requestHeaders.get("user-agent") ?? "");
  const etymology = getVocabularyLookupEtymology(entry.word);
  const videoPreference = cookieStore.get(VOCABULARY_LOOKUP_VIDEO_COOKIE)?.value;
  const videoVisible = videoPreference === undefined ? DEFAULT_VOCABULARY_LOOKUP_DISPLAY_PREFERENCES.video : videoPreference === "1";
  const videoData = videoVisible && !isPhoneRequest ? await getVocabularyVideos(entry) : null;
  const formationParts = getVocabularyFormationParts(entry);
  const videoPlayer = videoData?.videos.length ? (
    <VocabularyLookupDisplaySection controlsEnabled id="video" initialVisible={videoVisible} title="视频">
      <VocabularyVideoPlayer canDelete={videoData.canDelete} entryWord={entry.normalizedWord} totalVideos={videoData.totalVideos} videos={videoData.videos} votesEnabled={videoData.votesEnabled} />
    </VocabularyLookupDisplaySection>
  ) : null;

  return (
    <section className="mobile-word-preview">
      <VocabularyDetailShell backHref="/vocabulary" className="mobile-word-preview-shell" entry={entry} showBack={false}>
        <VocabularyDetailContent
          entry={entry}
          etymologyChinese={etymology?.chinese}
          etymologyEnglish={etymology?.english}
          formationParts={formationParts}
          inlineVideo={!isPhoneRequest ? videoPlayer : null}
          lookupLayout
          phrases={getVocabularyPhraseMatches(entry.word)}
          synonymDistinctions={getVocabularySynonymDistinctions(entry.word)}
          usageExamples={usageExamples}
        />
      </VocabularyDetailShell>
    </section>
  );
}

export default async function VocabularyPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; mode?: string; q?: string }>;
}) {
  const { mode, q } = await searchParams;
  const query = q?.trim() ?? "";
  const showMobileHub = !query && mode !== "search";

  return (
    <>
      {showMobileHub ? <div className="mobile-vocabulary-landing"><MobileWordHub detailPreview={<MobileDefaultWordPreview />} /></div> : null}
      <section className={`stack vocabulary-page ${showMobileHub ? "vocabulary-page-search-fallback" : ""}`}>
        <div className="vocabulary-hero">
          <VocabularySearchAutocomplete initialQuery={query} autoFocus={!showMobileHub} />
        </div>
      </section>
    </>
  );
}
