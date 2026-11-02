import { LEARNING_BOOKS, type LearningWord } from "@/lib/vocabulary/learning";
import { getBbcPhraseLemma } from "@/lib/vocabulary/bbc-phrase-lemma";

export const VOCABULARY_LEARNING_CONTENT_SLUG = "vocabulary-learning-admin-content";

export type LearningBookOverride = {
  label: string;
  description: string;
  custom?: boolean;
  deleted?: boolean;
};

export type LearningWordOverride = {
  deleted?: boolean;
  word?: LearningWord;
};

export type LearningBookWordChanges = {
  overrides: Record<string, LearningWordOverride>;
  additions: LearningWord[];
};

export type VocabularyLearningContent = {
  books: Record<string, LearningBookOverride>;
  entries: Record<string, LearningBookWordChanges>;
};

export type LearningBookOption = { key: string; label: string; description: string };

export const EMPTY_VOCABULARY_LEARNING_CONTENT: VocabularyLearningContent = { books: {}, entries: {} };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function normalizeVocabularyLearningContent(value: unknown): VocabularyLearningContent {
  if (!isRecord(value)) return EMPTY_VOCABULARY_LEARNING_CONTENT;
  const books: Record<string, LearningBookOverride> = {};
  if (isRecord(value.books)) {
    for (const [key, raw] of Object.entries(value.books)) {
      if (!isRecord(raw)) continue;
      books[key] = {
        label: typeof raw.label === "string" ? raw.label : key,
        description: typeof raw.description === "string" ? raw.description : "",
        ...(raw.custom === true ? { custom: true } : {}),
        ...(raw.deleted === true ? { deleted: true } : {}),
      };
    }
  }
  const entries: Record<string, LearningBookWordChanges> = {};
  if (isRecord(value.entries)) {
    for (const [bookKey, rawBook] of Object.entries(value.entries)) {
      if (!isRecord(rawBook)) continue;
      const overrides: Record<string, LearningWordOverride> = {};
      if (isRecord(rawBook.overrides)) {
        for (const [id, rawOverride] of Object.entries(rawBook.overrides)) {
          if (!isRecord(rawOverride)) continue;
          const word = isRecord(rawOverride.word) && typeof rawOverride.word.id === "string" ? rawOverride.word as unknown as LearningWord : undefined;
          overrides[id] = { ...(rawOverride.deleted === true ? { deleted: true } : {}), ...(word ? { word } : {}) };
        }
      }
      const additions = Array.isArray(rawBook.additions)
        ? rawBook.additions.filter((word): word is LearningWord => isRecord(word) && typeof word.id === "string" && typeof word.word === "string")
        : [];
      entries[bookKey] = { overrides, additions };
    }
  }
  return { books, entries };
}

export function getManagedLearningBooks(state: VocabularyLearningContent): LearningBookOption[] {
  const builtIn = LEARNING_BOOKS.flatMap((book) => {
    const override = state.books[book.key];
    if (override?.deleted) return [];
    return [{ key: book.key, label: override?.label || book.label, description: override?.description || book.description }];
  });
  const builtInKeys = new Set<string>(LEARNING_BOOKS.map((book) => book.key));
  const custom = Object.entries(state.books)
    .filter(([key, value]) => !builtInKeys.has(key) && value.custom && !value.deleted)
    .map(([key, value]) => ({ key, label: value.label || key, description: value.description || "自定义词汇书" }));
  return [...builtIn, ...custom];
}

export function applyVocabularyLearningOverrides(words: LearningWord[], state: VocabularyLearningContent): LearningWord[] {
  const merged = new Map<string, LearningWord>();
  const normalizeBbcPhrase = (word: LearningWord) => {
    if (word.level !== "地道表达") return word;
    const normalizedWord = getBbcPhraseLemma(word.word);
    if (!word.bbcExampleSource) return normalizedWord === word.word ? word : { ...word, word: normalizedWord };
    const sourcePhrase = getBbcPhraseLemma(word.bbcExampleSource.normalizedPhrase || word.word);
    const normalizedSourcePhrase = sourcePhrase.normalize("NFKC").toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9]+/g, " ").trim();
    return {
      ...word,
      word: normalizedWord,
      bbcExampleSource: { ...word.bbcExampleSource, normalizedPhrase: normalizedSourcePhrase },
    };
  };
  for (const base of words) {
    if (state.books[base.level]?.deleted) continue;
    const change = state.entries[base.level]?.overrides[base.id];
    if (change?.deleted) continue;
    merged.set(base.id, normalizeBbcPhrase(change?.word ? { ...base, ...change.word, id: base.id, level: base.level } : base));
  }
  for (const [bookKey, changes] of Object.entries(state.entries)) {
    if (state.books[bookKey]?.deleted) continue;
    for (const word of changes.additions) {
      if (state.books[word.level]?.deleted) continue;
      merged.set(word.id, normalizeBbcPhrase(word));
    }
    for (const [id, change] of Object.entries(changes.overrides)) {
      if (change.deleted) merged.delete(id);
      else if (change.word) merged.set(id, normalizeBbcPhrase(change.word));
    }
  }
  return [...merged.values()];
}

export function getLearningWordsForBook(words: LearningWord[], book: string): LearningWord[] {
  if (book === "全部") return words;
  if (["小学短语", "初中短语", "高中短语", "地道表达", "俚语俗语"].includes(book)) {
    return words.filter((word) => word.level === book);
  }
  if (book === "其他词汇") return words.filter((word) => word.level === "其他词汇");
  const selectedRank = LEARNING_BOOKS.find((candidate) => candidate.key === book)?.rank;
  if (selectedRank === undefined) return words.filter((word) => word.level === book);
  return words.filter((word) => {
    const entryRank = LEARNING_BOOKS.find((candidate) => candidate.key === word.level)?.rank ?? 0;
    return entryRank > 0 && entryRank <= selectedRank;
  });
}

export function getLearningBookCounts(words: LearningWord[], books: LearningBookOption[]) {
  const exactCounts = new Map<string, number>();
  for (const word of words) exactCounts.set(word.level, (exactCounts.get(word.level) || 0) + 1);
  const result: Record<string, { added: number; total: number }> = {};
  for (const book of books) {
    const rank = LEARNING_BOOKS.find((item) => item.key === book.key)?.rank ?? 0;
    const direct = exactCounts.get(book.key) || 0;
    if (rank > 0) {
      const total = books.filter((item) => (LEARNING_BOOKS.find((known) => known.key === item.key)?.rank ?? 0) > 0 && (LEARNING_BOOKS.find((known) => known.key === item.key)?.rank ?? 0) <= rank)
        .reduce((sum, item) => sum + (exactCounts.get(item.key) || 0), 0);
      result[book.key] = { added: direct, total };
    } else {
      result[book.key] = { added: direct, total: direct };
    }
  }
  return result;
}
