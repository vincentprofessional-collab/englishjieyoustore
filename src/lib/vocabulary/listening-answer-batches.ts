import type { ListeningAnswerDeckId, ListeningAnswerWord } from "./listening-answer-words";

export const LISTENING_ANSWER_WORDS_PER_GROUP = 10;

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
