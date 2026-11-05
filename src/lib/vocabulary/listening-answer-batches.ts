import type { ListeningAnswerDeckId, ListeningAnswerWord } from "./listening-answer-words";

export const LISTENING_ANSWER_WORDS_PER_GROUP = 20;
export const LISTENING_ANSWER_AUDIO_WORDS_PER_CLIP = 10;
const NUMBER_AUDIO_SHORT_PAUSE_LIMIT_MS = 500;

// Offsets are taken from the delivered part MP3 durations, so local word
// timestamps map to the corresponding position in each deck's full recording.
const PART_OFFSETS_MS: Record<ListeningAnswerDeckId, readonly number[]> = {
  core346: [0, 262075, 521774, 783081, 1045108, 1307399],
  answers683: [0, 207840, 416640, 623952, 831312, 1038504, 1244592, 1453152, 1660128, 1868208, 2073816, 2282016],
  numbers208: [0, 186276, 363234],
};

export type ListeningAnswerBatchRange = {
  endMs: number;
  endWordIndex: number;
  startMs: number;
  startWordIndex: number;
  words: ListeningAnswerWord[];
};

export function getNumberAudioClipNumbers(batch: Pick<ListeningAnswerBatchRange, "endWordIndex" | "startWordIndex">) {
  const firstClip = Math.floor(batch.startWordIndex / LISTENING_ANSWER_AUDIO_WORDS_PER_CLIP) + 1;
  const lastClip = Math.floor(batch.endWordIndex / LISTENING_ANSWER_AUDIO_WORDS_PER_CLIP) + 1;
  return Array.from({ length: lastClip - firstClip + 1 }, (_, index) => firstClip + index);
}

export function getNumberAudioWordSegment(
  deckId: ListeningAnswerDeckId,
  words: ListeningAnswerWord[],
  wordIndex: number,
) {
  if (deckId !== "numbers208" || !Number.isInteger(wordIndex) || wordIndex < 0 || wordIndex >= words.length) return null;

  const clipWordStartIndex = Math.floor(wordIndex / LISTENING_ANSWER_AUDIO_WORDS_PER_CLIP) * LISTENING_ANSWER_AUDIO_WORDS_PER_CLIP;
  const clipWordEndIndex = Math.min(clipWordStartIndex + LISTENING_ANSWER_AUDIO_WORDS_PER_CLIP, words.length);
  let clipOffsetMs = 0;

  for (let index = clipWordStartIndex; index < clipWordEndIndex; index += 1) {
    const word = words[index];
    const wordStartMs = getFullRecordingWordStartMs(deckId, word);
    let wordEndMs = wordStartMs + word.audioEndMs - word.audioStartMs;
    if (index + 1 < clipWordEndIndex) {
      const nextWordStartMs = getFullRecordingWordStartMs(deckId, words[index + 1]);
      const gapMs = nextWordStartMs - wordEndMs;
      if (gapMs < 0) return null;
      if (gapMs <= NUMBER_AUDIO_SHORT_PAUSE_LIMIT_MS) wordEndMs = nextWordStartMs;
    }

    const segmentDurationMs = wordEndMs - wordStartMs;
    if (index === wordIndex) {
      return {
        clipNumber: Math.floor(wordIndex / LISTENING_ANSWER_AUDIO_WORDS_PER_CLIP) + 1,
        endMs: clipOffsetMs + segmentDurationMs,
        startMs: clipOffsetMs,
      };
    }
    clipOffsetMs += segmentDurationMs;
  }

  return null;
}

export function getFullRecordingWordStartMs(deckId: ListeningAnswerDeckId, word: ListeningAnswerWord) {
  if (word.audioPart === "full") return word.audioStartMs;
  const match = word.audioPart.match(/^part(\d+)$/);
  if (!match) return word.audioStartMs;
  const offset = PART_OFFSETS_MS[deckId][Number(match[1]) - 1];
  return (offset ?? 0) + word.audioStartMs;
}

export function getListeningAnswerBatchRange(
  deckId: ListeningAnswerDeckId,
  words: ListeningAnswerWord[],
  groupIndex: number,
): ListeningAnswerBatchRange | null {
  const startWordIndex = groupIndex * LISTENING_ANSWER_WORDS_PER_GROUP;
  if (startWordIndex < 0 || startWordIndex >= words.length) return null;
  const endWordIndex = Math.min(startWordIndex + LISTENING_ANSWER_WORDS_PER_GROUP, words.length) - 1;
  const batchWords = words.slice(startWordIndex, endWordIndex + 1);
  const first = batchWords[0];
  const last = batchWords[batchWords.length - 1];
  const startMs = getFullRecordingWordStartMs(deckId, first);
  const endMs = getFullRecordingWordStartMs(deckId, last) + (last.audioEndMs - last.audioStartMs);
  return { endMs, endWordIndex, startMs, startWordIndex, words: batchWords };
}
