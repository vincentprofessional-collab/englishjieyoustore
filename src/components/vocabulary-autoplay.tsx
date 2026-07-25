"use client";

import { useEffect } from "react";
import { getVocabularyAutoplayAccent } from "@/lib/vocabulary/autoplay-preference";
import { playVocabularyPronunciation } from "@/lib/vocabulary/pronunciation-audio";

type VocabularyAutoplayProps = {
  ukAudioUrl?: string;
  usAudioUrl?: string;
  word: string;
};

export function VocabularyAutoplay({ ukAudioUrl, usAudioUrl, word }: VocabularyAutoplayProps) {
  useEffect(() => {
    const selectedAccent = getVocabularyAutoplayAccent();

    if (!selectedAccent) {
      return;
    }

    const playbackKey = `ielts-platform.vocabularyAutoplayLast:${selectedAccent}:${word.toLowerCase()}`;
    const lastPlayback = Number(window.sessionStorage.getItem(playbackKey) ?? "0");
    const now = Date.now();

    if (now - lastPlayback < 1600) {
      return;
    }

    window.sessionStorage.setItem(playbackKey, String(now));
    const timer = window.setTimeout(() => {
      playVocabularyPronunciation({
        accent: selectedAccent,
        audioUrl: selectedAccent === "uk" ? ukAudioUrl : usAudioUrl,
        word,
      });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [ukAudioUrl, usAudioUrl, word]);

  return null;
}
