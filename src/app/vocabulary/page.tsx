import { VocabularySearchAutocomplete } from "@/components/vocabulary-search-autocomplete";
import { MobileWordHub } from "@/components/mobile-section-hubs";
import { VocabularyDetailShell } from "@/components/vocabulary-detail-shell";
import { VocabularyDetailContent } from "@/components/vocabulary-detail-content";
import { VocabularyVideoPlayer } from "@/components/vocabulary-video-player";
import { getExtendedVocabularyEntry, getVocabularyEntry, getVocabularyFormationParts } from "@/lib/vocabulary/local-vocabulary";
import { getVocabularyPhraseMatches } from "@/lib/vocabulary/phrases";
import { getVocabularyVideoCandidates } from "@/lib/vocabulary/videos";

export const dynamic = "force-dynamic";

async function MobileSurpriseWordPreview() {
  const entry = getVocabularyEntry("surprise") ?? await getExtendedVocabularyEntry("surprise");
  if (!entry) return null;

  const candidates = getVocabularyVideoCandidates(entry);
  const videos = candidates.map((item) => ({ ...item, likedByMe: false, likes: 0 }));
  const formationParts = getVocabularyFormationParts(entry);
  const videoPlayer = videos.length ? (
    <section aria-label={`${entry.word} 相关视频`} className="word-detail-section mobile-word-video-section">
      <VocabularyVideoPlayer entryWord={entry.normalizedWord} totalVideos={videos.length} videos={videos} votesEnabled={false} />
    </section>
  ) : null;

  return (
    <section className="mobile-word-preview">
      <header><span>今日单词</span><strong>Surprise</strong></header>
      <VocabularyDetailShell backHref="/vocabulary" className="mobile-word-preview-shell" entry={entry} showBack={false}>
        <VocabularyDetailContent
          entry={entry}
          formationParts={formationParts}
          phrases={getVocabularyPhraseMatches(entry.word)}
          usageExamples={[]}
        />
        {videoPlayer}
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
      {showMobileHub ? <div className="mobile-vocabulary-landing"><MobileWordHub detailPreview={<MobileSurpriseWordPreview />} /></div> : null}
      <section className={`stack vocabulary-page ${showMobileHub ? "vocabulary-page-search-fallback" : ""}`}>
        <div className="vocabulary-hero">
          <VocabularySearchAutocomplete initialQuery={query} autoFocus={!showMobileHub} />
        </div>
      </section>
    </>
  );
}
