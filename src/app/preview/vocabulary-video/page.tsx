import { notFound } from "next/navigation";

import { VocabularyDetailContent } from "@/components/vocabulary-detail-content";
import { VocabularyDetailShell } from "@/components/vocabulary-detail-shell";
import { VocabularyVideoPlayer } from "@/components/vocabulary-video-player";
import {
  getVocabularyEntry,
  getVocabularyFormationParts,
} from "@/lib/vocabulary/local-vocabulary";
import { getVocabularyPhraseMatches } from "@/lib/vocabulary/phrases";
import { getVocabularyVideoCandidates } from "@/lib/vocabulary/videos";

export const dynamic = "force-dynamic";

export default function VocabularyVideoPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const entry = getVocabularyEntry("love");
  if (!entry) return null;
  const formationParts = getVocabularyFormationParts(entry);
  const phrases = getVocabularyPhraseMatches(entry.word);
  const videos = getVocabularyVideoCandidates(entry).slice(0, 20).map((video) => ({
    ...video,
    likedByMe: false,
    likes: 0,
  }));

  return (
    <section className="stack vocabulary-word-page">
      <VocabularyDetailShell
        entry={entry}
        sidePanel={(
          <VocabularyVideoPlayer
            entryWord={entry.normalizedWord}
            totalVideos={videos.length}
            videos={videos}
            votesEnabled={false}
          />
        )}
      >
        <VocabularyDetailContent
          entry={entry}
          formationParts={formationParts}
          phrases={phrases}
          usageExamples={[]}
        />
      </VocabularyDetailShell>
    </section>
  );
}
