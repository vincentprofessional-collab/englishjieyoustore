import type {
  LocalVocabularyEntry,
  VocabularyDefinitionGroup,
  VocabularyInflection,
} from "@/lib/vocabulary/local-vocabulary";

export const FAVORITE_WORDS_STORAGE_KEY = "ielts-platform.favoriteWords";
export const FAVORITE_WORDS_CHANGED_EVENT = "vocabulary-favorite-words-changed";

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
  { key: "未分级", label: "未分级", rank: 0, description: "待归入等级的词" },
] as const;

export type LearningBookKey = (typeof LEARNING_BOOKS)[number]["key"];

export type LearningWord = {
  antonyms: string[];
  definitionCn: string;
  definitionGroups: VocabularyDefinitionGroup[];
  definitionLines: string[];
  englishDefinitions: string[];
  englishExamples: string[];
  etymologySource: string;
  etymologyStory: string;
  formation: string;
  id: string;
  inflections: VocabularyInflection[];
  level: string;
  partOfSpeech: string;
  phonetic: string;
  reviewNotes: string[];
  root: string;
  synonyms: string[];
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

  if (/托福|雅思|托雅/.test(normalizedLevel)) {
    return "托雅";
  }

  return "未分级";
}

export function getLearningBookEntries(entries: LocalVocabularyEntry[], book: LearningBookKey | "全部") {
  if (book === "全部") {
    return entries;
  }

  if (book === "未分级") {
    return entries.filter((entry) => getLearningLevelKey(entry.level) === "未分级");
  }

  const selectedRank = LEARNING_BOOKS.find((candidate) => candidate.key === book)?.rank ?? 0;

  return entries.filter((entry) => {
    const entryKey = getLearningLevelKey(entry.level);
    const entryRank = LEARNING_BOOKS.find((candidate) => candidate.key === entryKey)?.rank ?? 0;
    return entryRank > 0 && entryRank <= selectedRank;
  });
}

export function getLearningBookCounts(entries: LocalVocabularyEntry[]) {
  let previousTotal = 0;

  return Object.fromEntries(
    LEARNING_BOOKS.map((book) => {
      const total = getLearningBookEntries(entries, book.key).length;

      if (book.rank > 0) {
        const added = total - previousTotal;
        previousTotal = total;
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
    id: entry.normalizedWord,
    inflections: entry.inflections,
    level: getLearningLevelKey(entry.level),
    partOfSpeech: entry.partOfSpeech,
    phonetic: entry.phonetic,
    reviewNotes: entry.reviewNotes,
    root: entry.root,
    synonyms: entry.synonyms,
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
