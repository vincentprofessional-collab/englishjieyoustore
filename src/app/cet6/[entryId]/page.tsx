import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeniorHighRunner } from "@/components/senior-high/senior-high-runner";
import { getCetExamSetIndex } from "@/lib/cet4/library";

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

export default async function Cet6EntryPage({ params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await params;
  const set = getCetExamSetIndex("cet6").entries.find((item) => item.id === entryId);
  if (!set) notFound();
  return <SeniorHighRunner kind={set.kind} setId={set.id} basePath="/cet6" backHref={`/cet6?entry=${set.kind === "paper" ? "papers" : "practice"}`} storageNamespace="cet6:v3:1" />;
}
