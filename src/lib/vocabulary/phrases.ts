import { normalizeLookupWord } from "@/lib/vocabulary/local-vocabulary";

export type VocabularyPhraseMatch = {
  chineseText?: string;
  id: string;
  phrase: string;
  sourceTitle?: string;
};

export function getVocabularyPhraseMatches(word: string): VocabularyPhraseMatch[] {
  const normalizedWord = normalizeLookupWord(word);

  if (!normalizedWord) {
    return [];
  }

  // Future hook: load the uploaded phrase Excel here and return phrases whose
  // normalized text contains the current word.
  return [];
}
