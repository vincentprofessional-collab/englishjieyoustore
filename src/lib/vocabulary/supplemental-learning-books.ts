import idiomaticExpressions from "@/data/vocabulary/idiomatic-expressions.json";
import slangProverbs from "@/data/vocabulary/slang-proverbs.json";
import type { LearningBookKey, LearningWord } from "@/lib/vocabulary/learning";

type SupplementalSourceEntry = {
  definitionCn: string;
  englishDefinition?: string;
  example: string;
  exampleTranslation: string;
  note: string;
  origin?: string;
  partOfSpeech: string;
  phonetic: string;
  word: string;
};

function getSourceEntries(book: "地道表达" | "俚语俗语"): SupplementalSourceEntry[] {
  return (book === "地道表达" ? idiomaticExpressions : slangProverbs) as SupplementalSourceEntry[];
}

const supplementalWords = new Map<"地道表达" | "俚语俗语", LearningWord[]>();

function toLearningWord(entry: SupplementalSourceEntry, book: "地道表达" | "俚语俗语", index: number): LearningWord {
  const definitionCn = entry.definitionCn || entry.exampleTranslation || entry.englishDefinition || "暂无释义";
  const partOfSpeech = entry.partOfSpeech || (book === "俚语俗语" ? "习语" : "短语");

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
  if (book !== "地道表达" && book !== "俚语俗语") return null;
  const cached = supplementalWords.get(book);
  if (cached) return cached;
  const words = getSourceEntries(book).map((entry, index) => toLearningWord(entry, book, index));
  supplementalWords.set(book, words);
  return words;
}
