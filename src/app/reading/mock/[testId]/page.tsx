import { ReadingPractice } from "@/components/reading-practice";
import { getReadingTest } from "@/lib/ielts/reading";

export const dynamicParams = true;

export default async function ReadingMockTestPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = await params;
  const test = getReadingTest(testId) || { id: testId, bookCode: "custom-" + testId, bookTitle: "自定义阅读题库", testNo: 1, title: testId, parts: [] };
  return <ReadingPractice key={`${test.id}:mock`} mode="mock" test={test} />;
}
