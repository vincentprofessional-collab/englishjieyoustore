import "server-only";
import workbookExamples from "@/data/vocabulary/workbook-usage-examples.json";
import type { LearningWord } from "@/lib/vocabulary/learning";

const examples = workbookExamples as Record<string, { englishText: string; chineseText: string }>;

export function withExistingStudyExamples(word: LearningWord): LearningWord {
  const workbook = examples[word.word.trim().toLowerCase()];
  const existingPairs = word.englishExamples.map((english, index) => ({ english, chinese: word.englishExampleTranslations?.[index] ?? "" }))
    .filter((pair) => pair.english.trim() && (pair.chinese.trim() || word.bbcExampleSource));
  if (existingPairs.length > 0) {
    return { ...word, englishExamples: existingPairs.map((pair) => pair.english), englishExampleTranslations: existingPairs.map((pair) => pair.chinese) };
  }
  if (workbook?.englishText.trim() && workbook.chineseText.trim()) {
    const pairs = [{ english: workbook.englishText, chinese: workbook.chineseText }];
    return { ...word, englishExamples: pairs.map((pair) => pair.english), englishExampleTranslations: pairs.map((pair) => pair.chinese) };
  }
  return { ...word, englishExamples: existingPairs.map((pair) => pair.english), englishExampleTranslations: existingPairs.map((pair) => pair.chinese) };
}
