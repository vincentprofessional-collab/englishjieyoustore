import type { Metadata } from "next";
import { SeniorHighRunner } from "@/components/senior-high/senior-high-runner";
import { getKaoyanSetIndex } from "@/lib/kaoyan/library";

export const dynamicParams = true;

export function generateStaticParams() {
  return getKaoyanSetIndex().entries.map((entry) => ({ entryId: entry.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ entryId: string }> }): Promise<Metadata> {
  const { entryId } = await params;
  const entry = getKaoyanSetIndex().entries.find((item) => item.id === entryId);
  return { title: `${entry?.title || "考研英语题目"}｜考研英语` };
}

export default async function KaoyanEntryPage({ params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await params;
  const set = getKaoyanSetIndex().entries.find((item) => item.id === entryId);
  const kind = set?.kind || (entryId.startsWith("kaoyan-practice-") ? "practice" : "paper");
  return <SeniorHighRunner kind={kind} setId={entryId} basePath="/kaoyan" backHref={`/kaoyan?entry=${kind === "practice" ? "practice" : "papers"}`} storageNamespace="kaoyan:source:20261024" />;
}
