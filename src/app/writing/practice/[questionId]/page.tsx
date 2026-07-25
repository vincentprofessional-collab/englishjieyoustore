import { notFound } from "next/navigation";
import { WritingWorkspace } from "@/components/writing-workspace";
import { getWritingQuestion } from "@/lib/ielts/writing";

export default async function WritingPracticePage({
  params,
}: {
  params: Promise<{ questionId: string }>;
}) {
  const { questionId } = await params;
  const question = getWritingQuestion(questionId);

  if (!question) {
    notFound();
  }

  return <WritingWorkspace mode="practice" questions={[question]} />;
}
