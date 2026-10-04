import { getSupabaseStorageUrl } from "@/lib/media/url";

export type VocabularyAccent = "uk" | "us";

function normalizeAudioWord(word: string) {
  return word.trim().normalize("NFC").toLowerCase();
}

export function getVocabularyAudioUrl(word: string, accent: VocabularyAccent) {
  const normalizedWord = normalizeAudioWord(word);

  if (!normalizedWord) {
    return "";
  }

  const audioKeyWord = normalizedWord === "café" ? "cafe-accent" : normalizedWord;

  const supabaseUrl = getSupabaseStorageUrl(
    "audio",
    `word-audio/${accent}/${audioKeyWord}.mp3`,
  );
  if (supabaseUrl) return supabaseUrl;

  const configuredBaseUrl = process.env.NEXT_PUBLIC_VOCABULARY_AUDIO_BASE_URL?.trim().replace(/\/+$/, "");
  const encodedWord = encodeURIComponent(audioKeyWord);

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
  const audioUrls = [...new Set([
    getVocabularyAudioUrl(word, accent),
    audioUrl?.trim(),
  ].filter((url): url is string => Boolean(url)))];

  if (typeof window === "undefined" || audioUrls.length === 0) {
    speakWithBrowser(word, locale);
    return;
  }

  let audioIndex = 0;
  const playNext = () => {
    const resolvedAudioUrl = audioUrls[audioIndex];
    if (!resolvedAudioUrl) {
      speakWithBrowser(word, locale);
      return;
    }
    audioIndex += 1;

    const audio = new Audio(resolvedAudioUrl);
    audio.preload = "auto";
    let settled = false;
    let started = false;
    let timeout = 0;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
    };
    const fallback = () => {
      if (settled) return;
      finish();
      audio.pause();
      playNext();
    };

    audio.addEventListener("playing", () => {
      started = true;
      window.clearTimeout(timeout);
    }, { once: true });
    audio.addEventListener("ended", () => {
      if (!started || audio.currentTime < 0.05 || audio.duration === 0) fallback();
      else finish();
    }, { once: true });
    audio.addEventListener("error", fallback, { once: true });
    timeout = window.setTimeout(fallback, 5000);
    void audio.play().catch(fallback);
  };
  playNext();
}
