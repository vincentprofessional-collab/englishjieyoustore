import type { Metadata } from "next";
import { SatPracticeRunner } from "@/components/sat/sat-practice-runner";
import { getSatCatalogIndex, getSatKnowledgeIndex } from "@/lib/sat/library";

export const dynamicParams = true;

export const metadata: Metadata = {
  title: "SAT 题组练习｜英文解忧杂货铺",
};

export function generateStaticParams() {
  const knowledgeSetIds = getSatKnowledgeIndex().groups.flatMap((group) => group.topics.map((topic) => topic.setId));
  return [...getSatCatalogIndex().sets.map((set) => set.id), ...knowledgeSetIds].map((setId) => ({ setId }));
}

export default async function SatPracticePage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  return <SatPracticeRunner setId={setId} />;
}
