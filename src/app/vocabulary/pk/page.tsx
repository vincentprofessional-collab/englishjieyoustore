import { VocabularyPk } from "@/components/vocabulary-pk";
import { LEARNING_BOOKS, type LearningBookKey } from "@/lib/vocabulary/learning";

export const dynamic = "force-dynamic";

export default async function VocabularyPkPage({ searchParams }: { searchParams: Promise<{ book?: string; challenge?: string; mode?: string; wordIds?: string }> }) {
  const params = await searchParams;
  const book = LEARNING_BOOKS.find((item) => item.key === params.book)?.key ?? "初中";
  const ids = (params.wordIds ?? "").split(",").filter(Boolean).slice(0, 20);
  return <VocabularyPk initialBook={book as LearningBookKey} initialChallenge={params.challenge ?? ""} initialMode={params.mode ?? ""} initialWordIds={ids} />;
}
