import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeniorHighRunner } from "@/components/senior-high/senior-high-runner";
import { getCet4SetIndex } from "@/lib/cet4/library";

export const dynamicParams = false;

export function generateStaticParams() {
  return getCet4SetIndex().entries.map((entry) => ({ entryId: entry.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ entryId: string }> }): Promise<Metadata> {
  const { entryId } = await params;
  const set = getCet4SetIndex().entries.find((item) => item.id === entryId);
  return { title: `${set?.title || "大学英语四级"}｜大学英语四级` };
}

export default async function Cet4EntryPage({ params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await params;
  const set = getCet4SetIndex().entries.find((item) => item.id === entryId);
  if (!set) notFound();
  return <SeniorHighRunner kind={set.kind} setId={set.id} basePath="/cet4" backHref={`/cet4?entry=${set.kind === "practice" ? "practice" : "papers"}`} storageNamespace="cet4:source:20261021" />;
}
