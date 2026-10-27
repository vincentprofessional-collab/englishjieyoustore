import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SatPracticeRunner } from "@/components/sat/sat-practice-runner";
import { getSatPastPaper, getSatPastPaperIndex } from "@/lib/sat/library";

export const dynamicParams = false;

export const metadata: Metadata = {
  title: "SAT 历年真题练习｜英文解忧杂货铺",
};

export function generateStaticParams() {
  return getSatPastPaperIndex().papers.map((paper) => ({ paperId: paper.id }));
}

export default async function SatPastPaperPage({ params }: { params: Promise<{ paperId: string }> }) {
  const { paperId } = await params;
  if (!getSatPastPaper(paperId)) notFound();
  return <SatPracticeRunner dataRoot="/sat/papers" returnHref="/sat/past-papers" returnLabel="← 返回历年真题" setId={paperId} />;
}
