"use client";

import { useEffect, useState } from "react";
import type { LocalVocabularyEntry } from "@/lib/vocabulary/local-vocabulary";

type FavoriteWordItem = {
  definitionCn: string;
  definitionLines?: string[];
  etymologySource?: string;
  formation?: string;
  id: string;
  level?: string;
  normalizedWord?: string;
  partOfSpeech: string;
  phonetic: string;
  root?: string;
  rootKey?: string;
  savedAt: string;
  ukPhonetic?: string;
  usPhonetic?: string;
  word: string;
};

type VocabularyFavoriteButtonProps = {
  entry: LocalVocabularyEntry;
};

const FAVORITE_WORDS_STORAGE_KEY = "ielts-platform.favoriteWords";

function readFavoriteWords() {
  try {
    const rawValue = window.localStorage.getItem(FAVORITE_WORDS_STORAGE_KEY);
    return rawValue ? (JSON.parse(rawValue) as FavoriteWordItem[]) : [];
  } catch {
    return [];
  }
}

function writeFavoriteWords(items: FavoriteWordItem[]) {
  const sortedItems = [...items].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );

  window.localStorage.setItem(FAVORITE_WORDS_STORAGE_KEY, JSON.stringify(sortedItems));
}

export function VocabularyFavoriteButton({ entry }: VocabularyFavoriteButtonProps) {
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setIsSaved(readFavoriteWords().some((item) => item.id === entry.normalizedWord));
  }, [entry.normalizedWord]);

  function toggleFavorite() {
    const currentFavorites = readFavoriteWords();
    const existingFavorite = currentFavorites.find((item) => item.id === entry.normalizedWord);

    if (existingFavorite) {
      writeFavoriteWords(currentFavorites.filter((item) => item.id !== entry.normalizedWord));
      setIsSaved(false);
      return;
    }

    writeFavoriteWords([
      {
        definitionCn: entry.definitionCn,
        definitionLines: entry.definitionLines,
        etymologySource: entry.etymologySource,
        formation: entry.formation,
        id: entry.normalizedWord,
        level: entry.level,
        normalizedWord: entry.normalizedWord,
        partOfSpeech: entry.partOfSpeech,
        phonetic: entry.phonetic,
        root: entry.root,
        rootKey: entry.rootKey,
        savedAt: new Date().toISOString(),
        ukPhonetic: entry.ukPhonetic,
        usPhonetic: entry.usPhonetic,
        word: entry.word,
      },
      ...currentFavorites,
    ]);
    setIsSaved(true);
  }

  return (
    <button
      aria-label={isSaved ? `取消收藏 ${entry.word}` : `收藏 ${entry.word}`}
      aria-pressed={isSaved}
      className={`vocabulary-favorite-star ${isSaved ? "active" : ""}`}
      onClick={toggleFavorite}
      type="button"
      title={isSaved ? "取消收藏" : "收藏"}
    >
      {isSaved ? "★" : "☆"}
    </button>
  );
}
