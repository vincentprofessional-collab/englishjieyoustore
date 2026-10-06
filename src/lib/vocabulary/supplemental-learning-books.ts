import gradedPhrases from "@/data/vocabulary/graded-phrases.json";
import idiomaticExpressions from "@/data/vocabulary/idiomatic-expressions.json";
import slangProverbs from "@/data/vocabulary/slang-proverbs.json";
import {
  isSupplementalLearningBook,
  type LearningBookKey,
  type LearningWord,
} from "@/lib/vocabulary/learning";

type SupplementalSourceEntry = {
  definitionCn: string;
  englishDefinition?: string;
  example?: string;
  exampleTranslation?: string;
  note?: string;
  origin?: string;
  partOfSpeech: string;
  phonetic: string;
  word: string;
};

const gradedPhraseBooks: Partial<Record<LearningBookKey, SupplementalSourceEntry[]>> = {
  小学短语: gradedPhrases.小学 as SupplementalSourceEntry[],
  初中短语: gradedPhrases.初中 as SupplementalSourceEntry[],
  高中短语: gradedPhrases.高中 as SupplementalSourceEntry[],
};

function getSourceEntries(book: LearningBookKey): SupplementalSourceEntry[] {
  if (gradedPhraseBooks[book]) return gradedPhraseBooks[book] ?? [];
  return (book === "地道表达" ? idiomaticExpressions : slangProverbs) as SupplementalSourceEntry[];
}

const supplementalWords = new Map<LearningBookKey, LearningWord[]>();

function toLearningWord(entry: SupplementalSourceEntry, book: LearningBookKey, index: number): LearningWord {
  const definitionCn = entry.definitionCn || entry.exampleTranslation || entry.englishDefinition || "暂无释义";
  const partOfSpeech = entry.partOfSpeech || (book === "俚语俗语" ? "习语" : "phr.");

  return {
    antonyms: [],
    definitionCn,
    definitionGroups: [{ definitions: [definitionCn], partOfSpeech, text: definitionCn }],
    definitionLines: [definitionCn],
    englishDefinitions: entry.englishDefinition ? [entry.englishDefinition] : [],
    englishExamples: entry.example ? [entry.example] : [],
    englishExampleTranslations: entry.exampleTranslation ? [entry.exampleTranslation] : [],
    etymologySource: "",
    etymologyStory: entry.origin ?? "",
    formation: "",
    id: `${book}:${index + 1}:${entry.word.toLowerCase()}`,
    inflections: [],
    level: book,
    partOfSpeech,
    phonetic: entry.phonetic,
    reviewNotes: entry.note ? [entry.note] : [],
    root: "",
    synonyms: [],
    ukAudioUrl: "",
    ukPhonetic: entry.phonetic,
    usAudioUrl: "",
    usPhonetic: entry.phonetic,
    word: entry.word,
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
