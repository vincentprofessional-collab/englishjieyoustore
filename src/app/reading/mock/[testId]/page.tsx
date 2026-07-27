import { notFound } from "next/navigation";
import { ReadingPractice } from "@/components/reading-practice";
import { getReadingTest } from "@/lib/ielts/reading";

export default async function ReadingMockTestPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = await params;
  const test = getReadingTest(testId);

  if (!test) {
    notFound();
  }

  return <ReadingPractice key={`${test.id}:mock`} mode="mock" test={test} />;
}
