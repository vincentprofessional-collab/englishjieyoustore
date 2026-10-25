import type { Metadata } from "next";
import { SeniorHighRunner } from "@/components/senior-high/senior-high-runner";
import { getCetExamSetIndex } from "@/lib/cet4/library";

export const dynamicParams = true;

export function generateStaticParams() {
  return [
    ...getCetExamSetIndex("cet6").entries.map((entry) => ({ entryId: entry.id })),
  ];
}

export async function generateMetadata({ params }: { params: Promise<{ entryId: string }> }): Promise<Metadata> {
  const { entryId } = await params;
  const set = getCetExamSetIndex("cet6").entries.find((item) => item.id === entryId);
  return { title: `${set?.title || "大学英语六级"}｜大学英语六级` };
}

export default async function Cet6EntryPage({ params, searchParams }: { params: Promise<{ entryId: string }>; searchParams: Promise<{ kind?: string }> }) {
  const { entryId } = await params;
  const query = await searchParams;
  const set = getCetExamSetIndex("cet6").entries.find((item) => item.id === entryId);
  const kind = set?.kind || (query.kind === "paper" ? "paper" : "practice");
  return <SeniorHighRunner kind={kind} setId={entryId} basePath="/cet6" backHref={`/cet6?entry=${kind === "paper" ? "papers" : "practice"}`} storageNamespace="cet6:v3:1" />;
}
