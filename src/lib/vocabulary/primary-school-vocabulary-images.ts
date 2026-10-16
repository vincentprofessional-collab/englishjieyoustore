import { getManagedMediaUrl } from "@/lib/media/url";

export const vocabularyImageLevels = [
  { id: "primary", label: "小学", sourceLevel: null, pathPrefix: "primary-school-vocabulary" },
  { id: "junior-high", label: "初中", sourceLevel: "初中", pathPrefix: "junior-high-vocabulary" },
  { id: "senior-high", label: "高中", sourceLevel: "高中", pathPrefix: "senior-high-vocabulary" },
  { id: "cet4", label: "四级", sourceLevel: "四级", pathPrefix: "cet4-vocabulary" },
  { id: "cet6", label: "六级", sourceLevel: "六级", pathPrefix: "cet6-vocabulary" },
  { id: "toefl-ielts", label: "托雅", sourceLevel: "托雅", pathPrefix: "toefl-ielts-vocabulary" },
  { id: "sat", label: "SAT", sourceLevel: "SAT", pathPrefix: "sat-vocabulary" },
  { id: "gre", label: "GRE", sourceLevel: "GRE", pathPrefix: "gre-vocabulary" },
  { id: "gmat", label: "GMAT", sourceLevel: "GMAT", pathPrefix: "gmat-vocabulary" },
  { id: "kaoyan", label: "考研", sourceLevel: "考研", pathPrefix: "kaoyan-vocabulary" },
] as const;

export type VocabularyImageLevelId = (typeof vocabularyImageLevels)[number]["id"];

export function getVocabularyImageLevel(levelId: string) {
  return vocabularyImageLevels.find(({ id }) => id === levelId) ?? null;
}

export function normalizePrimarySchoolVocabularyWord(word: string) {
  const normalized = word.normalize("NFKC").trim().toLowerCase();
  return /^[a-z]+(?:-[a-z]+)*$/.test(normalized) ? normalized : null;
}

export function getPrimarySchoolVocabularyImagePath(word: string) {
  return getVocabularyImagePath("primary", word);
}

export function isPrimarySchoolVocabularyImagePath(path: string) {
  return isVocabularyImagePath(path);
}

export function getVocabularyImagePath(levelId: string, word: string) {
  const level = getVocabularyImageLevel(levelId);
  const normalized = normalizePrimarySchoolVocabularyWord(word);
  return level && normalized ? `${level.pathPrefix}/${normalized}.webp` : null;
}

export function isVocabularyImagePath(path: string) {
  const [prefix, filename, ...rest] = path.trim().replace(/^\/+|\/+$/g, "").split("/");
  return rest.length === 0
    && vocabularyImageLevels.some(({ pathPrefix }) => pathPrefix === prefix?.toLowerCase())
    && /^[a-z]+(?:-[a-z]+)*\.webp$/i.test(filename ?? "");
}

export function getPrimarySchoolVocabularyImageUrl(word: string) {
  const path = getPrimarySchoolVocabularyImagePath(word);
  return path ? getManagedMediaUrl("images", path) : null;
}

export function getVocabularyImageUrl(levelId: string, word: string) {
  const path = getVocabularyImagePath(levelId, word);
  return path ? getManagedMediaUrl("images", path) : null;
}
