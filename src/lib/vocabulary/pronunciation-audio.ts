export type VocabularyAccent = "uk" | "us";

function normalizeAudioWord(word: string) {
  return word.trim().toLowerCase();
}

export function getVocabularyAudioUrl(word: string, accent: VocabularyAccent) {
  const normalizedWord = normalizeAudioWord(word);

  if (!normalizedWord) {
    return "";
  }

  const configuredBaseUrl = process.env.NEXT_PUBLIC_VOCABULARY_AUDIO_BASE_URL?.trim().replace(/\/+$/, "");
  const encodedWord = encodeURIComponent(normalizedWord);

  if (configuredBaseUrl) {
    return `${configuredBaseUrl}/${accent}/${encodedWord}.mp3`;
  }

  return `/api/vocabulary-audio/${accent}/${encodedWord}`;
}

function speakWithBrowser(word: string, locale: "en-GB" | "en-US") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = locale;
  window.speechSynthesis.speak(utterance);
}

export function playVocabularyPronunciation({
  accent,
  audioUrl,
  word,
}: {
  accent: VocabularyAccent;
  audioUrl?: string;
  word: string;
}) {
  const locale = accent === "uk" ? "en-GB" : "en-US";
  const resolvedAudioUrl = audioUrl?.trim() || getVocabularyAudioUrl(word, accent);

  if (typeof window === "undefined" || !resolvedAudioUrl) {
    speakWithBrowser(word, locale);
    return;
  }

  const audio = new Audio(resolvedAudioUrl);
  let hasFallenBack = false;
  const fallback = () => {
    if (hasFallenBack) {
      return;
    }

    hasFallenBack = true;
    const generatedAudioUrl = audioUrl?.trim() ? getVocabularyAudioUrl(word, accent) : "";
    if (!generatedAudioUrl || generatedAudioUrl === resolvedAudioUrl) {
      speakWithBrowser(word, locale);
      return;
    }

    const generatedAudio = new Audio(generatedAudioUrl);
    const speakFallback = () => speakWithBrowser(word, locale);
    generatedAudio.addEventListener("error", speakFallback, { once: true });
    void generatedAudio.play().catch(speakFallback);
  };

  audio.addEventListener("error", fallback, { once: true });
  void audio.play().catch(fallback);
}
