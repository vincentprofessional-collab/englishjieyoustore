export type ListeningAnswerDeckId = "core346" | "answers683" | "numbers208";

export type ListeningAnswerWord = {
  id: string;
  answer: string;
  phonetic?: string;
  partOfSpeech?: string;
  meaning?: string;
  category?: string;
  audioPart: string;
  audioStartMs: number;
  audioEndMs: number;
};

export type ListeningAnswerDeck = {
  id: ListeningAnswerDeckId;
  title: string;
  subtitle: string;
  description: string;
  source: string;
  words: ListeningAnswerWord[];
};
