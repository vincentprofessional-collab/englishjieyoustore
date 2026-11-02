import type {
  LocalVocabularyEntry,
  VocabularyDefinitionGroup,
  VocabularyInflection,
} from "@/lib/vocabulary/local-vocabulary";

export const FAVORITE_WORDS_STORAGE_KEY = "ielts-platform.favoriteWords";
export const FAVORITE_WORDS_CHANGED_EVENT = "vocabulary-favorite-words-changed";

export const LEARNING_COLLECTIONS = [
  { key: "mastered", label: "已掌握" },
  { key: "familiar", label: "熟悉" },
  { key: "unfamiliar", label: "生僻" },
  { key: "vague", label: "模糊" },
] as const;
export type LearningCollectionKey = (typeof LEARNING_COLLECTIONS)[number]["key"];

export const LEARNING_BOOKS = [
  { key: "小学", label: "小学", rank: 1, description: "基础高频词" },
  { key: "初中", label: "初中", rank: 2, description: "初中核心词" },
  { key: "高中", label: "高中", rank: 3, description: "高中核心词" },
  { key: "四级", label: "四级", rank: 4, description: "大学英语四级" },
  { key: "六级", label: "六级", rank: 5, description: "大学英语六级" },
  { key: "考研", label: "考研", rank: 6, description: "考研核心词" },
  { key: "托雅", label: "托雅", rank: 7, description: "托福与雅思词汇" },
  { key: "SAT", label: "SAT", rank: 8, description: "SAT 词汇" },
  { key: "GMAT", label: "GMAT", rank: 9, description: "GMAT 词汇" },
  { key: "GRE", label: "GRE", rank: 10, description: "GRE 词汇" },
  { key: "其他词汇", label: "其他词汇", rank: 0, description: "其他未归入等级的词汇" },
  { key: "小学短语", label: "小学短语", rank: 0, description: "教学大纲小学短语" },
  { key: "初中短语", label: "初中短语", rank: 0, description: "教学大纲初中短语" },
  { key: "高中短语", label: "高中短语", rank: 0, description: "教学大纲高中短语" },
  { key: "地道表达", label: "地道表达", rank: 0, description: "常用地道表达与搭配" },
  { key: "俚语俗语", label: "俚语俗语", rank: 0, description: "英语俚语与常见俗语" },
] as const;

export type LearningBookKey = (typeof LEARNING_BOOKS)[number]["key"];
export const SUPPLEMENTAL_LEARNING_BOOK_KEYS = [
  "小学短语", "初中短语", "高中短语", "地道表达", "俚语俗语",
] as const satisfies readonly LearningBookKey[];

export function isSupplementalLearningBook(book: string): book is (typeof SUPPLEMENTAL_LEARNING_BOOK_KEYS)[number] {
  return (SUPPLEMENTAL_LEARNING_BOOK_KEYS as readonly string[]).includes(book);
}

export type LearningWord = {
  antonyms: string[];
  definitionCn: string;
  definitionGroups: VocabularyDefinitionGroup[];
  definitionLines: string[];
  englishDefinitions: string[];
  englishExamples: string[];
  englishExampleTranslations?: string[];
  extension?: string;
  etymologySource: string;
  etymologyStory: string;
  formation: string;
  frequencyRank?: number;
  id: string;
  inflections: VocabularyInflection[];
  level: string;
  partOfSpeech: string;
  phonetic: string;
  reviewNotes: string[];
  root: string;
  stageFrequencies?: Record<string, number>;
  studyBookGroups?: Record<string, number>;
  studyBookMemberships?: string[];
  studyFrequency?: number;
  synonyms: string[];
  totalFrequency?: number;
  ukAudioUrl: string;
  ukPhonetic: string;
  usAudioUrl: string;
  usPhonetic: string;
  word: string;
};

export type FavoriteLearningWord = {
  definitionCn?: string;
  definitionLines?: string[];
  id: string;
  level?: string;
  partOfSpeech?: string;
  phonetic?: string;
  ukPhonetic?: string;
  usPhonetic?: string;
  word: string;
};

export function getLearningLevelKey(level: string): LearningBookKey {
  const normalizedLevel = level.trim();

  if (LEARNING_BOOKS.some((book) => book.key === normalizedLevel)) {
    return normalizedLevel as LearningBookKey;
  }

  if (normalizedLevel === "未分级") return "其他词汇";

  if (/托福|雅思|托雅/.test(normalizedLevel)) {
    return "托雅";
  }

  return "其他词汇";
}

