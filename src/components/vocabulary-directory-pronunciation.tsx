"use client";

import { playVocabularyPronunciation } from "@/lib/vocabulary/pronunciation-audio";

type VocabularyDirectoryPronunciationProps = {
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

export function VocabularyDirectoryPronunciation({
  ukAudioUrl,
  ukPhonetic,
  usAudioUrl,
  usPhonetic,
  word,
}: VocabularyDirectoryPronunciationProps) {
  const ukLabel = formatPhonetic(ukPhonetic);
  const usLabel = formatPhonetic(usPhonetic);
  const shouldShowUk = Boolean(word || ukLabel || ukAudioUrl);
  const shouldShowUs = Boolean(word || usLabel || usAudioUrl);

  if (!shouldShowUk && !shouldShowUs) {
    return <span className="etymology-word-pronunciation" aria-label="暂无音标" />;
  }

  return (
    <span className="etymology-word-pronunciation" aria-label={`${word} 音标和发音`}>
      <span className="etymology-word-pronunciation-inner">
        {shouldShowUk ? (
          <button
            aria-label={`播放 ${word} 英音`}
            className="directory-pronunciation-button"
            onClick={() => playVocabularyPronunciation({ accent: "uk", audioUrl: ukAudioUrl, word })}
            type="button"
          >
            <b aria-hidden="true">英</b>
            {ukLabel ? <span>{ukLabel}</span> : null}
            <SoundWaveIcon />
          </button>
        ) : null}
        {shouldShowUs ? (
          <button
            aria-label={`播放 ${word} 美音`}
            className="directory-pronunciation-button"
            onClick={() => playVocabularyPronunciation({ accent: "us", audioUrl: usAudioUrl, word })}
            type="button"
          >
            <b aria-hidden="true">美</b>
            {usLabel ? <span>{usLabel}</span> : null}
            <SoundWaveIcon />
          </button>
        ) : null}
      </span>
    </span>
  );
}
