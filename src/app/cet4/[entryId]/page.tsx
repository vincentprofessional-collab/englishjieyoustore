import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cet4Document } from "@/components/cet4/cet4-document";
import { getCet4Entries, getCet4Entry } from "@/lib/cet4/library";

export function generateStaticParams() {
  return getCet4Entries().map((entry) => ({ entryId: entry.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ entryId: string }> }): Promise<Metadata> {
  const { entryId } = await params;
  const entry = getCet4Entry(entryId);
  return { title: entry ? `${entry.title}｜大学英语四级` : "大学英语四级" };
}

export default async function Cet4EntryPage({ params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await params;
  const entry = getCet4Entry(entryId);
  if (!entry) notFound();
  const { answers: _answers, sourceHash: _sourceHash, ...publicEntry } = entry;
  return <Cet4Document entry={publicEntry} />;
}
