import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SatPracticeRunner } from "@/components/sat/sat-practice-runner";
import { getSatCatalogIndex, getSatSet } from "@/lib/sat/library";

export const dynamicParams = false;

export const metadata: Metadata = {
  title: "SAT 题组练习｜英文解忧杂货铺",
};

export function generateStaticParams() {
  return getSatCatalogIndex().sets.map((set) => ({ setId: set.id }));
}

export default async function SatPracticePage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  if (!getSatSet(setId)) notFound();
  return <SatPracticeRunner setId={setId} />;
}
