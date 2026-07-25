import { WritingWorkspace } from "@/components/writing-workspace";
import { getWritingQuestion } from "@/lib/ielts/writing";

export default function WritingMockPage() {
  const task1 = getWritingQuestion("ci4-test1-task1");
  const task2 = getWritingQuestion("ci18-test1-task2");

  if (!task1 || !task2) {
    return null;
  }

  return <WritingWorkspace mode="mock" questions={[task1, task2]} />;
}
