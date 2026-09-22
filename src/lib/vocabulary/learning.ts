import type {
  LocalVocabularyEntry,
  VocabularyDefinitionGroup,
  VocabularyInflection,
} from "@/lib/vocabulary/local-vocabulary";

export const LEARNING_BOOKS = [
  { key: "小学", label: "小学", rank: 1, description: "基础高频词" },
  { key: "初中", label: "初中", rank: 2, description: "初中核心词" },
  { key: "高中", label: "高中", rank: 3, description: "高中核心词" },
  { key: "四级", label: "四级", rank: 4, description: "大学英语四级" },
  { key: "六级", label: "六级", rank: 5, description: "大学英语六级" },
  { key: "考研", label: "考研", rank: 6, description: "考研核心词" },
  { key: "托雅", label: "托福 / 雅思", rank: 7, description: "托福与雅思词汇" },
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

  return entries.filter((entry) => getLearningLevelKey(entry.level) === book);
}

export function getLearningBookCounts(entries: LocalVocabularyEntry[]) {
  let cumulativeCount = 0;

  return Object.fromEntries(
    LEARNING_BOOKS.map((book) => {
      const directCount = getLearningBookEntries(entries, book.key).length;

      if (book.rank > 0) {
        cumulativeCount += directCount;
        return [book.key, { added: directCount, total: cumulativeCount }];
      }

      return [book.key, { added: directCount, total: cumulativeCount + directCount }];
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
