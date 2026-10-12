import { getManagedMediaUrl } from "@/lib/media/url";

export function normalizePrimarySchoolVocabularyWord(word: string) {
  const normalized = word.normalize("NFKC").trim().toLowerCase();
  return /^[a-z]+(?:-[a-z]+)*$/.test(normalized) ? normalized : null;
}

export function getPrimarySchoolVocabularyImagePath(word: string) {
  const normalized = normalizePrimarySchoolVocabularyWord(word);
  return normalized ? `primary-school-vocabulary/${normalized}.webp` : null;
}

export function isPrimarySchoolVocabularyImagePath(path: string) {
  return /^primary-school-vocabulary\/[a-z]+(?:-[a-z]+)*\.webp$/i.test(path.trim().replace(/^\/+|\/+$/g, ""));
}

export function getPrimarySchoolVocabularyImageUrl(word: string) {
  const path = getPrimarySchoolVocabularyImagePath(word);
  return path ? getManagedMediaUrl("images", path) : null;
}
