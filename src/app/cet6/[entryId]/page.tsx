import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeniorHighRunner } from "@/components/senior-high/senior-high-runner";
import { Cet4Document } from "@/components/cet4/cet4-document";
import { getCetExamEntries, getCetExamEntry, getCetExamSetIndex } from "@/lib/cet4/library";

export function generateStaticParams() {
  return [
    ...getCetExamEntries("cet6").filter((entry) => entry.section === "知识点").map((entry) => ({ entryId: entry.id })),
    ...getCetExamSetIndex("cet6").entries.map((entry) => ({ entryId: entry.id })),
  ];
}

export async function generateMetadata({ params }: { params: Promise<{ entryId: string }> }): Promise<Metadata> {
  const { entryId } = await params;
  const entry = getCetExamEntry("cet6", entryId);
  const set = getCetExamSetIndex("cet6").entries.find((item) => item.id === entryId);
  return { title: `${entry?.title || set?.title || "大学英语六级"}｜大学英语六级` };
}

export default async function Cet6EntryPage({ params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await params;
  const entry = getCetExamEntry("cet6", entryId);
  const set = getCetExamSetIndex("cet6").entries.find((item) => item.id === entryId);
  if (!entry && !set) notFound();
  if (set) return <SeniorHighRunner kind={set.kind} setId={set.id} basePath="/cet6" backHref="/cet6" storageNamespace="cet6:v2:1" />;
  if (!entry || entry.section !== "知识点") notFound();
  const { answers: _answers, sourceHash: _sourceHash, ...publicEntry } = entry;
  return <Cet4Document exam="cet6" entry={publicEntry} />;
}
