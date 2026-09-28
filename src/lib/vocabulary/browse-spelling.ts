export type BrowseSpellingMistakeStore = Record<string, Record<string, number>>;

export function updateBrowseSpellingMistakes(
  store: BrowseSpellingMistakeStore,
  bookKey: string,
  wordId: string,
  correct: boolean,
  now: number,
): BrowseSpellingMistakeStore {
  if (correct) return store;
  return { ...store, [bookKey]: { ...store[bookKey], [wordId]: now } };
}
