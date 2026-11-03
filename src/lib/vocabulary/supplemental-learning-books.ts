import gradedPhrases from "@/data/vocabulary/graded-phrases.json";
import idiomaticExpressions from "@/data/vocabulary/idiomatic-expressions.json";
import ieltsSpecialBooks from "@/data/vocabulary/ielts-special-learning-books.json";
import slangProverbs from "@/data/vocabulary/slang-proverbs.json";
import { getBbcPhraseLemma } from "@/lib/vocabulary/bbc-phrase-lemma";
import {
  isSupplementalLearningBook,
  type LearningBookKey,
  type LearningWord,
} from "@/lib/vocabulary/learning";

type SupplementalSourceEntry = {
  articleCategory?: string;
  definitionCn: string;
  englishDefinition?: string;
  example?: string;
  exampleTranslation?: string;
  extension?: string;
  note?: string;
  origin?: string;
  partOfSpeech: string;
  phonetic: string;
  frequency?: number;
  frequencyRank?: number;
  group?: number;
  word: string;
};

const gradedPhraseBooks: Partial<Record<LearningBookKey, SupplementalSourceEntry[]>> = {
  小学短语: gradedPhrases.小学 as SupplementalSourceEntry[],
  初中短语: gradedPhrases.初中 as SupplementalSourceEntry[],
  高中短语: gradedPhrases.高中 as SupplementalSourceEntry[],
};

function getSourceEntries(book: LearningBookKey): SupplementalSourceEntry[] {
  if (gradedPhraseBooks[book]) return gradedPhraseBooks[book] ?? [];
  if (book === "雅思听力答案词" || book === "雅思听力高频词" || book === "雅思阅读高频词") {
    return ieltsSpecialBooks[book] as SupplementalSourceEntry[];
  }
  return (book === "地道表达" ? idiomaticExpressions : slangProverbs) as SupplementalSourceEntry[];
}

const supplementalWords = new Map<LearningBookKey, LearningWord[]>();

function toLearningWord(entry: SupplementalSourceEntry, book: LearningBookKey, index: number): LearningWord {
  const definitionCn = entry.definitionCn || entry.exampleTranslation || entry.englishDefinition || "暂无释义";
  const word = book === "地道表达" ? getBbcPhraseLemma(entry.word) : entry.word;
  const isZoningOutEntry = book === "地道表达" && entry.word.toLowerCase() === "zoning out";
  const partOfSpeech = isZoningOutEntry ? "phr. v." : entry.partOfSpeech || (book === "俚语俗语" ? "习语" : "phr.");
  const phonetic = isZoningOutEntry ? "/zəʊn aʊt/" : entry.phonetic;
  const usPhonetic = isZoningOutEntry ? "/zoʊn aʊt/" : entry.phonetic;

  return {
    antonyms: [],
    articleCategory: entry.articleCategory,
    definitionCn,
    definitionGroups: [{ definitions: [definitionCn], partOfSpeech, text: definitionCn }],
    definitionLines: [definitionCn],
    englishDefinitions: entry.englishDefinition ? [entry.englishDefinition] : [],
    englishExamples: entry.example ? [entry.example] : [],
    englishExampleTranslations: entry.exampleTranslation ? [entry.exampleTranslation] : [],
    extension: entry.extension ?? "",
    etymologySource: "",
    etymologyStory: entry.origin ?? "",
    formation: "",
    id: `${book}:${index + 1}:${entry.word.toLowerCase()}`,
    inflections: [],
    level: book,
    partOfSpeech,
    phonetic,
    reviewNotes: isZoningOutEntry ? ["动词短语原形；zoning out 是它的 -ing 形式。"] : entry.note ? [entry.note] : [],
    root: "",
    ...(entry.frequencyRank ? { frequencyRank: entry.frequencyRank } : {}),
    ...(entry.frequency !== undefined ? {
      stageFrequencies: { [book]: entry.frequency },
      studyBookGroups: { [book]: entry.group ?? 1 },
      studyFrequency: entry.frequency,
      totalFrequency: entry.frequency,
    } : {}),
    synonyms: [],
    ukAudioUrl: "",
    ukPhonetic: phonetic,
    usAudioUrl: "",
    usPhonetic,
    word,
  };
}

export function getSupplementalLearningWords(book: LearningBookKey): LearningWord[] | null {
  if (!isSupplementalLearningBook(book)) return null;
  const cached = supplementalWords.get(book);
  if (cached) return cached;
  const words = getSourceEntries(book).map((entry, index) => toLearningWord(entry, book, index));
  supplementalWords.set(book, words);
  return words;
}
