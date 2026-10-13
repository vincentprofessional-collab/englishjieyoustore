import "server-only";
import workbookExamples from "@/data/vocabulary/workbook-usage-examples.json";
import type { LearningWord } from "@/lib/vocabulary/learning";

const examples = workbookExamples as Record<string, { englishText: string; chineseText: string }>;

export function withExistingStudyExamples(word: LearningWord): LearningWord {
  const workbook = examples[word.word.trim().toLowerCase()];
  if (workbook?.englishText.trim() && workbook.chineseText.trim()) {
    return { ...word, englishExamples: [workbook.englishText], englishExampleTranslations: [workbook.chineseText] };
  }
  const pairs = word.englishExamples.map((english, index) => ({ english, chinese: word.englishExampleTranslations?.[index] ?? "" }))
    .filter((pair) => pair.english.trim() && pair.chinese.trim());
  return { ...word, englishExamples: pairs.map((pair) => pair.english), englishExampleTranslations: pairs.map((pair) => pair.chinese) };
}
