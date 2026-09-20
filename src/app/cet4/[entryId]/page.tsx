import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeniorHighRunner } from "@/components/senior-high/senior-high-runner";
import { Cet4Document } from "@/components/cet4/cet4-document";
import { getCet4Entries, getCet4Entry, getCet4SetIndex } from "@/lib/cet4/library";

export function generateStaticParams() {
  return [...getCet4Entries().filter((entry) => entry.section === "知识点").map((entry) => ({ entryId: entry.id })), ...getCet4SetIndex().entries.map((entry) => ({ entryId: entry.id }))];
}

export async function generateMetadata({ params }: { params: Promise<{ entryId: string }> }): Promise<Metadata> {
  const { entryId } = await params;
  const entry = getCet4Entry(entryId);
  const set = getCet4SetIndex().entries.find((item) => item.id === entryId);
  return { title: `${entry?.title || set?.title || "大学英语四级"}｜大学英语四级` };
}

export default async function Cet4EntryPage({ params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await params;
  const entry = getCet4Entry(entryId);
  const set = getCet4SetIndex().entries.find((item) => item.id === entryId);
  if (!entry && !set) notFound();
  if (set) return <SeniorHighRunner kind={set.kind} setId={set.id} basePath="/cet4" backHref="/cet4" storageNamespace="cet4:v2:2" />;
  if (!entry || entry.section !== "知识点") notFound();
  const { answers: _answers, sourceHash: _sourceHash, ...publicEntry } = entry;
  return <Cet4Document entry={publicEntry} />;
}
