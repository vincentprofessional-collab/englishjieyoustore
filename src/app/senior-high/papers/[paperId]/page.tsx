import { notFound } from "next/navigation";
import { SeniorHighRunner } from "@/components/senior-high/senior-high-runner";
import { getSeniorHighV2Entry, getSeniorHighV2Index } from "@/lib/senior-high/v2-library";

export const dynamicParams = false;

export function generateStaticParams() {
  return getSeniorHighV2Index().entries.filter((entry) => entry.kind === "paper").map((entry) => ({ paperId: entry.id }));
}

export default async function SeniorHighPaperPage({ params }: { params: Promise<{ paperId: string }> }) {
  const { paperId } = await params;
  if (!getSeniorHighV2Entry("paper", paperId)) notFound();
  return <SeniorHighRunner kind="paper" setId={paperId} />;
}
