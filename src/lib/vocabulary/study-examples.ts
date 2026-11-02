import "server-only";
import workbookExamples from "@/data/vocabulary/workbook-usage-examples.json";
import type { LearningWord } from "@/lib/vocabulary/learning";

const examples = workbookExamples as Record<string, { englishText: string; chineseText: string }>;

export function withExistingStudyExamples(word: LearningWord): LearningWord {
  const workbook = examples[word.word.trim().toLowerCase()];
  if (workbook?.englishText.trim() && workbook.chineseText.trim()) {
    const pairs = [{ english: workbook.englishText, chinese: workbook.chineseText }];
    if (word.bbcExampleSource) {
      for (const [index, english] of word.englishExamples.entries()) {
        if (!english.trim() || pairs.some((pair) => pair.english.trim().toLowerCase() === english.trim().toLowerCase())) continue;
        pairs.push({ english, chinese: word.englishExampleTranslations?.[index] ?? "" });
      }
    }
    return { ...word, englishExamples: pairs.map((pair) => pair.english), englishExampleTranslations: pairs.map((pair) => pair.chinese) };
  }
  const pairs = word.englishExamples.map((english, index) => ({ english, chinese: word.englishExampleTranslations?.[index] ?? "" }))
    .filter((pair) => pair.english.trim() && (pair.chinese.trim() || word.bbcExampleSource));
  return { ...word, englishExamples: pairs.map((pair) => pair.english), englishExampleTranslations: pairs.map((pair) => pair.chinese) };
}
