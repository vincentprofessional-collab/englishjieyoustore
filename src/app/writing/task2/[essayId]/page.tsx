import { notFound } from "next/navigation";
import { ProjectAccessGate } from "@/components/project-access-gate";
import { WritingTask2EssayDetail } from "@/components/writing-task2-library";
import { getTask2Essay, TASK2_MODEL_ESSAYS } from "@/data/writing/task2-model-essays";
import { getPaidContentKey } from "@/lib/access-control";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return TASK2_MODEL_ESSAYS.map((essay) => ({
    essayId: essay.id,
  }));
}

export default async function WritingTask2EssayPage({
  params,
}: {
  params: Promise<{ essayId: string }>;
}) {
  const { essayId } = await params;
  const essay = getTask2Essay(essayId);

  if (!essay) {
    notFound();
  }

  return (
    <ProjectAccessGate
      contentKey={getPaidContentKey("writing-task2", essay.id)}
      projectKey="writing"
      title="雅思写作范文需要单独开通"
    >
      <WritingTask2EssayDetail essay={essay} />
    </ProjectAccessGate>
  );
}
