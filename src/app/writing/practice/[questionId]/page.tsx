import { notFound } from "next/navigation";
import { ProjectAccessGate } from "@/components/project-access-gate";
import { WritingWorkspace } from "@/components/writing-workspace";
import { getPaidContentKey } from "@/lib/access-control";
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

  return (
    <ProjectAccessGate
      contentKey={getPaidContentKey("writing-practice", question.id)}
      projectKey="writing"
      title="雅思写作练习需要单独开通"
    >
      <WritingWorkspace mode="practice" questions={[question]} />
    </ProjectAccessGate>
  );
}
