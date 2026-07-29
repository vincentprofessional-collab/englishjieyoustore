"use client";

import { useEffect, useState } from "react";
import type { SpeakingPartId, SpeakingQuestion } from "@/lib/ielts/speaking";

type FavoriteQuestionItem = {
  href: string;
  id: string;
  savedAt: string;
  sourceTitle: string;
  title: string;
};

type SpeakingQuestionFavoriteButtonProps = {
  partId: SpeakingPartId;
  partLabel: string;
  question: SpeakingQuestion;
};

const FAVORITE_QUESTIONS_STORAGE_KEY = "ielts-platform.favoriteQuestions";

function readFavoriteQuestions() {
  try {
    const storedValue = window.localStorage.getItem(FAVORITE_QUESTIONS_STORAGE_KEY);
    return storedValue ? (JSON.parse(storedValue) as FavoriteQuestionItem[]) : [];
  } catch {
    return [];
  }
}

function writeFavoriteQuestions(items: FavoriteQuestionItem[]) {
  const sortedItems = [...items].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );

  window.localStorage.setItem(FAVORITE_QUESTIONS_STORAGE_KEY, JSON.stringify(sortedItems));
}

export function SpeakingQuestionFavoriteButton({
  partId,
  partLabel,
  question,
}: SpeakingQuestionFavoriteButtonProps) {
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setIsSaved(readFavoriteQuestions().some((item) => item.id === question.id));
  }, [question.id]);

  function toggleFavorite() {
    const currentFavorites = readFavoriteQuestions();

    if (currentFavorites.some((item) => item.id === question.id)) {
      writeFavoriteQuestions(currentFavorites.filter((item) => item.id !== question.id));
      setIsSaved(false);
      return;
    }

    writeFavoriteQuestions([
      {
        href: `/speaking/${partId}#${question.id}`,
        id: question.id,
        savedAt: new Date().toISOString(),
        sourceTitle: `${partLabel} · ${question.scene}`,
        title: question.question,
      },
      ...currentFavorites,
    ]);
    setIsSaved(true);
  }

  return (
    <button
      aria-label={isSaved ? `取消收藏 ${question.question}` : `收藏 ${question.question}`}
      aria-pressed={isSaved}
      className={`speaking-question-favorite ${isSaved ? "active" : ""}`}
      onClick={toggleFavorite}
      title={isSaved ? "取消收藏" : "收藏"}
      type="button"
    >
      <span aria-hidden="true">{isSaved ? "★" : "☆"}</span>
    </button>
  );
}
