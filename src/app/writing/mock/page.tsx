import { ProjectAccessGate } from "@/components/project-access-gate";
import { WritingWorkspace } from "@/components/writing-workspace";
import { getPaidContentKey } from "@/lib/access-control";
import { getWritingQuestion } from "@/lib/ielts/writing";

export default function WritingMockPage() {
  const task1 = getWritingQuestion("ci4-test1-task1");
  const task2 = getWritingQuestion("ci18-test1-task2");

  if (!task1 || !task2) {
    return null;
  }

  return (
    <ProjectAccessGate
      contentKey={getPaidContentKey("writing-practice", "full-mock")}
      projectKey="writing"
      title="雅思写作模考需要单独开通"
    >
      <WritingWorkspace mode="mock" questions={[task1, task2]} />
    </ProjectAccessGate>
  );
}
