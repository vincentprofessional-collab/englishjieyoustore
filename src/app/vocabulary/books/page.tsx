import { VocabularyLearning } from "@/components/vocabulary-learning";
import { getAllVocabularyEntries } from "@/lib/vocabulary/local-vocabulary";
import { getLearningBookCounts, getVisibleLearningBooks, LEARNING_BOOKS, LEARNING_COLLECTIONS, type LearningBookKey, type LearningCollectionKey } from "@/lib/vocabulary/learning";
import { getSupplementalLearningBookCounts } from "@/lib/vocabulary/supplemental-learning-book-counts";
import { getPaidLearningBook, hasLearningBookAccess } from "@/lib/vocabulary/learning-book-access";
import { hasVocabularySceneImageAccess } from "@/lib/vocabulary/vocabulary-scene-image-access";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function VocabularyBooksPage({
  searchParams,
}: {
    searchParams: Promise<{ collection?: string; level?: string; resume?: string; setup?: string; view?: string }>;
}) {
  const query = await searchParams;
  const requestedLevel = query.level;
  const visibleBooks = getVisibleLearningBooks(LEARNING_BOOKS);
  if (requestedLevel === "雅思听力答案词") redirect("/vocabulary/listening-answer-words");
  const paidBook = requestedLevel ? getPaidLearningBook(requestedLevel) : null;
  if (paidBook && !await hasLearningBookAccess(requestedLevel!)) redirect(paidBook.paywallPath);
  const initialBook = requestedLevel === "生词本"
    ? "生词本"
    : requestedLevel === "未分级"
      ? "其他词汇"
      : visibleBooks.find((book) => book.key === requestedLevel)?.key
        ?? (requestedLevel?.startsWith("custom-book-") ? requestedLevel : "初中");
  const initialCollection = LEARNING_COLLECTIONS.find((collection) => collection.key === query.collection && collection.key === "mastered")?.key as LearningCollectionKey | undefined;
  const entries = getAllVocabularyEntries();
  const counts = getLearningBookCounts(entries, getSupplementalLearningBookCounts());
  const sourceCount = entries.filter((entry) => entry.isLatestWorkbookVocabulary !== false).length;
  let canAccessSceneImages = false;
  try {
    canAccessSceneImages = await hasVocabularySceneImageAccess();
  } catch {
    // A missing admin session must keep scene content unavailable.
  }

  return (
    <VocabularyLearning
      bookCounts={counts}
      books={visibleBooks.map(({ description, key, label }) => ({ description, key, label }))}
      initialBook={initialBook}
      initialCollection={initialCollection}
      initialListMode={query.view === "list"}
      initialListResume={query.resume === "1"}
      initialOpenSettings={query.setup === "1"}
      canAccessSceneImages={canAccessSceneImages}
      sourceCount={sourceCount}
    />
  );
}
