import type { Metadata } from "next";
import { SeniorHighRunner } from "@/components/senior-high/senior-high-runner";
import { getCet4SetIndex } from "@/lib/cet4/library";

export const dynamicParams = true;

export function generateStaticParams() {
  return getCet4SetIndex().entries.map((entry) => ({ entryId: entry.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ entryId: string }> }): Promise<Metadata> {
  const { entryId } = await params;
  const set = getCet4SetIndex().entries.find((item) => item.id === entryId);
  return { title: `${set?.title || "大学英语四级"}｜大学英语四级` };
}

export default async function Cet4EntryPage({ params, searchParams }: { params: Promise<{ entryId: string }>; searchParams: Promise<{ kind?: string }> }) {
  const { entryId } = await params;
  const query = await searchParams;
  const set = getCet4SetIndex().entries.find((item) => item.id === entryId);
  const kind = set?.kind || (query.kind === "paper" ? "paper" : "practice");
  return <SeniorHighRunner kind={kind} setId={entryId} basePath="/cet4" backHref={`/cet4?entry=${kind === "practice" ? "practice" : "papers"}`} storageNamespace="cet4:source:20261021" />;
}
