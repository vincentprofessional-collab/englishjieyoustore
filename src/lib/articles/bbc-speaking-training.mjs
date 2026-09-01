const WORD_PATTERN = /[A-Za-z]+(?:['’-][A-Za-z]+)*/g;

export function getWordCount(text) {
  return text.match(WORD_PATTERN)?.length ?? 0;
}

export function getActiveWordIndex(text, positionSeconds, durationSeconds) {
  const wordCount = getWordCount(text);
  if (wordCount === 0) {
    return null;
  }

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return 0;
  }

  const progress = Math.min(Math.max(positionSeconds / durationSeconds, 0), 1);
  return Math.min(wordCount - 1, Math.floor(progress * wordCount));
}

export function getSpeakingPracticeDelayMs(mode, durationSeconds) {
  const durationMs = Math.max(0, durationSeconds) * 1_000;

  if (mode === "imitation") {
    return durationMs;
  }

  if (mode === "sight-translation") {
    return durationMs * 1.5;
  }

  if (mode === "shadowing") {
    return 3_000;
  }

  return 0;
}

export function getNextSentenceNo(sentenceNos, currentSentenceNo, playMode) {
  if (playMode === "sentence-loop") {
    return currentSentenceNo;
  }

  const currentIndex = sentenceNos.indexOf(currentSentenceNo);
  return currentIndex >= 0 ? (sentenceNos[currentIndex + 1] ?? null) : null;
}
