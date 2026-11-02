import type { Metadata } from "next";
import { SatPastPaperLibrary } from "@/components/sat/sat-past-paper-library";
import { getSatPastPaperIndex } from "@/lib/sat/library";

export const metadata: Metadata = {
  title: "SAT 历年真题｜英文解忧杂货铺",
  description: "按年份、地区和模块练习 SAT 历年真题。",
};

export default function SatPastPapersPage() {
  const catalog = getSatPastPaperIndex();
  return <SatPastPaperLibrary initialCatalog={catalog} />;
}
