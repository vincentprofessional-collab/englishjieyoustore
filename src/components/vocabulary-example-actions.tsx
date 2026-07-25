"use client";

import { useEffect, useState } from "react";
import type { VocabularyUsageExample } from "@/lib/vocabulary/examples";

type VocabularyExampleAudioButtonProps = {
  audioUrl: string;
};

type VocabularyExampleFavoriteButtonProps = {
  example: VocabularyUsageExample;
};

const FAVORITE_SENTENCES_STORAGE_KEY = "ielts-platform.favoriteSentences";

function SpeakerIcon() {
  return (
    <svg aria-hidden="true" className="vocabulary-example-speaker-icon" viewBox="0 0 24 24">
      <path d="M4 9.5v5h4.2l5.1 4.1V5.4L8.2 9.5H4Z" />
      <path d="M16.2 8.4a5 5 0 0 1 0 7.2" />
      <path d="M18.9 5.8a8.8 8.8 0 0 1 0 12.4" />
    </svg>
  );
}

function readFavoriteSentences() {
  try {
    const rawValue = window.localStorage.getItem(FAVORITE_SENTENCES_STORAGE_KEY);
    return rawValue ? (JSON.parse(rawValue) as Array<{ id: string; savedAt: string }>) : [];
  } catch {
    return [];
  }
}

function writeFavoriteSentences(items: Array<Record<string, unknown> & { savedAt: string }>) {
  const sortedItems = [...items].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );

  window.localStorage.setItem(FAVORITE_SENTENCES_STORAGE_KEY, JSON.stringify(sortedItems));
}

export function VocabularyExampleAudioButton({ audioUrl }: VocabularyExampleAudioButtonProps) {
  function playAudio() {
    const audio = new Audio(audioUrl);
    void audio.play();
  }

  return (
    <button aria-label="播放例句音频" className="vocabulary-example-audio-button" onClick={playAudio} type="button">
      <SpeakerIcon />
    </button>
  );
}

export function VocabularyExampleFavoriteButton({ example }: VocabularyExampleFavoriteButtonProps) {
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setIsSaved(readFavoriteSentences().some((item) => item.id === example.id));
  }, [example.id]);

  function toggleFavorite() {
    const currentFavorites = readFavoriteSentences();
    const existingFavorite = currentFavorites.find((item) => item.id === example.id);

    if (existingFavorite) {
      writeFavoriteSentences(currentFavorites.filter((item) => item.id !== example.id));
      setIsSaved(false);
      return;
    }

    writeFavoriteSentences([
      {
        audioUrl: example.audioUrl ?? undefined,
        bookCode: example.bookCode,
        chineseText: example.chineseText,
        englishText: example.englishText,
        href:
          example.sourceType === "listening"
            ? `/listening/${example.sourceId}?mode=practice&review=1#transcript-sentence-${example.sentenceNo}`
            : undefined,
        id: example.id,
        savedAt: new Date().toISOString(),
        sectionId: example.sourceId,
        sectionTitle: example.sourceTitle,
        sentenceNo: example.sentenceNo,
        testNo: example.testNo,
      },
      ...currentFavorites,
    ]);
    setIsSaved(true);
  }

  return (
    <button
      aria-label={isSaved ? "取消收藏例句" : "收藏例句"}
      aria-pressed={isSaved}
      className={`vocabulary-example-star ${isSaved ? "active" : ""}`}
      onClick={toggleFavorite}
      type="button"
    >
      {isSaved ? "★" : "☆"}
    </button>
  );
}
