const STUDY_RETURN_STORAGE_PREFIX = "englishjieyou.vocabulary-study-return:";
const STUDY_RETURN_MAX_AGE_MS = 30 * 60 * 1_000;

export function getVocabularyDetailHref(word: string, returnTo: string) {
  const search = new URLSearchParams({ returnTo });
  return `/vocabulary/${encodeURIComponent(word)}?${search.toString()}`;
}

export function saveVocabularyStudyReturn(path: string, state: unknown) {
  try {
    window.sessionStorage.setItem(
      `${STUDY_RETURN_STORAGE_PREFIX}${path}`,
      JSON.stringify({ savedAt: Date.now(), state }),
    );
  } catch {
    // Restoring the page is a convenience; navigation still works if storage is unavailable.
  }
}

export function consumeVocabularyStudyReturn<T>(path: string): T | null {
  try {
    const key = `${STUDY_RETURN_STORAGE_PREFIX}${path}`;
    const rawValue = window.sessionStorage.getItem(key);
    if (!rawValue) {
      return null;
    }

    window.sessionStorage.removeItem(key);
    const saved = JSON.parse(rawValue) as { savedAt?: number; state?: T };
    if (
      typeof saved.savedAt !== "number" ||
      Date.now() - saved.savedAt > STUDY_RETURN_MAX_AGE_MS ||
      !saved.state
    ) {
      return null;
    }

    return saved.state;
  } catch {
    return null;
  }
}
