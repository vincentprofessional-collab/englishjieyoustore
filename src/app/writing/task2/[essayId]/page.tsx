import { notFound } from "next/navigation";
import { WritingTask2EssayDetail } from "@/components/writing-task2-library";
import { getTask2Essay, TASK2_MODEL_ESSAYS } from "@/data/writing/task2-model-essays";

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

  return <WritingTask2EssayDetail essay={essay} />;
}
