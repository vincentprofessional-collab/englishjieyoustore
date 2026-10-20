import { VocabularyLearning } from "@/components/vocabulary-learning";
import { getAllVocabularyEntries } from "@/lib/vocabulary/local-vocabulary";
import { getLearningBookCounts, LEARNING_BOOKS, type LearningBookKey } from "@/lib/vocabulary/learning";
import { getSupplementalLearningBookCounts } from "@/lib/vocabulary/supplemental-learning-book-counts";

export const dynamic = "force-dynamic";

export default async function VocabularyBooksPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; resume?: string; view?: string }>;
}) {
  const query = await searchParams;
  const requestedLevel = query.level;
  const initialBook: LearningBookKey | "生词本" = requestedLevel === "生词本"
    ? "生词本"
    : requestedLevel === "未分级"
      ? "其他词汇"
      : LEARNING_BOOKS.find((book) => book.key === requestedLevel)?.key ?? "初中";
  const entries = getAllVocabularyEntries();
  const counts = getLearningBookCounts(entries, getSupplementalLearningBookCounts());

  return (
    <VocabularyLearning
      bookCounts={counts}
      books={LEARNING_BOOKS.map(({ description, key, label }) => ({ description, key, label }))}
      initialBook={initialBook}
      initialListMode={query.view === "list"}
      initialListResume={query.resume === "1"}
      sourceCount={entries.length}
    />
  );
}
