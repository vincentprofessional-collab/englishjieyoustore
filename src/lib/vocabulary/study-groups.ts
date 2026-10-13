export const VOCABULARY_GROUP_SIZE = 20;

export function vocabularyStudyGroupIndex(value: unknown, wordCount?: number): number | null {
  if (!Number.isInteger(value) || Number(value) < 0) return null;
  if (wordCount !== undefined && wordCount <= 0) return null;
  return wordCount === undefined ? Number(value) : Math.min(Number(value), Math.ceil(wordCount / VOCABULARY_GROUP_SIZE) - 1);
}

export function selectVocabularyStudyGroup<T>(words: readonly T[], group: number | null): T[] {
  const index = vocabularyStudyGroupIndex(group, words.length);
  return index === null ? [...words] : words.slice(index * VOCABULARY_GROUP_SIZE, (index + 1) * VOCABULARY_GROUP_SIZE);
}
