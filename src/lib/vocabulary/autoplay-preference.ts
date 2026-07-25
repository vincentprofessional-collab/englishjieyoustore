import type { VocabularyAccent } from "@/lib/vocabulary/pronunciation-audio";

export const VOCABULARY_AUTOPLAY_STORAGE_KEY = "ielts-platform.vocabularyAutoplayAccent";
export const VOCABULARY_AUTOPLAY_CHANGE_EVENT = "vocabulary-autoplay-change";

function isVocabularyAccent(value: string | null): value is VocabularyAccent {
  return value === "uk" || value === "us";
}

export function getVocabularyAutoplayAccent(): VocabularyAccent | null {
  if (typeof window === "undefined") {
    return null;
  }

  const savedAccent = window.localStorage.getItem(VOCABULARY_AUTOPLAY_STORAGE_KEY);
  return isVocabularyAccent(savedAccent) ? savedAccent : null;
}

export function setVocabularyAutoplayAccent(accent: VocabularyAccent | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (accent) {
    window.localStorage.setItem(VOCABULARY_AUTOPLAY_STORAGE_KEY, accent);
  } else {
    window.localStorage.removeItem(VOCABULARY_AUTOPLAY_STORAGE_KEY);
  }

  window.dispatchEvent(new CustomEvent(VOCABULARY_AUTOPLAY_CHANGE_EVENT, { detail: accent }));
}

export function subscribeToVocabularyAutoplay(
  callback: (accent: VocabularyAccent | null) => void,
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  function syncFromStorage() {
    callback(getVocabularyAutoplayAccent());
  }

  function syncFromCustomEvent(event: Event) {
    const nextAccent = event instanceof CustomEvent && isVocabularyAccent(event.detail) ? event.detail : null;
    callback(nextAccent);
  }

  window.addEventListener("storage", syncFromStorage);
  window.addEventListener(VOCABULARY_AUTOPLAY_CHANGE_EVENT, syncFromCustomEvent);

  return () => {
    window.removeEventListener("storage", syncFromStorage);
    window.removeEventListener(VOCABULARY_AUTOPLAY_CHANGE_EVENT, syncFromCustomEvent);
  };
}
