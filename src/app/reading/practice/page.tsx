import { ReadingLibraryClient } from "@/components/reading-library-client";
import { READING_TESTS } from "@/lib/ielts/reading";

export default function ReadingPracticePage() {
  return <ReadingLibraryClient mode="practice" initialTests={READING_TESTS.map(({ id, bookCode, bookTitle, testNo, displayTestNo, title }) => ({ id, bookCode, bookTitle, testNo, displayTestNo, title }))} />;
}
