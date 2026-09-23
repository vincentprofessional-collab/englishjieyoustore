import { VocabularyLearning } from "@/components/vocabulary-learning";
import { getAllVocabularyEntries } from "@/lib/vocabulary/local-vocabulary";
import { getLearningBookCounts, LEARNING_BOOKS } from "@/lib/vocabulary/learning";

export const dynamic = "force-dynamic";

export default function VocabularyBooksPage() {
  const entries = getAllVocabularyEntries();
  const counts = getLearningBookCounts(entries);

  return (
    <VocabularyLearning
      bookCounts={counts}
      books={LEARNING_BOOKS.map(({ description, key, label }) => ({ description, key, label }))}
      sourceCount={entries.length}
    />
  );
}
