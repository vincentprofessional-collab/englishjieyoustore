"use client";

import { playVocabularyPronunciation } from "@/lib/vocabulary/pronunciation-audio";

type VocabularyPronunciationProps = {
  ukAudioUrl?: string;
  ukPhonetic?: string;
  usAudioUrl?: string;
  usPhonetic?: string;
  word: string;
};

function formatPhonetic(value?: string) {
  const normalizedValue = value?.trim().replace(/^[\[/]+|[\]/]+$/g, "");
  const firstPhonetic = normalizedValue?.split(/[,;；、]+/)[0]?.trim();

  return firstPhonetic ? `/ ${firstPhonetic} /` : "";
}

function SoundWaveIcon() {
  return (
    <svg aria-hidden="true" className="pronunciation-wave-icon" viewBox="0 0 18 24">
      <path d="M6.2 7.4c1.4 1.1 2.2 2.7 2.2 4.6s-.8 3.5-2.2 4.6" />
      <path d="M11.1 4.4c2.3 1.9 3.7 4.6 3.7 7.6s-1.4 5.7-3.7 7.6" />
    </svg>
  );
}

export function VocabularyPronunciation({
  ukAudioUrl,
  ukPhonetic,
  usAudioUrl,
  usPhonetic,
  word,
}: VocabularyPronunciationProps) {
  const shouldShowUs = Boolean(word || usPhonetic || usAudioUrl);
  const shouldShowUk = Boolean(word || ukPhonetic || ukAudioUrl);

  if (!shouldShowUs && !shouldShowUk) {
    return null;
  }

  return (
    <div className="pronunciation-row" aria-label="单词读音">
      {shouldShowUk ? (
        <button
          className="pronunciation-pill"
          onClick={() => playVocabularyPronunciation({ accent: "uk", audioUrl: ukAudioUrl, word })}
          type="button"
        >
          <span aria-hidden="true">英</span>
          <strong>{formatPhonetic(ukPhonetic)}</strong>
          <small aria-hidden="true">
            <SoundWaveIcon />
          </small>
        </button>
      ) : null}
      {shouldShowUs ? (
        <button
          className="pronunciation-pill"
          onClick={() => playVocabularyPronunciation({ accent: "us", audioUrl: usAudioUrl, word })}
          type="button"
        >
          <span aria-hidden="true">美</span>
          <strong>{formatPhonetic(usPhonetic)}</strong>
          <small aria-hidden="true">
            <SoundWaveIcon />
          </small>
        </button>
      ) : null}
    </div>
  );
}

export function VocabularyInlinePronunciation({
  ukAudioUrl,
  ukPhonetic,
  usAudioUrl,
  usPhonetic,
  word,
}: VocabularyPronunciationProps) {
  const shouldShowUs = Boolean(word || usPhonetic || usAudioUrl);
  const shouldShowUk = Boolean(word || ukPhonetic || ukAudioUrl);

  if (!shouldShowUs && !shouldShowUk) {
    return null;
  }

  return (
    <div className="inline-pronunciation" aria-label={`${word} 音标和发音`}>
      {shouldShowUk ? (
        <span className="inline-pronunciation-side">
          <b aria-hidden="true">英</b>
          <span>{formatPhonetic(ukPhonetic)}</span>
          <button
            aria-label={`播放 ${word} 英音`}
            className="pronunciation-wave"
            onClick={() => playVocabularyPronunciation({ accent: "uk", audioUrl: ukAudioUrl, word })}
            type="button"
          >
            <SoundWaveIcon />
          </button>
        </span>
      ) : null}
      {shouldShowUs ? (
        <span className="inline-pronunciation-side">
          <b aria-hidden="true">美</b>
          <span>{formatPhonetic(usPhonetic)}</span>
          <button
            aria-label={`播放 ${word} 美音`}
            className="pronunciation-wave"
            onClick={() => playVocabularyPronunciation({ accent: "us", audioUrl: usAudioUrl, word })}
            type="button"
          >
            <SoundWaveIcon />
          </button>
        </span>
      ) : null}
    </div>
  );
}
