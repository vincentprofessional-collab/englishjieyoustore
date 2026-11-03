import { getSupabaseStorageUrl } from "@/lib/media/url";
import { normalizeVocabularyAudioKey } from "@/lib/vocabulary/audio-key";

export type VocabularyAccent = "uk" | "us";

export function getVocabularyAudioUrl(word: string, accent: VocabularyAccent) {
  const audioKey = normalizeVocabularyAudioKey(word);

  if (!audioKey) {
    return "";
  }

  const supabaseUrl = getSupabaseStorageUrl(
    "audio",
    `word-audio/${accent}/${audioKey}.mp3`,
  );
  if (supabaseUrl) return supabaseUrl;

  const configuredBaseUrl = process.env.NEXT_PUBLIC_VOCABULARY_AUDIO_BASE_URL?.trim().replace(/\/+$/, "");
  const encodedWord = encodeURIComponent(audioKey);

  if (configuredBaseUrl) {
    return `${configuredBaseUrl}/${accent}/${encodedWord}.mp3`;
  }

  return `/api/vocabulary-audio/${accent}/${encodedWord}`;
}

function getLocalVocabularyAudioUrl(word: string, accent: VocabularyAccent) {
  const audioKey = normalizeVocabularyAudioKey(word);
  return audioKey ? `/api/vocabulary-audio/${accent}/${encodeURIComponent(audioKey)}` : "";
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
  const audioUrls = [...new Set([
    getVocabularyAudioUrl(word, accent),
    audioUrl?.trim(),
    getLocalVocabularyAudioUrl(word, accent),
  ].filter((url): url is string => Boolean(url)))];

  if (typeof window === "undefined" || audioUrls.length === 0) return;

  let audioIndex = 0;
  const playNext = () => {
    const resolvedAudioUrl = audioUrls[audioIndex];
    if (!resolvedAudioUrl) return;
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
