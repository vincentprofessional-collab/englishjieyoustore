import { VocabularyLearning } from "@/components/vocabulary-learning";
import { getAllVocabularyEntries } from "@/lib/vocabulary/local-vocabulary";
import { getLearningBookCounts, LEARNING_BOOKS, LEARNING_COLLECTIONS, type LearningBookKey, type LearningCollectionKey } from "@/lib/vocabulary/learning";
import { getSupplementalLearningBookCounts } from "@/lib/vocabulary/supplemental-learning-book-counts";

export const dynamic = "force-dynamic";

export default async function VocabularyBooksPage({
  searchParams,
}: {
    searchParams: Promise<{ collection?: string; level?: string; resume?: string; view?: string }>;
}) {
  const query = await searchParams;
  const requestedLevel = query.level;
  const initialBook = requestedLevel === "生词本"
    ? "生词本"
    : requestedLevel === "未分级"
      ? "其他词汇"
      : LEARNING_BOOKS.find((book) => book.key === requestedLevel)?.key
        ?? (requestedLevel?.startsWith("custom-book-") ? requestedLevel : "初中");
  const initialCollection = LEARNING_COLLECTIONS.find((collection) => collection.key === query.collection && collection.key === "mastered")?.key as LearningCollectionKey | undefined;
  const entries = getAllVocabularyEntries();
  const counts = getLearningBookCounts(entries, getSupplementalLearningBookCounts());
  const sourceCount = entries.filter((entry) => entry.isLatestWorkbookVocabulary !== false).length;

  return (
    <VocabularyLearning
      bookCounts={counts}
      books={LEARNING_BOOKS.map(({ description, key, label }) => ({ description, key, label }))}
      initialBook={initialBook}
      initialCollection={initialCollection}
      initialListMode={query.view === "list"}
      initialListResume={query.resume === "1"}
      sourceCount={sourceCount}
    />
  );
}