export function getLearningBookEntries(entries: LocalVocabularyEntry[], book: LearningBookKey | "全部") {
  const latestWorkbookEntries = entries.filter((entry) => entry.isLatestWorkbookVocabulary !== false);

  if (book === "全部") {
    return latestWorkbookEntries;
  }

  if (book === "其他词汇") {
    return latestWorkbookEntries.filter((entry) => entry.studyBookMemberships
      ? entry.studyBookMemberships.includes("其他词汇")
      : getLearningLevelKey(entry.level) === "其他词汇");
  }
  return latestWorkbookEntries.filter((entry) => entry.studyBookMemberships
    ? entry.studyBookMemberships.includes(book)
    : getLearningLevelKey(entry.level) === book);
}

export function getLearningBookCounts(
  entries: LocalVocabularyEntry[],
  supplementalCounts: Partial<Record<LearningBookKey, number>> = {},
) {
  const includedWords = new Set<string>();

  return Object.fromEntries(
    LEARNING_BOOKS.map((book) => {
      const members = getLearningBookEntries(entries, book.key);
      const total = supplementalCounts[book.key] ?? members.length;

      if (book.rank > 0) {
        let added = 0;
        for (const entry of members) {
          if (!includedWords.has(entry.normalizedWord)) added += 1;
          includedWords.add(entry.normalizedWord);
        }
        return [book.key, { added, total }];
      }

      return [book.key, { added: total, total }];
    }),
  ) as Record<LearningBookKey, { added: number; total: number }>;
}

export function toLearningWord(entry: LocalVocabularyEntry): LearningWord {
  return {
    antonyms: entry.antonyms,
    definitionCn: entry.definitionCn,
    definitionGroups: entry.definitionGroups,
    definitionLines: entry.definitionLines,
    englishDefinitions: entry.englishDefinitions,
    englishExamples: entry.englishExamples,
    etymologySource: entry.etymologySource,
    etymologyStory: entry.etymologyStory,
    formation: entry.formation,
    frequencyRank: entry.frequencyRank,
    id: entry.normalizedWord,
    inflections: entry.inflections,
    level: entry.studyBookMemberships?.[0] ?? getLearningLevelKey(entry.level),
    partOfSpeech: entry.partOfSpeech,
    phonetic: entry.phonetic,
    reviewNotes: entry.reviewNotes,
    root: entry.root,
    stageFrequencies: entry.stageFrequencies,
    studyBookGroups: entry.studyBookGroups,
    studyBookMemberships: entry.studyBookMemberships,
    studyFrequency: entry.studyFrequency,
    synonyms: entry.synonyms,
    totalFrequency: entry.totalFrequency,
    ukAudioUrl: entry.ukAudioUrl ?? "",
    ukPhonetic: entry.ukPhonetic ?? entry.phonetic,
    usAudioUrl: entry.usAudioUrl ?? "",
    usPhonetic: entry.usPhonetic ?? entry.phonetic,
    word: entry.word,
  };
}

export function toLearningWordFromFavorite(favorite: FavoriteLearningWord): LearningWord {
  const definitionCn = typeof favorite.definitionCn === "string" ? favorite.definitionCn : "";
  const phonetic = typeof favorite.phonetic === "string" ? favorite.phonetic : "";
  return {
    antonyms: [],
    definitionCn,
    definitionGroups: [],
    definitionLines: Array.isArray(favorite.definitionLines) && favorite.definitionLines.length
      ? favorite.definitionLines.filter((line): line is string => typeof line === "string")
      : definitionCn ? [definitionCn] : [],
    englishDefinitions: [],
    englishExamples: [],
    etymologySource: "",
    etymologyStory: "",
    formation: "",
    id: favorite.id,
    inflections: [],
    level: typeof favorite.level === "string" ? favorite.level : "生词本",
    partOfSpeech: typeof favorite.partOfSpeech === "string" ? favorite.partOfSpeech : "",
    phonetic,
    reviewNotes: [],
    root: "",
    synonyms: [],
    ukAudioUrl: "",
    ukPhonetic: typeof favorite.ukPhonetic === "string" ? favorite.ukPhonetic : phonetic,
    usAudioUrl: "",
    usPhonetic: typeof favorite.usPhonetic === "string" ? favorite.usPhonetic : phonetic,
    word: favorite.word,
  };
}
