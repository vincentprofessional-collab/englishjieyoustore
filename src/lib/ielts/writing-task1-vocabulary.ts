import task1Vocabulary from "@/data/writing/task1-vocabulary.json";
import type { WritingVocabularyItem } from "@/lib/ielts/writing";

export type WritingTask1VocabularyEntry = WritingVocabularyItem & {
  exampleCn: string;
  exampleEn: string;
  id: string;
};

export type WritingTask1VocabularyCategory = {
  description: string;
  entries: WritingTask1VocabularyEntry[];
  id: string;
  label: string;
  labelEnglish: string;
};

export const WRITING_TASK1_VOCABULARY_CATEGORIES =
  task1Vocabulary as WritingTask1VocabularyCategory[];

function normalizeTerm(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export const WRITING_TASK1_VOCABULARY_ITEMS = Array.from(
  WRITING_TASK1_VOCABULARY_CATEGORIES
    .flatMap((category) => category.entries)
    .reduce((items, entry) => {
      const key = normalizeTerm(entry.term);

      if (!items.has(key)) {
        items.set(key, entry);
      }

      return items;
    }, new Map<string, WritingTask1VocabularyEntry>())
    .values(),
);
