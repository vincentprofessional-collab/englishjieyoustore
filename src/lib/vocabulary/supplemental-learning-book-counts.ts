import bookCounts from "@/data/vocabulary/supplemental-learning-book-counts.json";
import type { LearningBookKey } from "@/lib/vocabulary/learning";

export function getSupplementalLearningBookCounts(): Partial<Record<LearningBookKey, number>> {
  return bookCounts;
}
