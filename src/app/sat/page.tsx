import type { Metadata } from "next";
import { SatHome } from "@/components/sat/sat-home";

export const metadata: Metadata = {
  title: "SAT 题型训练｜英文解忧杂货铺",
  description: "按 SAT 阅读与写作题型练习。",
};

export default function SatPage() {
  return <SatHome />;
}
