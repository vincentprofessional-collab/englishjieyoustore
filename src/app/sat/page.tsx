import type { Metadata } from "next";
import { SatHome } from "@/components/sat/sat-home";

export const metadata: Metadata = {
  title: "SAT 题库｜英文解忧杂货铺",
  description: "SAT 题组练习。",
};

export default async function SatPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  return <SatHome view={view === "types" || view === "papers" ? view : "knowledge"} />;
}
